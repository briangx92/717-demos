/* Pieces more than one screen uses: the appointment dialog, quick status buttons, message hand-offs. */
(function () {
  'use strict';
  var OA = window.OA, h = OA.h, S = OA.store, ui = OA.ui, act = OA.act;
  var DUR = { consult: 60, session: 120, touchup: 60, piercing: 45, other: 60 };

  function chairOptions() { var c = OA.chairs(); if (OA.role.kind === 'artist') c = c.filter(function (x) { return x.slug === OA.role.slug; }); return c.map(function (x) { return [x.slug, x.name]; }); }

  /* One dialog for adding and editing an appointment. Resolves with the saved appointment or null. */
  OA.apptDialog = function (existing, defaults) {
    defaults = defaults || {};
    var a = existing || {};
    var d = {
      client: a.client || defaults.client || '', phone: '', type: a.type || defaults.type || 'session',
      artist: a.artist || defaults.artist || (chairOptions()[0] || [''])[0], date: a.date || defaults.date || OA.todayISO(),
      start: a.start || defaults.start || '13:00', end: a.end || defaults.end || '', piece: a.piece || defaults.piece || '',
      deposit: a.deposit || defaults.deposit || 'none', price: a.price || defaults.price || '', note: a.note || ''
    };
    var cl = a.clientId ? OA.client(a.clientId) : null; if (cl) d.phone = cl.phone; else if (defaults.phone) d.phone = defaults.phone;
    var endTouched = !!(a.end || defaults.end);
    if (!d.end) d.end = OA.hhmm(OA.mins(d.start) + DUR[d.type]);
    var dl = h('datalist', { id: 'client-names' }); S.state.clients.forEach(function (c) { dl.appendChild(h('option', { value: c.name })); });
    var f = {
      client: ui.input(d.client, { list: 'client-names', required: true, autofocus: true }),
      phone: ui.input(d.phone, { type: 'tel', inputmode: 'tel', placeholder: '(610) 555-0100' }),
      type: ui.select(Object.keys(OA.APPT_TYPES).map(function (k) { return [k, OA.APPT_TYPES[k]]; }), d.type),
      artist: ui.select(chairOptions(), d.artist),
      date: ui.input(d.date, { type: 'date' }), start: ui.input(d.start, { type: 'time', step: 900 }), end: ui.input(d.end, { type: 'time', step: 900 }),
      piece: ui.input(d.piece, { placeholder: 'What is being done' }),
      deposit: ui.select([['none', 'No deposit asked'], ['asked', 'Deposit asked, not paid'], ['paid', 'Deposit paid']], d.deposit),
      price: ui.input(d.price, { placeholder: 'e.g. $140' }), note: ui.area(d.note, { rows: 2 })
    };
    var live = h('div', { class: 'form-live', 'aria-live': 'polite' });
    function read() { return { client: f.client.value, phone: f.phone.value, type: f.type.value, artist: f.artist.value, date: f.date.value, start: f.start.value, end: f.end.value, piece: f.piece.value, deposit: f.deposit.value, price: f.price.value, note: f.note.value, requestId: a.requestId || defaults.requestId || '' }; }
    function check() {
      OA.clear(live); var v = read(), msgs = [];
      if (OA.validISO(v.date) && v.start && v.end && OA.mins(v.end) > OA.mins(v.start) && v.artist) {
        var c = OA.apptConflicts(v, a.id); if (c.length) msgs.push(['bad', OA.chairName(v.artist) + ' is already busy then: ' + c.join('; ') + '.']);
        if (!OA.isOpenDay(v.date)) msgs.push(['warn', 'The shop is closed on ' + OA.dayName(v.date) + 's by its usual hours.']);
        else { var hr = OA.hoursFor(v.date); if (OA.mins(v.start) < OA.mins(hr.open) || OA.mins(v.end) > OA.mins(hr.close)) msgs.push(['warn', 'That runs outside the shop’s hours that day (' + OA.fmtRange(hr.open, hr.close) + ').']); }
      }
      msgs.forEach(function (m) { live.appendChild(h('div', { class: 'hint ' + m[0], text: m[1] })); });
    }
    f.type.addEventListener('change', function () { if (!endTouched) { f.end.value = OA.hhmm(OA.mins(f.start.value || '12:00') + DUR[f.type.value]); } check(); });
    f.start.addEventListener('change', function () { if (!endTouched && f.start.value) f.end.value = OA.hhmm(Math.min(23 * 60 + 45, OA.mins(f.start.value) + DUR[f.type.value])); check(); });
    f.end.addEventListener('change', function () { endTouched = true; check(); });
    [f.artist, f.date].forEach(function (x) { x.addEventListener('change', check); });
    f.client.addEventListener('change', function () { var c = OA.findClient(f.client.value, ''); if (c && !f.phone.value) f.phone.value = c.phone; });
    var body = h('div', { class: 'form-grid' }, dl,
      ui.field('Client', f.client, null, 'span2'), ui.field('Phone', f.phone, a.clientId ? null : 'Needed to text them from the portal.'),
      ui.field('What kind', f.type), ui.field('With', f.artist), ui.field('Date', f.date), ui.field('Starts', f.start), ui.field('Ends', f.end),
      ui.field('Piece', f.piece, null, 'span2'), ui.field('Deposit', f.deposit), ui.field('Price', f.price), ui.field('Note', f.note, null, 'span2'), live);
    check();
    if (existing && existing.sync && existing.sync.state === 'failed') {
      body.appendChild(h('div', { class: 'form-live' }, h('div', { class: 'hint bad', text: 'This appointment is not on Google Calendar: ' + (existing.sync.error || 'the last push failed') + '. Tell the artist, or retry.' }),
        ui.btn('Retry Google Calendar', function () { OA.gcal.push(existing).then(function () { ui.toast('Sent to Google Calendar'); }, function (e) { ui.fail(e.message); }); }, 'small')));
    }
    var actions = [{ label: 'Cancel', kind: 'quiet', value: null }];
    if (existing && existing.status !== 'cancelled') {
      actions.push({ label: 'Cancel appointment', kind: 'danger-quiet', run: function () {
        return ui.confirm('Cancel this appointment?', existing.client + ', ' + OA.fmtLong(existing.date) + ' at ' + OA.fmtTime(existing.start) + '. It stays on the client’s history as cancelled. Let them know separately.', 'Cancel appointment', true).then(function (ok) {
          if (!ok) return false; act.setApptStatus(existing, 'cancelled'); ui.toast('Appointment cancelled'); return 'cancelled';
        });
      } });
    }
    actions.push({ label: existing ? 'Save changes' : 'Add appointment', kind: 'primary', run: function () {
      var res = act.saveAppt(read(), existing && existing.id);
      if (!res.ok) return { error: res.errors };
      ui.toast(existing ? 'Appointment saved' : 'Appointment added'); return res.appt;
    } });
    return ui.dialog({ title: existing ? 'Appointment' : 'New appointment', body: body, actions: actions, wide: true });
  };

  OA.timeoffDialog = function (defaults) {
    defaults = defaults || {};
    var f = { artist: ui.select(chairOptions(), defaults.artist || (chairOptions()[0] || [''])[0]), date: ui.input(defaults.date || OA.todayISO(), { type: 'date' }), start: ui.input('12:00', { type: 'time' }), end: ui.input('17:00', { type: 'time' }), note: ui.input('', { placeholder: 'Optional' }) };
    return ui.dialog({
      title: 'Block time off', lead: 'Blocked time shows on the calendar and stops double-booking in the portal. It does not change the public website.',
      body: h('div', { class: 'form-grid' }, ui.field('Who', f.artist), ui.field('Date', f.date), ui.field('From', f.start), ui.field('To', f.end), ui.field('Note', f.note, null, 'span2')),
      actions: [{ label: 'Cancel', kind: 'quiet', value: null }, { label: 'Block time', kind: 'primary', run: function () {
        var r = act.addTimeoff({ artist: f.artist.value, date: f.date.value, start: f.start.value, end: f.end.value, note: f.note.value });
        if (!r.ok) return { error: r.errors };
        ui.toast(r.clashes.length ? 'Time blocked. ' + OA.plural(r.clashes.length, 'appointment') + ' already booked then, check them.' : 'Time blocked', r.clashes.length ? { kind: 'bad' } : null); return true;
      } }]
    });
  };

  OA.newRequestDialog = function () {
    var chairs = [['', 'No preference']].concat(OA.chairs().filter(function (c) { return c.slug !== 'piercing'; }).map(function (c) { return [c.slug, c.name]; }));
    var f = {
      name: ui.input('', { required: true, autofocus: true }), phone: ui.input('', { type: 'tel', inputmode: 'tel' }),
      kind: ui.select([['tattoo', 'Tattoo'], ['piercing', 'Piercing']], 'tattoo'), artist: ui.select(chairs, ''),
      size: ui.select([['', 'Not sure'], ['Small', 'Small'], ['Medium', 'Medium'], ['Large', 'Large']], ''), place: ui.input(''), idea: ui.area('', { rows: 3 }), when: ui.input('', { placeholder: 'e.g. weekends' })
    };
    return ui.dialog({
      title: 'Add a request', lead: 'For someone who called, texted or walked in. Requests from the website form arrive on their own.',
      body: h('div', { class: 'form-grid' }, ui.field('Name', f.name), ui.field('Phone', f.phone, 'So you can text them from here.'), ui.field('What', f.kind), ui.field('Artist', f.artist), ui.field('Size', f.size), ui.field('Where on the body', f.place), ui.field('The idea', f.idea, null, 'span2'), ui.field('Best days or times', f.when, null, 'span2')),
      wide: true,
      actions: [{ label: 'Cancel', kind: 'quiet', value: null }, { label: 'Add request', kind: 'primary', run: function () {
        var errs = [];
        if (!f.name.value.trim()) errs.push('Add a name.');
        if (f.phone.value && !OA.phoneOk(f.phone.value)) errs.push('The phone number needs at least 7 digits.');
        if (errs.length) return { error: errs };
        var r = act.addRequest({ name: f.name.value, phone: f.phone.value, kind: f.kind.value, artist: f.artist.value, size: f.size.value, place: f.place.value, idea: f.idea.value, when: f.when.value });
        ui.toast('Request added'); return r;
      } }]
    });
  };

  /* Quick status buttons for an appointment, with Undo. */
  OA.apptStatusButtons = function (a, after) {
    var row = h('div', { class: 'row tight' });
    function set(status, label) {
      var prev = a.status;
      row.appendChild(ui.btn(label, function () {
        act.setApptStatus(a, status);
        ui.toast(a.client + ': ' + OA.APPT_STATUS[status].toLowerCase(), { action: { label: 'Undo', run: function () { act.setApptStatus(a, prev); after && after(); } } });
        after && after();
      }, 'small' + (status === 'noshow' ? ' danger-quiet' : status === 'done' ? ' primary' : '')));
    }
    if (a.status === 'booked') { set('arrived', 'Arrived'); set('noshow', 'No-show'); }
    else if (a.status === 'arrived') { set('done', 'Done'); set('booked', 'Not here yet'); }
    else if (a.status === 'noshow' || a.status === 'done') { row.appendChild(ui.btn('Undo status', function () { act.setApptStatus(a, 'booked'); after && after(); }, 'small quiet')); }
    return row;
  };

  OA.sendReminder = function (a, after) {
    var c = OA.client(a.clientId);
    return ui.message({ key: 'reminder', ctx: { name: a.client, artist: a.artist, date: a.date, start: a.start }, phone: c && c.phone, onOpened: function () { a.remindedAt = Date.now(); S.commit(); after && after(); } });
  };
  OA.sendFollowUp = function (a, after) {
    var c = OA.client(a.clientId);
    return ui.message({ key: 'aftercare', ctx: { name: a.client, artist: a.artist }, phone: c && c.phone, onOpened: function () { act.followUpSent(a); after && after(); } });
  };

  /* A one-line description of an appointment for lists. */
  OA.apptFlags = function (a) {
    var flags = [], c = OA.client(a.clientId);
    if (a.status === 'cancelled') return [['quiet', 'Cancelled']];
    if (a.type !== 'consult' && a.status !== 'done' && a.status !== 'noshow') {
      if (a.deposit !== 'paid') flags.push(['warn', a.deposit === 'asked' ? 'Deposit not paid' : 'No deposit']);
      if (!c || !c.consentAt) flags.push(['warn', 'No consent form on file']);
    }
    if (a.sync && a.sync.state === 'failed') flags.push(['bad', 'Not on Google Calendar']);
    if (a.status === 'arrived') flags.push(['ok', 'In the chair']);
    if (a.status === 'done') flags.push(['ok', 'Done']);
    if (a.status === 'noshow') flags.push(['bad', 'No-show']);
    return flags;
  };
})();
