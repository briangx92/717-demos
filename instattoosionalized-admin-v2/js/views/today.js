/* Today: what needs you, then the day's chairs. */
(function () {
  'use strict';
  var OA = window.OA, h = OA.h, S = OA.store, ui = OA.ui, act = OA.act;

  function nextOpen(from, dir) { var d = from, n = 0; do { d = OA.addDays(d, dir); n++; } while (!OA.isOpenDay(d) && n < 14); return OA.isOpenDay(d) ? d : null; }

  function queue() {
    var s = S.state, items = [], now = Date.now(), H = 3600000, today = OA.todayISO();
    OA.scopeReqs(s.requests).filter(function (r) { return r.status === 'New'; }).sort(function (a, b) { return a.created - b.created; }).forEach(function (r) {
      var late = now - r.created > 24 * H;
      items.push({ pri: late ? 0 : 1, kind: late ? 'bad' : 'new', text: r.name + ' asked about ' + (r.kind === 'piercing' ? 'a piercing' : (r.size ? 'a ' + r.size.toLowerCase() + ' tattoo' : 'a tattoo')) + (r.place ? ' (' + r.place.toLowerCase() + ')' : ''), meta: 'Waiting ' + OA.ago(r.created).replace(' ago', '') + (late ? '. Over a day without a reply.' : ''), cta: 'Reply', href: '#/requests/' + r.id });
    });
    OA.scopeReqs(s.requests).filter(function (r) { return r.status === 'Awaiting Deposit' && r.askedAt && now - r.askedAt > 48 * H; }).forEach(function (r) {
      items.push({ pri: 2, kind: 'warn', text: r.name + ' has not paid the deposit', meta: 'Asked ' + OA.ago(r.askedAt) + (r.quote ? ', quote ' + r.quote : ''), cta: 'Open', href: '#/requests/' + r.id });
    });
    var nd = nextOpen(today, 1), tomorrowList = OA.scopeAppts(s.appts).filter(function (a) { return nd && a.date === nd && a.status === 'booked' && !a.remindedAt; });
    tomorrowList.forEach(function (a) {
      items.push({ pri: 3, kind: 'rem', text: 'Remind ' + a.client + ' about ' + OA.fmtDow(a.date) + ' at ' + OA.fmtTime(a.start), meta: OA.chairName(a.artist) + (a.piece ? ', ' + a.piece : ''), cta: 'Write reminder', run: function (done) { OA.sendReminder(a, done); } });
    });
    OA.scopeAppts(OA.followUpsDue()).forEach(function (a) {
      items.push({ pri: 4, kind: 'care', text: 'Check how ' + a.client + '’s ' + (a.piece || 'tattoo').toLowerCase() + ' healed', meta: 'Done ' + OA.diffDays(today, a.date) + ' days ago. A healed photo is good for the portfolio.', cta: 'Write check-in', run: function (done) { OA.sendFollowUp(a, done); } });
    });
    OA.scopeAppts(OA.gcal.needsAttention()).forEach(function (a) {
      items.push({ pri: 2, kind: 'warn', text: a.client + '\u2019s appointment is not on Google Calendar', meta: OA.fmtDow(a.date) + ' at ' + OA.fmtTime(a.start) + ' with ' + OA.chairName(a.artist) + '. ' + ((a.sync && a.sync.error) || 'The last push failed.'), cta: 'Open', run: function (done) { OA.apptDialog(a).then(function () { done(); }); } });
    });
    s.site.artists.filter(function (a) { return !a.removedAt && a.books === 'open'; }).forEach(function (a) {
      if (OA.role.kind === 'artist' && OA.role.slug !== a.slug) return;
      var n = s.requests.filter(function (r) { return r.waitlist && r.artist === a.slug && r.status !== 'Closed' && r.status !== 'Booked'; }).length;
      if (n) items.push({ pri: 5, kind: 'wait', text: OA.nick(a) + '’s books are open and ' + OA.plural(n, 'person is', 'people are') + ' waiting', meta: 'Let them know there is room.', cta: 'See waitlist', href: '#/requests' + OA.query({ artist: a.slug, waitlist: 1 }) });
    });
    return items.sort(function (a, b) { return a.pri - b.pri; });
  }

  function board(day, rerender) {
    var chairs = OA.chairs(); if (OA.role.kind === 'artist') chairs = chairs.filter(function (c) { return c.slug === OA.role.slug; });
    var list = OA.scopeAppts(S.state.appts).filter(function (a) { return a.date === day && a.status !== 'cancelled'; });
    var wrap = h('div', { class: 'board' });
    chairs.forEach(function (c) {
      var mine = list.filter(function (a) { return a.artist === c.slug; }).sort(function (a, b) { return OA.mins(a.start) - OA.mins(b.start); });
      var off = S.state.timeoff.filter(function (t) { return t.date === day && t.artist === c.slug; });
      var art = OA.artist(c.slug), closed = art && art.books === 'closed';
      var lane = h('section', { class: 'lane', 'aria-label': c.name + ' chair' },
        h('header', { class: 'lane-h' }, ui.avatar(c.full, 'lg'), h('div', {}, h('h3', { text: c.name }), art ? h('span', { class: 'sub', text: closed ? 'Books booked out' + (art.until ? ' until ' + OA.fmtShort(art.until) : '') : 'Books open' }) : null)));
      if (!mine.length && !off.length) lane.appendChild(h('p', { class: 'lane-empty', text: 'Nothing booked.' }));
      off.forEach(function (t) { lane.appendChild(h('div', { class: 'appt off' }, h('div', { class: 'appt-time', text: OA.fmtRange(t.start, t.end) }), h('div', { class: 'appt-main' }, h('strong', { text: 'Time off' }), t.note ? h('span', { text: t.note }) : null))); });
      mine.forEach(function (a) {
        var flags = OA.apptFlags(a);
        lane.appendChild(h('article', { class: 'appt st-' + a.status },
          h('div', { class: 'appt-time' }, h('b', { text: OA.fmtTime(a.start) }), h('span', { text: OA.fmtTime(a.end) })),
          h('div', { class: 'appt-main' },
            h('div', { class: 'appt-title' }, h('a', { href: '#/clients/' + a.clientId, text: a.client }), h('span', { class: 'type', text: OA.APPT_TYPES[a.type] })),
            a.piece ? h('div', { class: 'appt-piece', text: a.piece }) : null,
            flags.length ? h('div', { class: 'chips' }, flags.map(function (f) { return ui.chip(f[1], f[0]); })) : null,
            h('div', { class: 'row tight wrap' }, OA.apptStatusButtons(a, rerender), ui.btn('Edit', function () { OA.apptDialog(a).then(function (r) { if (r) rerender(); }); }, 'small quiet')))));
      });
      wrap.appendChild(lane);
    });
    return wrap;
  }

  OA.views.today = {
    title: function () { return 'Today'; },
    render: function (parts, q) {
      var today = OA.todayISO(), day = OA.validISO(q.d) ? q.d : today, notOpen = !OA.isOpenDay(day);
      if (notOpen && day === today) { var nx = nextOpen(today, 1); if (nx) day = nx; }
      var hr = OA.hoursFor(day), shown = day !== today;
      var prev = nextOpen(day, -1), next = nextOpen(day, 1);
      var m = OA.metrics(), items = queue(), rer = OA.rerender;
      var root = h('div', { class: 'page' });
      var greet = OA.role.kind === 'artist' ? 'Hi ' + OA.chairName(OA.role.slug) : 'Good ' + (new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening');
      root.appendChild(ui.pageHead(greet, OA.fmtLong(today) + (OA.isOpenDay(today) ? '. Open ' + OA.fmtRange(OA.hoursFor(today).open, OA.hoursFor(today).close) + '.' : '. The shop is closed today.'), [
        ui.btn('Add request', function () { OA.newRequestDialog().then(function (r) { if (r) OA.go('requests/' + r.id); }); }, ''),
        ui.btn('New appointment', function () { OA.apptDialog(null, { date: day }).then(function (r) { if (r) rer(); }); }, 'primary')
      ]));

      /* needs you */
      var needs = h('div', { class: 'needs' });
      if (!items.length) needs.appendChild(ui.empty('Nothing is waiting on you', 'New requests, unpaid deposits, reminders and healed-tattoo check-ins show up here.'));
      items.slice(0, 8).forEach(function (it) {
        var go = it.href ? ui.link(it.cta, it.href, 'btn small') : ui.btn(it.cta, function () { it.run(rer); }, 'small');
        needs.appendChild(h('div', { class: 'need ' + it.kind }, h('div', { class: 'need-t' }, h('strong', { text: it.text }), h('span', { text: it.meta })), go));
      });
      if (items.length > 8) needs.appendChild(h('p', { class: 'sub', text: 'And ' + (items.length - 8) + ' more. Work through these first.' }));
      root.appendChild(ui.section('Needs you' + (items.length ? ' (' + items.length + ')' : ''), needs));

      /* day board */
      var head = h('div', { class: 'daynav' },
        prev ? ui.link('Earlier', '#/today' + OA.query({ d: prev }), 'btn small quiet') : null,
        h('h2', { text: shown ? OA.fmtLong(day) : 'Today’s chairs' }),
        next ? ui.link('Later', '#/today' + OA.query({ d: next }), 'btn small quiet') : null,
        shown ? ui.link('Back to today', '#/today', 'btn small quiet') : null);
      var sec = h('section', { class: 'sec' }, head);
      if (notOpen && !shown) sec.appendChild(h('p', { class: 'note', text: 'The shop is closed today. Showing the next open day.' }));
      else if (notOpen) sec.appendChild(h('p', { class: 'note', text: 'The shop is closed on ' + OA.dayName(day) + 's by its usual hours.' }));
      else if (hr) sec.appendChild(h('p', { class: 'sub', text: 'Open ' + OA.fmtRange(hr.open, hr.close) }));
      sec.appendChild(board(day, rer));
      root.appendChild(sec);

      /* numbers */
      var stats = h('dl', { class: 'stats' });
      function stat(label, val, note) { stats.appendChild(h('div', {}, h('dt', { text: label }), h('dd', { text: val }), note ? h('dd', { class: 'note', text: note }) : null)); }
      stat('Appointments this week', String(m.week), 'Next 7 days');
      stat('Requests, last 30 days', String(m.requests30));
      stat('Median first reply', m.medianReplyH == null ? 'No replies yet' : m.medianReplyH < 1 ? Math.max(1, Math.round(m.medianReplyH * 60)) + ' min' : Math.round(m.medianReplyH) + ' hr', 'From the request’s first move out of New');
      stat('No-shows, last 60 days', m.pastCount ? m.noShows + ' of ' + m.pastCount : 'None yet', m.pastCount ? 'Of appointments marked done or no-show' : null);
      root.appendChild(ui.section('The numbers', [stats, h('p', { class: 'note', text: 'These come from what you mark in the portal. They are only as good as the statuses you keep up to date.' })]));
      return root;
    }
  };
})();
