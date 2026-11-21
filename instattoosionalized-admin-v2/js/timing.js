/* When a client wants to come in. Stored as data (days, time of day, or an exact slot), not as a sentence, so it can be checked against
   the calendar now and handed to Google Calendar later: exact slots become RFC 3339 start and end with the shop's time zone, and
   flexible wishes become a list of free/busy windows (timeMin, timeMax) for the Calendar freebusy.query call. */
(function () {
  'use strict';
  var OA = window.OA, h = OA.h, S = OA.store, ui = OA.ui;
  var DAY_ORDER = [1, 2, 3, 4, 5, 6, 0], DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], DAY_LONG = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  var PARTS = { any: { label: 'Any time', from: '00:00', to: '24:00' }, morning: { label: 'Mornings', from: '00:00', to: '12:00' }, afternoon: { label: 'Afternoons', from: '12:00', to: '17:00' }, evening: { label: 'Evenings', from: '17:00', to: '24:00' } };
  var DURS = [[30, '30 minutes'], [60, '1 hour'], [90, '1½ hours'], [120, '2 hours'], [180, '3 hours'], [240, '4 hours'], [360, '6 hours']];

  OA.defaultDur = function (kind, size) { return kind === 'piercing' ? 30 : ({ Small: 60, Medium: 120, Large: 240 }[size] || 60); };
  OA.cleanPref = function (p) {
    p = p || {};
    var mode = ['flex', 'days', 'exact'].indexOf(p.mode) >= 0 ? p.mode : 'flex';
    var days = (Array.isArray(p.days) ? p.days : []).map(Number).filter(function (d, i, a) { return d >= 0 && d <= 6 && a.indexOf(d) === i; }).sort(function (a, b) { return DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b); });
    return { mode: mode, days: days, part: PARTS[p.part] ? p.part : 'any', date: p.date || '', start: p.start || '', dur: +p.dur || 60 };
  };

  /* The sentence shown in lists and sent in texts. Always built from the data, so the two cannot disagree. */
  OA.prefText = function (p) {
    p = OA.cleanPref(p);
    if (p.mode === 'exact') return OA.validISO(p.date) && p.start ? OA.fmtDow(p.date) + ', ' + OA.fmtRange(p.start, OA.hhmm(OA.mins(p.start) + p.dur)) : 'A specific time (not set)';
    var part = p.part === 'any' ? '' : ', ' + PARTS[p.part].label.toLowerCase();
    if (p.mode === 'flex') return 'Flexible' + part;
    var d = p.days.slice().sort(function (a, b) { return a - b; }).join(',');
    var names = d === '0,6' ? 'Weekends' : d === '1,2,3,4,5' ? 'Weekdays' : p.days.map(function (x) { return DAY_LONG[x]; }).join(', ').replace(/, ([^,]*)$/, ' and $1');
    return (names || 'Certain days') + part;
  };

  /* Which chairs could take this request. No artist chosen: every chair that does that kind of work. */
  function candidates(artist, kind) {
    if (artist) return [artist];
    if (kind === 'piercing') return ['piercing'];
    return OA.chairs().filter(function (c) { return c.slug !== 'piercing'; }).map(function (c) { return c.slug; });
  }
  function nowParts() { var n = new Date(); return { date: OA.iso(n), mins: n.getHours() * 60 + n.getMinutes() }; }

  /* Is this slot possible? Returns reasons it is not (errors), things to know (warns), and who is free. Never changes anything. */
  OA.checkSlot = function (o) {
    var errors = [], warns = [], free = [];
    if (!OA.validISO(o.date)) return { errors: ['Pick a date.'], warns: warns, free: free };
    if (!o.start) return { errors: ['Pick a start time.'], warns: warns, free: free };
    var end = OA.mins(o.start) + o.dur, now = nowParts();
    if (end > 24 * 60) { return { errors: ['That runs past midnight. Pick an earlier start or a shorter length.'], warns: warns, free: free }; }
    var endT = OA.hhmm(end);
    if (o.date < now.date) errors.push('That date has already passed.');
    else if (o.date === now.date && OA.mins(o.start) <= now.mins) errors.push('That time has already passed today.');
    if (!OA.isOpenDay(o.date)) errors.push('The shop is closed on ' + OA.dayName(o.date) + 's.');
    else { var hr = OA.hoursFor(o.date); if (OA.mins(o.start) < OA.mins(hr.open) || end > OA.mins(hr.close)) errors.push('That runs outside the shop’s hours (' + OA.fmtRange(hr.open, hr.close) + ' on ' + OA.dayName(o.date) + 's).'); }
    var cands = candidates(o.artist, o.kind), busy = [];
    cands.forEach(function (slug) {
      var c = OA.apptConflicts({ date: o.date, start: o.start, end: endT, artist: slug }, o.ignoreApptId);
      if (c.length) busy.push([slug, c]); else free.push(slug);
    });
    if (!free.length && cands.length) {
      errors.push(o.artist ? OA.chairName(o.artist) + ' is already busy then: ' + busy[0][1].join('; ') + '.'
        : (o.kind === 'piercing' ? 'The piercing chair' : 'Every tattoo chair') + ' is busy then: ' + busy.map(function (b) { return OA.chairName(b[0]) + ' (' + b[1].join('; ') + ')'; }).join('; ') + '.');
    }
    S.state.requests.forEach(function (r) {
      if (r.id === o.ignoreReqId || r.status === 'Closed' || !r.pref || r.pref.mode !== 'exact' || r.pref.date !== o.date) return;
      if (o.artist && r.artist && r.artist !== o.artist) return;
      var re = OA.mins(r.pref.start) + (+r.pref.dur || 60);
      if (OA.mins(o.start) < re && end > OA.mins(r.pref.start)) warns.push(r.name + ' has also asked for ' + OA.fmtRange(r.pref.start, OA.hhmm(re)) + ' that day.');
    });
    return { errors: errors, warns: warns, free: free };
  };

  /* Nearby times that do work: same day first, then the next open days. */
  OA.freeStarts = function (o) {
    var out = [], cands = candidates(o.artist, o.kind);
    function open(date) {
      var hr = OA.hoursFor(date), res = [];
      if (!OA.isOpenDay(date)) return res;
      var now = nowParts();
      for (var m = OA.mins(hr.open); m + o.dur <= OA.mins(hr.close); m += 30) {
        if (date < now.date || (date === now.date && m <= now.mins)) continue;
        var t = OA.hhmm(m), end = OA.hhmm(m + o.dur);
        if (cands.some(function (slug) { return !OA.apptConflicts({ date: date, start: t, end: end, artist: slug }, o.ignoreApptId).length; })) res.push(t);
      }
      return res;
    }
    var want = OA.mins(o.start || '12:00');
    open(o.date).sort(function (a, b) { return Math.abs(OA.mins(a) - want) - Math.abs(OA.mins(b) - want); }).slice(0, 3).forEach(function (t) { out.push({ date: o.date, start: t }); });
    var d = o.date, n = 0;
    while (out.length < 5 && n < 14) { d = OA.addDays(d, 1); n++; var f = open(d); if (f.length) out.push({ date: d, start: f.slice().sort(function (a, b) { return Math.abs(OA.mins(a) - want) - Math.abs(OA.mins(b) - want); })[0] }); }
    return out.slice(0, 5);
  };

  /* Does a slot match what the client asked for? Only true when they actually asked for something:
     a specific time, certain days, or a time of day. "Flexible, any time" matches nothing, because everything is fine. */
  OA.prefFits = function (pref, date, m, dur) {
    if (!pref) return false;
    var p = OA.cleanPref(pref);
    if (p.mode === 'exact') return p.date === date && !!p.start && OA.mins(p.start) === m;
    if (p.mode === 'days' && (!p.days.length || p.days.indexOf(OA.dow(date)) < 0)) return false;
    if (p.mode === 'flex' && p.part === 'any') return false;
    var w = PARTS[p.part], to = w.to === '24:00' ? 1440 : OA.mins(w.to);
    return m >= OA.mins(w.from) && m < to;
  };

  /* Every free start time over the next stretch of days, for the booking dialog's list.
     Only starts where the whole appointment fits: shop hours, time off, and who is already booked are all respected. */
  OA.openTimes = function (o) {
    var cands = candidates(o.artist, o.kind || 'tattoo'), out = [], d = OA.todayISO(), now = nowParts(), span = o.span || 14;
    for (var n = 0; n < span; n++, d = OA.addDays(d, 1)) {
      if (!OA.isOpenDay(d)) continue;
      var hr = OA.hoursFor(d), slots = [];
      for (var m = OA.mins(hr.open); m + o.dur <= OA.mins(hr.close); m += 30) {
        if (d === now.date && m <= now.mins) continue;
        var t = OA.hhmm(m), e = OA.hhmm(m + o.dur);
        if (cands.some(function (slug) { return !OA.apptConflicts({ date: d, start: t, end: e, artist: slug }, o.ignoreApptId).length; })) slots.push({ date: d, start: t, end: e, pick: OA.prefFits(o.pref, d, m, o.dur) });
      }
      if (slots.length) out.push({ date: d, slots: slots });
    }
    return out;
  };

  /* The shape Google Calendar's freebusy.query wants: one window per day it could happen, with offsets, in the shop's zone. */
  OA.prefWindows = function (p, max) {
    p = OA.cleanPref(p); var tz = OA.gcalSettings().tz, out = [];
    function win(date, from, to) {
      var next = to === '24:00', toDate = next ? OA.addDays(date, 1) : date;
      return { timeMin: OA.rfc3339(date, from, tz), timeMax: OA.rfc3339(toDate, next ? '00:00' : to, tz), timeZone: tz };
    }
    if (p.mode === 'exact') { if (!OA.validISO(p.date) || !p.start) return []; return [win(p.date, p.start, OA.hhmm(OA.mins(p.start) + p.dur))]; }
    var d = OA.todayISO(), n = 0;
    while (out.length < (max || 14) && n < 60) {
      if (OA.isOpenDay(d) && (p.mode === 'flex' || p.days.indexOf(OA.dow(d)) >= 0)) {
        var hr = OA.hoursFor(d), from = Math.max(OA.mins(hr.open), OA.mins(PARTS[p.part].from)), to = Math.min(OA.mins(hr.close), PARTS[p.part].to === '24:00' ? 1440 : OA.mins(PARTS[p.part].to));
        if (to > from) out.push(win(d, OA.hhmm(from), OA.hhmm(to)));
      }
      d = OA.addDays(d, 1); n++;
    }
    return out;
  };

  /* The form control. ctx() gives the current artist, kind and size from the form around it; call refresh() when those change. */
  OA.timingField = function (o) {
    var p = OA.cleanPref(o.pref), touched = false, uses = {};
    var mode = ui.select([['flex', 'Flexible, any day'], ['days', 'Certain days'], ['exact', 'A specific date and time']], p.mode, { 'aria-label': 'When' });
    var part = ui.select(Object.keys(PARTS).map(function (k) { return [k, PARTS[k].label]; }), p.part, { 'aria-label': 'Time of day' });
    var days = h('div', { class: 'daychips', role: 'group', 'aria-label': 'Days' });
    DAY_ORDER.forEach(function (d) {
      var cb = h('input', { type: 'checkbox', value: String(d), checked: p.days.indexOf(d) >= 0 }); cb.addEventListener('change', changed);
      days.appendChild(h('label', { class: 'daychip' }, cb, h('span', { text: DAY_SHORT[d] })));
    });
    var date = ui.input(p.date, { type: 'date', 'aria-label': 'Date' }), start = ui.input(p.start || '13:00', { type: 'time', step: 900, 'aria-label': 'Start time' });
    var dur = ui.select(DURS.map(function (x) { return [String(x[0]), x[1]]; }), String(p.dur), { 'aria-label': 'How long' });
    var durTouched = !!o.pref && !!o.pref.dur;
    var exact = h('div', { class: 'timing-exact' }, ui.field('Date', date), ui.field('Starts', start), ui.field('Length', dur));
    var status = h('div', { class: 'timing-status', 'aria-live': 'polite' }), gfmt = h('pre', { class: 'code' });
    var google = h('details', { class: 'an-table' }, h('summary', { text: 'How this goes to Google Calendar' }), gfmt);
    var legacy = o.legacyText ? h('p', { class: 'note', text: 'The website form said: “' + o.legacyText + '”. Choosing a time here replaces it.' }) : null;
    var el = h('div', { class: 'timing' }, h('div', { class: 'row' }, mode, part), days, exact, status, google, legacy);

    function read() {
      var vals = { mode: mode.value, part: part.value, days: [].slice.call(days.querySelectorAll('input:checked')).map(function (i) { return +i.value; }), date: date.value, start: start.value, dur: +dur.value };
      return OA.cleanPref(vals);
    }
    function ctx() { return (o.ctx && o.ctx()) || {}; }
    function check() {
      var v = read(), c = ctx();
      if (v.mode !== 'exact') return { errors: v.mode === 'days' && !v.days.length ? ['Pick at least one day, or choose Flexible.'] : [], warns: [], free: [] };
      return OA.checkSlot({ date: v.date, start: v.start, dur: v.dur, artist: c.artist || '', kind: c.kind || 'tattoo', ignoreReqId: o.ignoreReqId, ignoreApptId: o.ignoreApptId });
    }
    function paint() {
      var v = read(), c = ctx(), res = check();
      days.hidden = v.mode !== 'days'; part.hidden = v.mode === 'exact'; exact.hidden = v.mode !== 'exact';
      OA.clear(status);
      if (v.mode === 'exact' && v.date) {
        if (res.errors.length) {
          res.errors.forEach(function (m) { status.appendChild(h('div', { class: 'hint bad', text: m })); });
          var sug = OA.freeStarts({ date: OA.validISO(v.date) && v.date >= OA.todayISO() ? v.date : OA.todayISO(), start: v.start, dur: v.dur, artist: c.artist || '', kind: c.kind || 'tattoo', ignoreApptId: o.ignoreApptId });
          if (sug.length) {
            var row = h('div', { class: 'row tight' }, h('span', { class: 'hint', text: 'Free:' }));
            sug.forEach(function (x) { row.appendChild(ui.btn(OA.fmtDow(x.date) + ' ' + OA.fmtTime(x.start), function () { date.value = x.date; start.value = x.start; changed(); }, 'small quiet')); });
            status.appendChild(row);
          }
        } else {
          status.appendChild(h('div', { class: 'hint ok', text: 'Free: ' + (c.artist ? OA.chairName(c.artist) : res.free.map(OA.chairName).join(', ')) + ' can take ' + OA.fmtRange(v.start, OA.hhmm(OA.mins(v.start) + v.dur)) + '.' }));
          res.warns.forEach(function (m) { status.appendChild(h('div', { class: 'hint warn', text: m })); });
        }
      } else if (res.errors.length && touched) res.errors.forEach(function (m) { status.appendChild(h('div', { class: 'hint bad', text: m })); });
      var wins = OA.prefWindows(v, 3);
      gfmt.textContent = wins.length ? JSON.stringify({ note: 'freebusy.query body, first ' + wins.length + ' window' + (wins.length === 1 ? '' : 's'), timeZone: wins[0].timeZone, items: wins.map(function (w) { return { timeMin: w.timeMin, timeMax: w.timeMax }; }) }, null, 2) : 'Nothing to send yet.';
    }
    function changed() { touched = true; paint(); o.onChange && o.onChange(); }
    mode.addEventListener('change', changed); part.addEventListener('change', changed); date.addEventListener('change', changed); start.addEventListener('change', changed);
    dur.addEventListener('change', function () { durTouched = true; changed(); });
    paint();
    return {
      el: el,
      get: function () { return read(); },
      text: function () { return OA.prefText(read()); },
      touched: function () { return touched; },
      validate: function () { return check().errors; },
      refresh: function () { var c = ctx(); if (!durTouched) dur.value = String(OA.defaultDur(c.kind, c.size)); paint(); }
    };
  };
})();
