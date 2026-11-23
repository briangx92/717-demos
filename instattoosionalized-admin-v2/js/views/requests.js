/* Requests: the pipeline from "someone asked" to "booked", with the next step spelled out at each stage. */
(function () {
  'use strict';
  var OA = window.OA, h = OA.h, S = OA.store, ui = OA.ui, act = OA.act;
  var CLOSE_REASONS = ['Not a fit for the shop', 'Went somewhere else', 'No response', 'Could not agree on price', 'Artist booked out', 'Client changed their mind'];

  function summary(r) {
    var bits = [];
    bits.push(r.kind === 'piercing' ? 'Piercing' : (r.size ? r.size + ' tattoo' : 'Tattoo'));
    if (r.place) bits.push(r.place.toLowerCase());
    return bits.join(', ');
  }
  function nextStep(r) {
    var a = r.apptId && OA.appt(r.apptId);
    switch (r.status) {
      case 'New': return 'Reply to ' + OA.first(r.name);
      case 'Contacted': return r.waitlist ? 'On the waitlist' : 'Send a quote or set a consult';
      case 'Consultation Scheduled': return a ? 'Consult ' + OA.fmtDow(a.date) + ', ' + OA.fmtTime(a.start) : 'Consult set';
      case 'Awaiting Deposit': return r.paidAt ? 'Deposit in. Book the session' : 'Waiting on the deposit' + (r.askedAt ? ' (asked ' + OA.ago(r.askedAt) + ')' : '');
      case 'Booked': return a ? 'Booked ' + OA.fmtDow(a.date) + ', ' + OA.fmtTime(a.start) : 'Booked';
      default: return r.closedReason || 'Closed';
    }
  }

  /* ---------- list ---------- */
  function list(q) {
    var s = S.state, all = OA.scopeReqs(s.requests), root = h('div', { class: 'page' });
    var status = q.status || '', artist = q.artist || '', wait = q.waitlist === '1';
    var counts = {}; OA.STATUSES.forEach(function (k) { counts[k] = all.filter(function (r) { return r.status === k; }).length; });
    var open = all.filter(function (r) { return r.status !== 'Closed' && r.status !== 'Booked'; }).length;
    root.appendChild(ui.pageHead('Requests', 'Every ask from the website form, calls and walk-ins, in order of what needs doing.', [ui.btn('Add a request', function () { OA.newRequestDialog().then(function (r) { if (r) OA.go('requests/' + r.id); }); }, 'primary')]));
    var feed = OA.api.status(), feedRow = h('div', { class: 'row tight feed' }, ui.chip(feed.text, feed.kind), feed.detail ? h('span', { class: 'note', text: feed.detail }) : null);
    if (OA.api.ready()) feedRow.appendChild(ui.btn('Check for new requests', function (ev) {
      var b = ev.currentTarget; b.disabled = true; b.textContent = 'Checking\u2026';
      OA.api.pull().then(function (r) { ui.toast(r.added ? OA.plural(r.added, 'new website request') + ' came in.' : 'No new requests from the website.'); }, function (e) { ui.fail(e.message); }).then(function () { OA.rerender(); });
    }, ''));
    root.appendChild(feedRow);
    var pips = h('nav', { class: 'pips', 'aria-label': 'Filter by stage' });
    function pip(label, val, n, extra) { pips.appendChild(h('a', { class: 'pip' + ((status === val && !wait) ? ' on' : ''), href: '#/requests' + OA.query(Object.assign({ status: val, artist: artist }, extra || {})), 'aria-current': (status === val && !wait) ? 'true' : null }, h('span', { text: label }), h('b', { text: String(n) }))); }
    pip('Needs action', '', open);
    OA.STATUSES.forEach(function (k) { pip(OA.STATUS_LABEL[k], k, counts[k]); });
    var wl = all.filter(function (r) { return r.waitlist && r.status !== 'Closed'; }).length;
    pips.appendChild(h('a', { class: 'pip' + (wait ? ' on' : ''), href: '#/requests' + OA.query({ waitlist: 1, artist: artist }) }, h('span', { text: 'Waitlist' }), h('b', { text: String(wl) })));
    root.appendChild(pips);

    var chairs = [['', 'Everyone']].concat(OA.chairs().filter(function (c) { return c.slug !== 'piercing'; }).map(function (c) { return [c.slug, c.name]; }));
    var sel = ui.select(chairs, artist, { 'aria-label': 'Filter by artist' });
    sel.addEventListener('change', function () { OA.go('requests' + OA.query({ status: status, artist: sel.value, waitlist: wait ? 1 : '' })); });
    var search = ui.input('', { type: 'search', placeholder: 'Search name, idea or place', 'aria-label': 'Search requests' });
    root.appendChild(h('div', { class: 'toolbar' }, OA.role.kind === 'artist' ? null : h('label', { class: 'inline' }, h('span', { text: 'Artist' }), sel), search));

    var body = h('div', { class: 'ledger', role: 'list' });
    root.appendChild(body);
    function draw() {
      OA.clear(body);
      var term = search.value.trim().toLowerCase();
      var rows = all.filter(function (r) {
        if (wait) { if (!r.waitlist || r.status === 'Closed') return false; }
        else if (status) { if (r.status !== status) return false; }
        else if (r.status === 'Closed' || r.status === 'Booked') return false;
        if (artist && r.artist !== artist) return false;
        if (term && [r.name, r.idea, r.place, r.phone].join(' ').toLowerCase().indexOf(term) < 0) return false;
        return true;
      }).sort(function (a, b) {
        if (a.status === 'New' && b.status !== 'New') return -1; if (b.status === 'New' && a.status !== 'New') return 1;
        return a.status === 'New' ? a.created - b.created : b.created - a.created;
      });
      if (!rows.length) {
        var filtered = term || artist || status || wait;
        body.appendChild(ui.empty(filtered ? 'No requests match' : 'No requests need action', filtered ? 'Try another stage, artist or search.' : 'New asks from the website form will show up here.', filtered ? ui.link('Clear filters', '#/requests', 'btn') : null));
        return;
      }
      rows.forEach(function (r) {
        body.appendChild(h('a', { class: 'ledger-row req st-' + r.status.toLowerCase().replace(/\s+/g, '-'), href: '#/requests/' + r.id, role: 'listitem' },
          ui.avatar(r.name),
          h('div', { class: 'lr-main' }, h('strong', { text: r.name }), h('span', { text: summary(r) + (r.artist ? ' · ' + OA.chairName(r.artist) : '') })),
          h('div', { class: 'lr-next', text: nextStep(r) }),
          h('div', { class: 'lr-side' }, ui.statusChip(r.status), h('span', { class: 'when', text: OA.ago(r.created) }))));
      });
    }
    search.addEventListener('input', OA.debounce(draw, 120));
    draw();
    return root;
  }

  /* ---------- detail ---------- */
  function detail(id) {
    var r = OA.req(id), root = h('div', { class: 'page' });
    if (!r) return ui.empty('That request is not here', 'It may have been removed, or the link is old.', ui.link('Back to requests', '#/requests', 'btn primary'));
    if (OA.role.kind === 'artist' && OA.scopeReqs([r]).length === 0) return ui.empty('That request belongs to another artist', null, ui.link('Back to requests', '#/requests', 'btn primary'));
    var rer = OA.rerender, c = OA.client(r.clientId);
    root.appendChild(h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, ui.link('Requests', '#/requests', 'link')));
    root.appendChild(ui.pageHead(r.name, summary(r) + (r.artist ? ' with ' + OA.chairName(r.artist) : '') + '. Came in ' + OA.ago(r.created) + '.', [ui.statusChip(r.status), c ? ui.link('Client record', '#/clients/' + c.id, 'btn quiet small') : null]));

    var grid = h('div', { class: 'two' });
    /* left: the details, saved as you go */
    var f = {
      name: ui.input(r.name), phone: OA.phoneInput(r.phone),
      kind: ui.select([['tattoo', 'Tattoo'], ['piercing', 'Piercing']], r.kind),
      artist: ui.select([['', 'No preference']].concat(OA.chairs().filter(function (x) { return x.slug !== 'piercing'; }).map(function (x) { return [x.slug, x.name]; })), r.artist),
      size: ui.select([['', 'Not sure'], ['Small', 'Small'], ['Medium', 'Medium'], ['Large', 'Large']], r.size), place: ui.input(r.place),
      idea: ui.area(r.idea, { rows: 4 }), note: ui.area(r.note, { rows: 3, placeholder: 'Only the shop sees this' })
    };
    var saved = h('div', { class: 'saved', 'aria-live': 'polite' });
    var timing = OA.timingField({ pref: r.pref, legacyText: r.pref ? '' : r.when, ignoreReqId: r.id, ignoreApptId: r.apptId, onChange: function () { save(); }, ctx: function () { return { artist: f.artist.value, kind: f.kind.value, size: f.size.value }; } });
    [f.artist, f.kind, f.size].forEach(function (x) { x.addEventListener('change', function () { timing.refresh(); }); });
    function save() {
      var errs = [];
      if (!f.name.value.trim()) errs.push('A request needs a name.');
      if (f.phone.value && !OA.phoneOk(f.phone.value, r.phone)) errs.push(OA.PHONE_MSG);
      if (timing.touched()) timing.validate().forEach(function (m) { errs.push(m); });
      if (errs.length) { saved.className = 'saved bad'; saved.textContent = errs[0] + ' Not saved.'; return; }
      var ch = act.updateReq(r, { name: f.name.value.trim(), phone: f.phone.value.trim(), kind: f.kind.value, artist: f.artist.value, size: f.size.value, place: f.place.value.trim(), idea: f.idea.value.trim(), when: timing.touched() ? timing.text() : r.when, pref: timing.touched() ? timing.get() : (r.pref || null), note: f.note.value }, null);
      saved.className = 'saved'; saved.textContent = ch ? 'Saved' : '';
      if (ch && c && f.phone.value && c.phone !== f.phone.value.trim()) { c.phone = f.phone.value.trim(); S.commit(); }
      if (ch) { OA.updateChrome(); }
    }
    Object.keys(f).forEach(function (k) { f[k].addEventListener('change', save); });
    grid.appendChild(h('section', { class: 'card' }, h('h2', { text: 'The request' }),
      h('div', { class: 'form-grid' }, ui.field('Name', f.name), ui.field('Phone', f.phone), ui.field('What', f.kind), ui.field('Artist', f.artist), ui.field('Size', f.size), ui.field('Where', f.place), ui.field('The idea', f.idea, null, 'span2'), ui.field('Best days or times', timing.el, null, 'span2'), ui.field('Shop notes', f.note, null, 'span2')), saved));

    /* right: what to do next */
    grid.appendChild(nextPanel(r, rer));
    root.appendChild(grid);

    /* reference art locker */
    root.appendChild(ui.section('Reference art', OA.refLocker(r)));

    /* history */
    var log = h('ol', { class: 'log' });
    r.log.forEach(function (e) { log.appendChild(h('li', {}, h('time', { text: OA.fmtStamp(e.t) }), h('span', { text: e.text }))); });
    root.appendChild(ui.section('History', log));
    return root;
  }

  function nextPanel(r, rer) {
    var box = h('section', { class: 'card next' }, h('h2', { text: 'Next step' })), a = r.apptId && OA.appt(r.apptId);
    function msg(key, extra) {
      var c = OA.client(r.clientId);
      return ui.message({ key: key, ctx: Object.assign({ name: r.name, artist: r.artist, quote: r.quote }, extra || {}), phone: r.phone || (c && c.phone), onOpened: function (text) {
        OA.logReq(r, 'Opened a text: ' + OA.TEMPLATES[key].name + '. The portal cannot see whether it was sent.');
        if (r.status === 'New') act.setStatus(r, 'Contacted', 'Text opened'); else S.commit();
        if (r.waitlist && key === 'waitlist') { r.waitlist = false; S.commit(); }
      } }).then(function (v) { if (v) rer(); });
    }
    function book(type) {
      var ex = r.pref && r.pref.mode === 'exact' && OA.validISO(r.pref.date) && r.pref.date >= OA.todayISO() ? { date: r.pref.date, start: r.pref.start } : {};
      OA.apptDialog(null, { type: type, artist: r.artist, client: r.name, phone: r.phone, pref: r.pref, date: ex.date, start: ex.start, piece: r.idea, price: type === 'consult' ? '' : r.quote, deposit: type === 'consult' ? 'none' : (r.paidAt ? 'paid' : r.askedAt ? 'asked' : 'none'), requestId: r.id }).then(function (ap) { if (ap && ap.id) { act.linkAppt(r, ap); rer(); } });
    }
    function apptBlock() {
      if (!a || a.status === 'cancelled') return null;
      return h('div', { class: 'apptbox' }, h('strong', { text: (a.type === 'consult' ? 'Consultation' : 'Session') + ': ' + OA.fmtLong(a.date) }), h('span', { text: OA.fmtRange(a.start, a.end) + ' with ' + OA.chairName(a.artist) }),
        h('div', { class: 'row tight' }, ui.btn('Change or cancel', function () { OA.apptDialog(a).then(function (x) { if (x) rer(); }); }, 'small'), ui.link('See on calendar', '#/calendar/' + a.date, 'btn small quiet')));
    }
    function quoteBlock() {
      var q = ui.input(r.quote, { placeholder: 'e.g. $140', 'aria-label': 'Quote' });
      var depo = OA.depositAmount();
      var wrap = h('div', {}, ui.field('Quote for the piece', q, depo ? 'The shop deposit in Settings is ' + depo + '.' : 'Set the shop deposit in Settings so the message can include it.'));
      wrap.appendChild(h('div', { class: 'row' },
        ui.btn(r.askedAt ? 'Resend quote and deposit message' : 'Write quote and deposit message', function () {
          if (!q.value.trim()) { ui.fail('Add the quote first. The message needs a price.'); q.focus(); return; }
          var quote = q.value.trim(), c = OA.client(r.clientId);
          ui.message({ key: 'quote', ctx: { name: r.name, artist: r.artist, quote: quote }, phone: r.phone || (c && c.phone), onOpened: function () { act.markAsked(r, quote); } }).then(function (v) { if (v) rer(); });
        }, 'primary')));
      return wrap;
    }
    function closeBtn() { return ui.btn('Close this request', function () { closeDialog(r, rer); }, 'quiet small danger-quiet'); }

    var p = function (t) { return h('p', { text: t }); };
    switch (r.status) {
      case 'New':
        box.appendChild(p('Reply first. Most clients choose the shop that answers fastest.'));
        box.appendChild(h('div', { class: 'row wrap' }, ui.btn('Text: got your request', function () { msg('ack'); }, 'primary'), ui.btn('Text: ask for details', function () { msg('details'); }), ui.btn('I already replied (called or messaged)', function () { act.setStatus(r, 'Contacted', 'Replied outside the portal'); rer(); }, 'quiet')));
        break;
      case 'Contacted':
        box.appendChild(p('Get what you need (photos, placement, ideas), then quote it or set a consultation.'));
        box.appendChild(h('div', { class: 'row wrap' }, ui.btn('Text: ask for details', function () { msg('details'); }), ui.btn('Set up a consultation', function () { book('consult'); })));
        box.appendChild(h('hr'));
        box.appendChild(quoteBlock());
        if (r.waitlist) box.appendChild(h('div', { class: 'row' }, ui.btn('Text: books are open', function () { msg('waitlist'); }, ''), ui.btn('Take off the waitlist', function () { r.waitlist = false; OA.logReq(r, 'Taken off the waitlist'); S.commit(); rer(); }, 'quiet')));
        break;
      case 'Consultation Scheduled':
        box.appendChild(apptBlock() || p('The consultation was cancelled.'));
        box.appendChild(p('After the consult, quote the piece and ask for the deposit.'));
        box.appendChild(quoteBlock());
        break;
      case 'Awaiting Deposit':
        if (!r.paidAt) {
          box.appendChild(p('Quote ' + (r.quote || 'not set') + '. Asked ' + (r.askedAt ? OA.ago(r.askedAt) : 'not yet') + '. When the deposit lands, mark it so the booking is protected.'));
          box.appendChild(h('div', { class: 'row wrap' }, ui.btn('Deposit received', function () { act.markPaid(r); ui.toast('Deposit marked as received', { action: { label: 'Undo', run: function () { act.undoPaid(r); rer(); } } }); rer(); }, 'primary')));
          box.appendChild(h('hr')); box.appendChild(quoteBlock());
        } else {
          box.appendChild(h('div', { class: 'ok-line' }, ui.chip('Deposit received ' + OA.ago(r.paidAt), 'ok'), ui.btn('Not actually paid', function () { act.undoPaid(r); rer(); }, 'quiet small')));
          box.appendChild(p('Pick the day and time for the session.'));
          box.appendChild(h('div', { class: 'row' }, ui.btn('Book the session', function () { book('session'); }, 'primary')));
        }
        break;
      case 'Booked':
        box.appendChild(apptBlock() || p('The appointment was cancelled.'));
        var cons = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!r.consentAt, on: { change: function (e) { act.setConsent(r, e.target.checked); rer(); } } }), h('span', { text: r.consentAt ? 'Consent form on file (' + OA.fmtStamp(r.consentAt) + ')' : 'Consent form signed and on file' }));
        box.appendChild(cons);
        if (a && a.status !== 'cancelled') box.appendChild(h('div', { class: 'row wrap' }, ui.btn('Text: booking confirmation', function () { msg('confirm', { date: a.date, start: a.start, artist: a.artist }); }, 'primary'), ui.btn('Text: reminder', function () { OA.sendReminder(a, rer); })));
        break;
      default:
        box.appendChild(p('Closed: ' + (r.closedReason || 'no reason given') + '.'));
        box.appendChild(h('div', { class: 'row' }, ui.btn('Reopen', function () { act.reopen(r); rer(); }, 'primary')));
    }
    if (r.status !== 'Closed') box.appendChild(h('div', { class: 'row end' }, closeBtn()));
    return box;
  }

  function closeDialog(r, rer) {
    var sel = ui.select(CLOSE_REASONS, CLOSE_REASONS[0]);
    var decline = h('label', { class: 'check' }, h('input', { type: 'checkbox' }), h('span', { text: 'Open a polite decline text next' }));
    ui.dialog({ title: 'Close this request?', lead: 'It leaves the pipeline but stays in the history. You can reopen it.', body: h('div', {}, ui.field('Why', sel), decline), actions: [{ label: 'Keep it', kind: 'quiet', value: null }, { label: 'Close request', kind: 'danger', run: function () { act.closeReq(r, sel.value); return { reason: sel.value, decline: decline.querySelector('input').checked }; } }] }).then(function (v) {
      if (!v) return; rer();
      ui.toast('Request closed', { action: { label: 'Undo', run: function () { act.reopen(r); rer(); } } });
      if (v.decline) { var c = OA.client(r.clientId); ui.message({ key: 'decline', ctx: { name: r.name }, phone: r.phone || (c && c.phone), onOpened: function () { OA.logReq(r, 'Opened a text: polite decline'); S.commit(); } }); }
    });
  }

  OA.views.requests = {
    title: function (p) { var r = p[0] && OA.req(p[0]); return r ? r.name : 'Requests'; },
    render: function (parts, q) { return parts[0] ? detail(parts[0]) : list(q); }
  };
})();
