/* Google Calendar: PLACEHOLDER. Nothing here talks to Google.
   The real version runs on a server (OAuth tokens must never reach the browser) and this file becomes a thin client for it.
   Kept now so the screens, settings and event mapping are settled before the API work starts. */
(function () {
  'use strict';
  var OA = window.OA, S = OA.store;
  var DEFAULT_TZ = 'America/New_York';
  var NOT_CONNECTED = 'Google Calendar is not connected. This demo has no Google sign-in, so nothing is sent to or read from any calendar.';

  OA.gcalSettings = function () {
    var s = S.state.settings;
    if (!s.gcal) s.gcal = { calendars: {}, detail: 'minimal', tz: DEFAULT_TZ };
    if (!s.gcal.tz) s.gcal.tz = DEFAULT_TZ;
    if (!s.gcal.calendars) s.gcal.calendars = {};
    return s.gcal;
  };

  OA.gcalValidTz = function (tz) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (e) { return false; } };

  OA.gcal = {
    connected: false,
    status: function () { return { connected: false, text: 'Not connected', reason: NOT_CONNECTED }; },
    /* Planned: opens a server-side OAuth flow (scope: calendar.events). Rejects here so no screen can claim success. */
    connect: function () { return Promise.reject(new Error(NOT_CONNECTED)); },
    push: function () { return Promise.reject(new Error(NOT_CONNECTED)); },
    remove: function () { return Promise.reject(new Error(NOT_CONNECTED)); },
    /* Called by every action that adds, changes or cancels an appointment. When a real connection exists this is where the
       appointment is marked a.sync = {state:'pending'} and handed to the server; the answer then sets 'ok' or 'failed' with a reason.
       With no connection it does nothing, on purpose: appointments carry no sync state until sync exists. */
    onChange: function (a) { if (!OA.gcal.connected) return; a.sync = { state: 'pending', at: Date.now() }; },
    /* Appointments whose last push did not reach Google. Always empty until the real version exists. */
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
