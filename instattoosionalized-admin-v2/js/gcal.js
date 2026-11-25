/* Google Calendar: thin client for the portal Worker (portal hostname, /bookings).
   Google credentials never reach the browser: the Worker holds the service account.
   Honest-status rule: `connected` is true only after the Worker has answered a probe.
   Any failure (no server address, unreachable, 503 not_configured, Access 403) leaves
   the portal in the same not-connected behaviour as the old placeholder: appointments
   carry no sync state until sync really exists. */
(function () {
  'use strict';
  var OA = window.OA, S = OA.store;
  var DEFAULT_TZ = 'America/New_York';
  var NOT_CONNECTED = 'Google Calendar is not connected. Nothing is sent to or read from any calendar.';

  OA.gcalSettings = function () {
    var s = S.state.settings;
    if (!s.gcal) s.gcal = { calendars: {}, detail: 'minimal', tz: DEFAULT_TZ };
    if (!s.gcal.tz) s.gcal.tz = DEFAULT_TZ;
    if (!s.gcal.calendars) s.gcal.calendars = {};
    return s.gcal;
  };

  OA.gcalValidTz = function (tz) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (e) { return false; } };

  /* The calendar Worker is a different backend from OA.api's shop server (different
     paths, Access-cookie auth instead of a bearer token), so it gets its own address:
     the gcal-api meta tag, or this same origin when the portal itself is served from
     a portal.* hostname. Never the portal-api meta: OA.api owns that one. */
  function base() {
    var m = document.querySelector('meta[name="gcal-api"]'), v = m ? (m.getAttribute('content') || '').trim() : '';
    if (v) {
      try { var u = new URL(v), local = u.hostname === 'localhost' || u.hostname === '127.0.0.1'; return (u.protocol === 'https:' || (u.protocol === 'http:' && local)) ? u.origin : ''; } catch (e) { return ''; }
    }
    if (typeof location !== 'undefined' && location.hostname && location.hostname.indexOf('portal.') === 0) return location.origin;
    return '';
  }

  var probe = { done: false, connected: false, reason: NOT_CONNECTED };

  function request(path, options) {
    var b = base();
    if (!b) return Promise.reject(new Error(NOT_CONNECTED + ' The portal has no calendar server address yet.'));
    return fetch(b + path, Object.assign({ credentials: 'include', cache: 'no-store' }, options || {})).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (j) {
        if (r.ok) return j;
        var code = (j && typeof j.error === 'string' && j.error) || '';
        if (r.status === 503 && code === 'not_configured') throw new Error('The calendar server answered, but Google Calendar is not configured on it yet (the service account secret or a calendar share is missing).');
        if (r.status === 403) throw new Error('The calendar server refused the request (' + (code || 'forbidden') + '). If Access sign-in is required, sign in to the portal first.');
        if (r.status === 409 && code === 'overlap') throw new Error('Google Calendar already has something for that chair at that time (overlap).');
        throw new Error('The calendar server answered with an error (' + r.status + (code ? ': ' + code : '') + ').');
      });
    }, function () { throw new Error('Could not reach the calendar server. Check the connection, then try again.'); });
  }

  /* The fields a Google event is built from. A change to any of them after a push is
     an edit, and the Worker has no update route yet (see GAPS.md), so edits are
     reported as failed syncs instead of being silently dropped. */
  function snap(a) { return [a.date, a.start, a.end, a.artist, a.client, a.piece || '', a.type || ''].join('|'); }

  function mark(a, sync) { a.sync = sync; S.commit(); }

  var gcal = OA.gcal = {
    connected: false,
    base: base,
    status: function () {
      if (gcal.connected) return { connected: true, text: 'Connected', reason: 'Appointments are pushed to each artist\u2019s Google calendar. Changes and cancellations go through the same connection.' };
      return { connected: false, text: probe.done ? 'Not connected' : 'Not checked', reason: probe.reason };
    },
    /* Probe, not OAuth: sign-in is Cloudflare Access on the portal hostname and Google
       access is the Worker's service account. A 200 from GET /bookings is the only
       thing that flips `connected` on; every other answer leaves it off. */
    connect: function () {
      if (!base()) { probe = { done: true, connected: false, reason: NOT_CONNECTED + ' The portal has no calendar server address yet.' }; return Promise.reject(new Error(probe.reason)); }
      var day = (OA.todayISO ? OA.todayISO() : new Date().toISOString().slice(0, 10));
      return request('/bookings?date=' + encodeURIComponent(day)).then(function () {
        gcal.connected = true; probe = { done: true, connected: true, reason: '' };
        return gcal.status();
      }, function (e) {
        gcal.connected = false; probe = { done: true, connected: false, reason: e.message };
        throw e;
      });
    },
    push: function (a) {
      if (a.status === 'cancelled') return gcal.remove(a);
      if (a.gcalEventId && a.sync && a.sync.snapshot && a.sync.snapshot !== snap(a)) {
        var editErr = new Error('This appointment changed after it was pushed, and the calendar server has no update route yet, so the old event is still on Google Calendar as it was. The server needs an update action before edits can sync.');
        mark(a, { state: 'failed', at: Date.now(), error: editErr.message, snapshot: a.sync.snapshot });
        return Promise.reject(editErr);
      }
      if (a.gcalEventId) { mark(a, { state: 'ok', at: Date.now(), snapshot: snap(a) }); return Promise.resolve({ id: a.gcalEventId, deduped: true }); }
      var ev = gcal.toEvent(a);
      return request('/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', id: a.id, artist: a.artist, date: a.date, start: a.start, end: a.end, client: a.client, piece: ev.summary })
      }).then(function (j) {
        a.gcalEventId = j && j.id ? j.id : '';
        mark(a, { state: 'ok', at: Date.now(), snapshot: snap(a) });
        return j;
      }, function (e) {
        mark(a, { state: 'failed', at: Date.now(), error: e.message, snapshot: a.sync && a.sync.snapshot });
        throw e;
      });
    },
    remove: function (a) {
      if (!a.gcalEventId) { a.sync = { state: 'ok', at: Date.now(), snapshot: snap(a) }; return Promise.resolve({ ok: true, alreadyGone: true }); }
      var eventId = a.gcalEventId;
      return request('/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', id: eventId, artist: a.artist })
      }).then(function (j) {
        a.gcalEventId = '';
        mark(a, { state: 'ok', at: Date.now(), snapshot: snap(a) });
        return j;
      }, function (e) {
        mark(a, { state: 'failed', at: Date.now(), error: e.message, snapshot: a.sync && a.sync.snapshot });
        throw e;
      });
    },
    /* Called by every action that adds, changes or cancels an appointment.
       Not connected (never probed, probe failed, no server address): does nothing,
       exactly like the placeholder, so appointments carry no fake sync state.
       Connected: marks the appointment pending, pushes, and the answer sets
       a.sync to 'ok' (with the Google event id on a.gcalEventId) or 'failed'
       with a reason, which is what the calendar chip, the appointment dialog
       and Today's "Needs you" list already read. */
    onChange: function (a) {
      if (!gcal.connected) return;
      a.sync = { state: 'pending', at: Date.now(), snapshot: a.sync && a.sync.snapshot };
      if (a.status === 'cancelled') gcal.remove(a).catch(function () { /* the failure is on a.sync */ });
      else gcal.push(a).catch(function () { /* the failure is on a.sync */ });
    },
    /* Appointments whose last push did not reach Google. */
    needsAttention: function () { return S.state.appts.filter(function (a) { return a.sync && (a.sync.state === 'failed') && a.status !== 'cancelled'; }); },
    /* Pure mapping from a portal appointment to a Google Calendar event resource. Safe to call and to test today. */
    toEvent: function (a) {
      var TZ = OA.gcalSettings().tz, detail = OA.gcalSettings().detail, shop = S.state.site.shop, c = OA.client(a.clientId);
      var who = OA.first(a.client) + (a.client.split(/\s+/)[1] ? ' ' + a.client.split(/\s+/)[1].charAt(0) + '.' : '');
      var ev = {
        summary: who + ', ' + OA.APPT_TYPES[a.type].toLowerCase() + ' with ' + OA.chairName(a.artist),
        location: OA.addressLine(),
        start: { dateTime: a.date + 'T' + a.start + ':00', timeZone: TZ },
        end: { dateTime: a.date + 'T' + a.end + ':00', timeZone: TZ },
        /* Lets a re-run find and update the same event instead of creating a duplicate. */
        extendedProperties: { private: { portalApptId: a.id } },
        status: a.status === 'cancelled' ? 'cancelled' : 'confirmed'
      };
      if (detail === 'full' && a.piece) ev.description = a.piece;
      return ev;
    }
  };
})();
