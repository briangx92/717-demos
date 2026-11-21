/* How each artist hears about their appointments, and the Send schedule button.
   The portal's own calendar is the one source of truth. Google Calendar, a phone calendar link and automatic digests are
   ways to deliver it later and need the server. Today the manager's route works: build the message, open your own text or email app. */
(function () {
  'use strict';
  var OA = window.OA, h = OA.h;

  OA.NOTIFY_MODES = [
    ['manager', 'Manager tells them'],
    ['feed', 'Calendar link on their phone'],
    ['google', 'Their Google Calendar'],
    ['digest', 'Automatic daily or weekly text or email']
  ];
  /* Only the manager route works without the server. The others are saved as a choice and say so. */
  OA.NOTIFY_LIVE = { manager: true, feed: false, google: false, digest: false };
  OA.NOTIFY_WHY = 'Needs the server. Until then the manager uses Send schedule.';
  OA.emailOk = function (s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim()); };

  /* Private to the shop: lives in settings, never in the site content that gets published. */
  OA.notify = function (slug) {
    var n = (OA.store.state.settings.notify || {})[slug] || {};
    return { mode: n.mode || 'manager', phone: n.phone || '', email: n.email || '' };
  };
  OA.setNotify = function (slug, patch) {
    var s = OA.store.state.settings; if (!s.notify) s.notify = {};
    s.notify[slug] = Object.assign(OA.notify(slug), patch); OA.store.commit();
  };

  OA.scheduleAppts = function (slug, days) {
    var from = OA.todayISO(), to = OA.addDays(from, days - 1);
    return OA.store.state.appts.filter(function (a) { return a.artist === slug && a.status === 'booked' && a.date >= from && a.date <= to; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : OA.mins(a.start) - OA.mins(b.start); });
  };

  /* Same privacy rule as calendar events: first name and last initial, never phone numbers or notes. */
  function who(a) { var p = String(a.client || '').trim().split(/\s+/); return OA.first(a.client) + (p[1] ? ' ' + p[1].charAt(0).toUpperCase() + '.' : ''); }

  OA.scheduleMessage = function (slug, days) {
    var art = OA.artist(slug), name = art ? OA.nick(art) : OA.chairName(slug), site = OA.store.state.site.shop, shop = site.short || site.name;
    var list = OA.scheduleAppts(slug, days), full = OA.gcalSettings().detail === 'full';
    if (!list.length) return 'Hi ' + name + ', you have nothing booked at ' + shop + ' in the next ' + days + ' days.';
    var out = ['Hi ' + name + ', your schedule at ' + shop + ' for the next ' + days + ' days:'], day = '';
    list.forEach(function (a) {
      if (a.date !== day) { day = a.date; out.push('', OA.fmtLong(a.date)); }
      out.push(OA.fmtTime(a.start) + ' ' + who(a) + ', ' + OA.APPT_TYPES[a.type].toLowerCase() + (full && a.piece ? ', ' + a.piece : ''));
    });
    out.push('', 'If anything looks wrong, tell me.');
    return out.join('\n');
  };

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, no) {
      var t = h('textarea', { value: text, style: 'position:fixed;opacity:0' }); document.body.appendChild(t); t.select();
      var good = false; try { good = document.execCommand('copy'); } catch (e) { good = false; }
      document.body.removeChild(t); good ? ok() : no(new Error('copy blocked'));
    });
  }

  OA.sendScheduleDialog = function (slug) {
    var chairs = OA.chairs(); if (OA.role.kind === 'artist') chairs = chairs.filter(function (c) { return c.slug === OA.role.slug; });
    if (!chairs.length) { OA.ui.fail('There is no artist to send a schedule to.'); return Promise.resolve(null); }
    var f = {
      who: OA.ui.select(chairs.map(function (c) { return [c.slug, c.name]; }), slug && chairs.some(function (c) { return c.slug === slug; }) ? slug : chairs[0].slug, { 'aria-label': 'Who to send it to' }),
      days: OA.ui.select([['7', 'Next 7 days'], ['14', 'Next 14 days']], '7', { 'aria-label': 'How far ahead' }),
      msg: OA.ui.area('', { rows: 11, 'aria-label': 'Message' })
    };
    var contact = h('p', { class: 'note' });
    function paint() {
      var n = OA.notify(f.who.value);
      f.msg.value = OA.scheduleMessage(f.who.value, +f.days.value);
      contact.textContent = (n.phone ? 'Text: ' + n.phone : 'No phone saved') + '. ' + (n.email ? 'Email: ' + n.email : 'No email saved') + '. Save these in Settings under Schedules.';
    }
    f.who.addEventListener('change', paint); f.days.addEventListener('change', paint); paint();
    return OA.ui.dialog({
      title: 'Send schedule',
      lead: 'This opens your own text or email app with the schedule filled in. You press send. The portal does not send it and cannot tell whether you did.',
      wide: true,
      body: h('div', { class: 'form-grid' }, OA.ui.field('Send to', f.who), OA.ui.field('How far ahead', f.days), OA.ui.field('Message', f.msg, 'You can change the words before you send.', 'span2'), h('div', { class: 'span2' }, contact)),
      actions: [
        { label: 'Close', kind: 'quiet', value: null },
        { label: 'Copy message', run: function () {
          if (!f.msg.value.trim()) return { error: 'The message is empty.' };
          return copy(f.msg.value).then(function () { OA.ui.toast('Copied. Paste it into any app.'); return false; }, function () { return { error: 'Your browser blocked copying. Select the message and copy it yourself.' }; });
        } },
        { label: 'Open email', run: function () {
          var n = OA.notify(f.who.value), body = f.msg.value.trim();
          if (!body) return { error: 'The message is empty.' };
          if (!OA.emailOk(n.email)) return { error: 'No valid email is saved for ' + OA.chairName(f.who.value) + '. Add it in Settings under Schedules.' };
          window.location.href = 'mailto:' + n.email.trim() + '?subject=' + encodeURIComponent('Your schedule') + '&body=' + encodeURIComponent(body).replace(/%0A/g, '%0D%0A');
          return false;
        } },
        { label: 'Open text app', kind: 'primary', run: function () {
          var n = OA.notify(f.who.value), body = f.msg.value.trim();
          if (!body) return { error: 'The message is empty.' };
          if (!OA.phoneOk(n.phone)) return { error: 'No valid phone number is saved for ' + OA.chairName(f.who.value) + '. Add ten digits in Settings under Schedules.' };
          window.location.href = OA.smsHref(n.phone, body);
          return false;
        } }
      ]
    });
  };

  /* Upcoming appointments whose artist is no longer here. Never left to disappear: Today lists them until each is reassigned or cancelled. */
  OA.orphanAppts = function () {
    var live = {}; OA.chairs().forEach(function (c) { live[c.slug] = 1; });
    return OA.store.state.appts.filter(function (a) { return a.status === 'booked' && a.date >= OA.todayISO() && a.artist && !live[a.artist]; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : OA.mins(a.start) - OA.mins(b.start); });
  };
})();
