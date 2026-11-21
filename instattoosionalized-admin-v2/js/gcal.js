/* Google Calendar: PLACEHOLDER. Nothing here talks to Google.
   The real version runs on a server (OAuth tokens must never reach the browser) and this file becomes a thin client for it.
   Kept now so the screens, settings and event mapping are settled before the API work starts. */
(function () {
  'use strict';
  var OA = window.OA, S = OA.store;
  var TZ = 'America/New_York';
  var NOT_CONNECTED = 'Google Calendar is not connected. This demo has no Google sign-in, so nothing is sent to or read from any calendar.';

  OA.gcalSettings = function () {
    var s = S.state.settings;
    if (!s.gcal) s.gcal = { calendars: {}, detail: 'minimal' };
    if (!s.gcal.calendars) s.gcal.calendars = {};
    return s.gcal;
  };

  OA.gcal = {
    connected: false,
    status: function () { return { connected: false, text: 'Not connected', reason: NOT_CONNECTED }; },
    /* Planned: opens a server-side OAuth flow (scope: calendar.events). Rejects here so no screen can claim success. */
    connect: function () { return Promise.reject(new Error(NOT_CONNECTED)); },
    push: function () { return Promise.reject(new Error(NOT_CONNECTED)); },
    remove: function () { return Promise.reject(new Error(NOT_CONNECTED)); },
    /* Pure mapping from a portal appointment to a Google Calendar event resource. Safe to call and to test today. */
    toEvent: function (a) {
      var detail = OA.gcalSettings().detail, shop = S.state.site.shop, c = OA.client(a.clientId);
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
