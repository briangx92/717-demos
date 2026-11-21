/* Calendar: a week to see the shape of things, a day to see each chair's hours. */
(function () {
  'use strict';
  var OA = window.OA, h = OA.h, S = OA.store, ui = OA.ui, act = OA.act;
  var PPM = 1.15; /* pixels per minute in the day view */

  function monday(iso) { var d = OA.dow(iso); return OA.addDays(iso, d === 0 ? -6 : 1 - d); }
  function chairIndex(slug) { var i = OA.chairs().map(function (c) { return c.slug; }).indexOf(slug); return i < 0 ? 0 : i % 5; }
  function chairsShown(q) { var c = OA.chairs(); if (OA.role.kind === 'artist') c = c.filter(function (x) { return x.slug === OA.role.slug; }); else if (q && q.chair) c = c.filter(function (x) { return x.slug === q.chair; }); return c; }

  function toolbar(mode, anchor, q) {
    var chairs = OA.role.kind === 'artist' ? null : ui.select([['', 'All chairs']].concat(OA.chairs().map(function (c) { return [c.slug, c.name]; })), q.chair || '', { 'aria-label': 'Show chair' });
    if (chairs) chairs.addEventListener('change', function () { OA.go('calendar' + (mode === 'day' ? '/' + anchor : '') + OA.query({ w: mode === 'week' ? anchor : '', chair: chairs.value })); });
    var step = mode === 'week' ? 7 : 1, base = mode === 'week' ? 'calendar' : 'calendar/';
    function link(n) { var t = OA.addDays(anchor, n * step); return mode === 'week' ? '#/calendar' + OA.query({ w: t, chair: q.chair }) : '#/calendar/' + t + OA.query({ chair: q.chair }); }
    var label = mode === 'week' ? OA.fmtShort(anchor) + ' to ' + OA.fmtShort(OA.addDays(anchor, 6)) : OA.fmtLong(anchor);
    return h('div', { class: 'toolbar cal-tools' },
      h('div', { class: 'row tight' }, ui.link('Back', link(-1), 'btn small'), h('strong', { class: 'cal-label', text: label }), ui.link('Forward', link(1), 'btn small'), ui.link('Today', mode === 'week' ? '#/calendar' + OA.query({ chair: q.chair }) : '#/calendar/' + OA.todayISO() + OA.query({ chair: q.chair }), 'btn small quiet')),
      h('div', { class: 'row tight' }, h('div', { class: 'seg', role: 'group', 'aria-label': 'View' }, ui.link('Week', '#/calendar' + OA.query({ w: monday(anchor), chair: q.chair }), 'seg-b' + (mode === 'week' ? ' on' : '')), ui.link('Day', '#/calendar/' + (mode === 'day' ? anchor : (OA.diffDays(OA.todayISO(), anchor) >= 0 && OA.diffDays(OA.todayISO(), anchor) < 7 ? OA.todayISO() : anchor)) + OA.query({ chair: q.chair }), 'seg-b' + (mode === 'day' ? ' on' : ''))), chairs));
  }

  function apptCard(a, compact) {
    var flags = OA.apptFlags(a).filter(function (f) { return f[0] !== 'ok' || a.status === 'arrived'; });
    return h('button', { type: 'button', class: 'cal-appt c' + chairIndex(a.artist) + ' st-' + a.status + (a.type === 'consult' ? ' consult' : ''), on: { click: function () { OA.apptDialog(a).then(function (r) { if (r) OA.rerender(); }); } }, 'aria-label': a.client + ', ' + OA.chairName(a.artist) + ', ' + OA.fmtRange(a.start, a.end) },
      h('span', { class: 'ca-time', text: OA.fmtTime(a.start) }),
      h('span', { class: 'ca-name', text: a.client }),
      h('span', { class: 'ca-meta', text: OA.chairName(a.artist) + (a.type === 'consult' ? ' · Consult' : '') }),
      compact ? null : (a.piece ? h('span', { class: 'ca-piece', text: a.piece }) : null),
      !compact && flags.length ? h('span', { class: 'chips' }, flags.slice(0, 2).map(function (f) { return ui.chip(f[1], f[0]); })) : null);
  }

  function weekView(start, q) {
    var root = h('div', { class: 'page wide' }), shown = chairsShown(q), slugs = shown.map(function (c) { return c.slug; });
    root.appendChild(ui.pageHead('Calendar', null, [ui.btn('Block time off', function () { OA.timeoffDialog({}).then(function (v) { if (v) OA.rerender(); }); }), ui.btn('New appointment', function () { OA.apptDialog(null, { date: OA.todayISO() }).then(function (r) { if (r) OA.rerender(); }); }, 'primary')]));
    root.appendChild(toolbar('week', start, q));
    var grid = h('div', { class: 'weekgrid' }), today = OA.todayISO(), any = 0;
    for (var i = 0; i < 7; i++) {
      (function (day) {
        var open = OA.isOpenDay(day), hr = OA.hoursFor(day);
        var list = OA.scopeAppts(S.state.appts).filter(function (a) { return a.date === day && a.status !== 'cancelled' && slugs.indexOf(a.artist) >= 0; }).sort(function (a, b) { return OA.mins(a.start) - OA.mins(b.start); });
        var off = S.state.timeoff.filter(function (t) { return t.date === day && slugs.indexOf(t.artist) >= 0; });
        any += list.length;
        var col = h('section', { class: 'weekday' + (day === today ? ' today' : '') + (!open && !list.length ? ' closed' : ''), 'aria-label': OA.fmtLong(day) },
          h('header', {}, h('a', { href: '#/calendar/' + day + OA.query({ chair: q.chair }), class: 'wd-link' }, h('b', { text: OA.DAYS[OA.dow(day)].slice(0, 3) }), h('span', { text: String(OA.parse(day).getDate()) })), h('small', { text: open ? OA.fmtRange(hr.open, hr.close).replace(/:00/g, '') : 'Closed' })));
        off.forEach(function (t) { col.appendChild(h('div', { class: 'cal-off', text: OA.chairName(t.artist) + ' off, ' + OA.fmtRange(t.start, t.end).replace(/:00/g, '') + (t.note ? ' (' + t.note + ')' : '') })); });
        list.forEach(function (a) { col.appendChild(apptCard(a, false)); });
        if (open && !list.length && !off.length) col.appendChild(h('p', { class: 'cal-none', text: 'Open, nothing booked' }));
        if (open || list.length) col.appendChild(h('button', { type: 'button', class: 'cal-add', 'aria-label': 'Add appointment on ' + OA.fmtLong(day), text: '+ Add', on: { click: function () { OA.apptDialog(null, { date: day, artist: shown[0] && shown[0].slug }).then(function (r) { if (r) OA.rerender(); }); } } }));
        grid.appendChild(col);
      })(OA.addDays(start, i));
    }
    root.appendChild(grid);
    if (!any) root.appendChild(h('p', { class: 'note', text: 'Nothing is booked this week' + (q.chair ? ' for ' + OA.chairName(q.chair) : '') + '. Requests that reach the booking stage land here.' }));
    var legend = h('div', { class: 'legend', 'aria-label': 'Chairs' }); OA.chairs().forEach(function (c) { legend.appendChild(h('span', { class: 'lg c' + chairIndex(c.slug) }, h('i'), c.name)); });
    root.appendChild(legend);
    return root;
  }

  function dayView(day, q) {
    var root = h('div', { class: 'page wide' }), shown = chairsShown(q), open = OA.isOpenDay(day), hr = OA.hoursFor(day);
    var list = OA.scopeAppts(S.state.appts).filter(function (a) { return a.date === day && a.status !== 'cancelled'; });
    var off = S.state.timeoff.filter(function (t) { return t.date === day; });
    root.appendChild(ui.pageHead('Calendar', null, [ui.btn('Block time off', function () { OA.timeoffDialog({ date: day }).then(function (v) { if (v) OA.rerender(); }); }), ui.btn('New appointment', function () { OA.apptDialog(null, { date: day, artist: shown[0] && shown[0].slug }).then(function (r) { if (r) OA.rerender(); }); }, 'primary')]));
    root.appendChild(toolbar('day', day, q));
    var lo = open ? OA.mins(hr.open) : 12 * 60, hi = open ? OA.mins(hr.close) : 17 * 60;
    list.concat(off).forEach(function (a) { lo = Math.min(lo, OA.mins(a.start)); hi = Math.max(hi, OA.mins(a.end)); });
    lo = Math.floor(lo / 60) * 60; hi = Math.ceil(hi / 60) * 60;
    if (!open) root.appendChild(h('p', { class: 'note', text: 'The shop is closed on ' + OA.dayName(day) + 's by its usual hours.' + (list.length ? ' Appointments below were booked anyway.' : '') }));
    var hours = h('div', { class: 'dg-hours', style: 'height:' + (hi - lo) * PPM + 'px' });
    for (var m = lo; m < hi; m += 60) hours.appendChild(h('div', { class: 'dg-h', style: 'top:' + (m - lo) * PPM + 'px', text: OA.fmtTime(OA.hhmm(m)).replace(':00', '') }));
    var lanes = h('div', { class: 'dg-lanes', style: 'grid-template-columns:repeat(' + shown.length + ',minmax(150px,1fr))' });
    shown.forEach(function (c) {
      var lane = h('div', { class: 'dg-lane', style: 'height:' + (hi - lo) * PPM + 'px', title: 'Click an empty spot to add an appointment' });
      for (var mm = lo; mm < hi; mm += 60) lane.appendChild(h('div', { class: 'dg-line', style: 'top:' + (mm - lo) * PPM + 'px' }));
      if (open) { /* shade outside shop hours */
        if (OA.mins(hr.open) > lo) lane.appendChild(h('div', { class: 'dg-shut', style: 'top:0;height:' + (OA.mins(hr.open) - lo) * PPM + 'px' }));
        if (OA.mins(hr.close) < hi) lane.appendChild(h('div', { class: 'dg-shut', style: 'top:' + (OA.mins(hr.close) - lo) * PPM + 'px;height:' + (hi - OA.mins(hr.close)) * PPM + 'px' }));
      }
      lane.addEventListener('click', function (e) {
        if (e.target !== lane && !e.target.classList.contains('dg-line') && !e.target.classList.contains('dg-shut')) return;
        var r = lane.getBoundingClientRect(), mins = Math.round(((e.clientY - r.top) / PPM + lo) / 15) * 15;
        OA.apptDialog(null, { date: day, artist: c.slug, start: OA.hhmm(OA.clamp(mins, 0, 23 * 60))  }).then(function (x) { if (x) OA.rerender(); });
      });
      off.filter(function (t) { return t.artist === c.slug; }).forEach(function (t) { lane.appendChild(h('div', { class: 'dg-off', style: 'top:' + (OA.mins(t.start) - lo) * PPM + 'px;height:' + (OA.mins(t.end) - OA.mins(t.start)) * PPM + 'px', title: 'Time off' }, h('span', { text: 'Time off' + (t.note ? ': ' + t.note : '') }), ui.btn('Remove', function () { act.removeTimeoff(t.id); ui.toast('Time off removed'); OA.rerender(); }, 'small quiet'))); });
      list.filter(function (a) { return a.artist === c.slug; }).forEach(function (a) {
        var el = apptCard(a, false); el.classList.add('dg-appt'); el.style.top = (OA.mins(a.start) - lo) * PPM + 'px'; el.style.height = Math.max(34, (OA.mins(a.end) - OA.mins(a.start)) * PPM - 2) + 'px'; lane.appendChild(el);
      });
      lanes.appendChild(h('div', { class: 'dg-col' }, h('div', { class: 'dg-head c' + chairIndex(c.slug) }, ui.avatar(c.full), h('strong', { text: c.name })), lane));
    });
    root.appendChild(h('div', { class: 'daygrid' }, h('div', { class: 'dg-gutter' }, h('div', { class: 'dg-head' }), hours), lanes));
    if (!list.length) root.appendChild(h('p', { class: 'note', text: 'Nothing booked. Click an empty spot in a chair’s column to add something.' }));
    return root;
  }

  OA.views.calendar = {
    title: function (p) { return p[0] ? OA.fmtLong(p[0]) : 'Calendar'; },
    render: function (parts, q) {
      if (parts[0]) {
        if (!OA.validISO(parts[0])) return ui.empty('That date is not valid', 'Dates in the address look like 2026-11-24.', ui.link('Open the calendar', '#/calendar', 'btn primary'));
        return dayView(parts[0], q);
      }
      return weekView(OA.validISO(q.w) ? monday(q.w) : monday(OA.todayISO()), q);
    }
  };
})();
