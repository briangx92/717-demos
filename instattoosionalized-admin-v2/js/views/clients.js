/* Clients: who they are, what is on file, and every visit. */
(function () {
  'use strict';
  var OA = window.OA, h = OA.h, S = OA.store, ui = OA.ui, act = OA.act;

  function visits(c) { return S.state.appts.filter(function (a) { return a.clientId === c.id; }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }); }
  function lastVisit(c) { var t = OA.todayISO(); var v = visits(c).filter(function (a) { return a.status === 'done'; })[0]; return v ? v.date : null; }
  function upcoming(c) { var t = OA.todayISO(); return visits(c).filter(function (a) { return a.date >= t && (a.status === 'booked' || a.status === 'arrived'); }).reverse()[0] || null; }

  function list(q) {
    var root = h('div', { class: 'page' }), all = OA.scopeClients(S.state.clients);
    root.appendChild(ui.pageHead('Clients', 'Everyone who has asked or booked. Consent and ID status live here.', [ui.btn('New appointment', function () { OA.apptDialog(null, {}).then(function (r) { if (r) OA.go('clients/' + r.clientId); }); }, 'primary')]));
    var search = ui.input(q.q || '', { type: 'search', placeholder: 'Search name or phone', 'aria-label': 'Search clients' });
    var missing = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: q.missing === '1' }), h('span', { text: 'Missing consent form' }));
    root.appendChild(h('div', { class: 'toolbar' }, search, missing));
    var body = h('div', { class: 'ledger', role: 'list' }); root.appendChild(body);
    function draw() {
      OA.clear(body);
      var term = search.value.trim().toLowerCase(), digs = OA.digits(term), only = missing.querySelector('input').checked;
      var rows = all.filter(function (c) {
        if (only && c.consentAt) return false;
        if (!term) return true;
        return c.name.toLowerCase().indexOf(term) >= 0 || (digs.length >= 3 && OA.digits(c.phone).indexOf(digs) >= 0);
      }).sort(function (a, b) { return a.name.localeCompare(b.name); });
      if (!rows.length) { body.appendChild(ui.empty(all.length ? 'No clients match' : 'No clients yet', all.length ? 'Try fewer letters, or clear the filter.' : 'Clients appear here when a request or appointment is added.')); return; }
      rows.forEach(function (c) {
        var lv = lastVisit(c), up = upcoming(c);
        body.appendChild(h('a', { class: 'ledger-row cli', href: '#/clients/' + c.id, role: 'listitem' },
          ui.avatar(c.name),
          h('div', { class: 'lr-main' }, h('strong', { text: c.name }), h('span', { text: c.phone ? OA.fmtPhone(c.phone) : 'No phone number' })),
          h('div', { class: 'lr-next', text: up ? 'Next: ' + OA.fmtDow(up.date) + ', ' + OA.fmtTime(up.start) : lv ? 'Last visit ' + OA.fmtShort(lv) : 'No visits yet' }),
          h('div', { class: 'lr-side' }, c.consentAt ? ui.chip('Consent on file', 'ok') : ui.chip('No consent form', 'warn'))));
      });
    }
    search.addEventListener('input', OA.debounce(draw, 120)); missing.querySelector('input').addEventListener('change', draw);
    draw(); return root;
  }

  function detail(id) {
    var c = OA.client(id);
    if (!c || OA.scopeClients([c]).length === 0) return ui.empty('That client is not here', 'The link may be old, or they belong to another artist.', ui.link('Back to clients', '#/clients', 'btn primary'));
    var root = h('div', { class: 'page' }), rer = OA.rerender;
    root.appendChild(h('nav', { class: 'crumbs' }, ui.link('Clients', '#/clients', 'link')));
    var actions = [];
    if (c.phone && OA.phoneOk(c.phone)) actions.push(h('a', { class: 'btn small', href: OA.telHref(c.phone), text: 'Call' }));
    actions.push(ui.btn('Write a text', function () { ui.message({ key: 'blank', ctx: { name: c.name }, phone: c.phone, title: 'Text ' + OA.first(c.name) }); }, 'small'));
    if (c.phone && OA.phoneOk(c.phone)) actions.push(ui.btn('Scan to call or text', function () {
      ui.dialog({ title: 'Call or text ' + OA.first(c.name) + ' from your phone', lead: 'On a computer? Scan a code with your phone\u2019s camera and finish there. Nothing is dialed or sent until you press the button on the phone.', wide: true,
        body: h('div', { class: 'qr-pair' },
          OA.qrPanel({ title: 'Scan to call from your phone', help: 'Your dialer opens with ' + OA.fmtPhone(c.phone) + ' filled in. You press call.', href: function () { return OA.telHref(c.phone); }, why: function () { return ''; } }),
          OA.qrPanel({ title: 'Scan to text from your phone', help: 'Messages opens to ' + OA.fmtPhone(c.phone) + ' with an empty message.', href: function () { return OA.smsHref(c.phone, ''); }, why: function () { return ''; } })),
        actions: [{ label: 'Close', kind: 'primary', value: null }] });
    }, 'small'));
    actions.push(ui.btn('New appointment', function () { OA.apptDialog(null, { client: c.name, phone: c.phone }).then(function (r) { if (r) rer(); }); }, 'small primary'));
    root.appendChild(ui.pageHead(c.name, c.phone ? OA.fmtPhone(c.phone) : 'No phone number on file', actions));

    var f = { name: ui.input(c.name), phone: OA.phoneInput(c.phone), email: ui.input(c.email, { type: 'email' }), notes: ui.area(c.notes, { rows: 4, placeholder: 'Allergies the client told you about, preferences, what to remember. Only the shop sees this.' }) };
    var saved = h('div', { class: 'saved', 'aria-live': 'polite' });
    function save() {
      var errs = [];
      if (!f.name.value.trim()) errs.push('A client needs a name.');
      if (f.phone.value && !OA.phoneOk(f.phone.value, c.phone)) errs.push(OA.PHONE_MSG);
      if (f.email.value && !/^\S+@\S+\.\S+$/.test(f.email.value)) errs.push('That email address does not look right.');
      if (errs.length) { saved.className = 'saved bad'; saved.textContent = errs[0] + ' Not saved.'; return; }
      act.saveClient(c, { name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), notes: f.notes.value });
      S.state.appts.forEach(function (a) { if (a.clientId === c.id) a.client = c.name; }); S.state.requests.forEach(function (r) { if (r.clientId === c.id) { r.name = c.name; if (c.phone) r.phone = c.phone; } }); S.commit();
      saved.className = 'saved'; saved.textContent = 'Saved';
    }
    Object.keys(f).forEach(function (k) { f[k].addEventListener('change', save); });
    var consent = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!c.consentAt, on: { change: function (e) { act.saveClient(c, { consentAt: e.target.checked ? Date.now() : null }); rer(); } } }), h('span', { text: c.consentAt ? 'Consent form on file since ' + OA.fmtStamp(c.consentAt) : 'Consent form signed and on file' }));
    var idc = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!c.idChecked, on: { change: function (e) { act.saveClient(c, { idChecked: e.target.checked }); rer(); } } }), h('span', { text: 'Photo ID checked (age 18+)' }));
    root.appendChild(h('div', { class: 'two' },
      h('section', { class: 'card' }, h('h2', { text: 'Contact' }), h('div', { class: 'form-grid' }, ui.field('Name', f.name), ui.field('Phone', f.phone), ui.field('Email', f.email, null, 'span2'), ui.field('Notes', f.notes, null, 'span2')), saved),
      h('section', { class: 'card' }, h('h2', { text: 'On file' }), consent, idc, h('p', { class: 'note', text: 'These tick boxes record what the shop has checked. The portal does not store the signed form or the ID itself.' }))));

    var tl = h('ol', { class: 'log wide' }), vs = visits(c);
    var reqs = S.state.requests.filter(function (r) { return r.clientId === c.id; });
    if (!vs.length && !reqs.length) tl.appendChild(h('li', {}, h('span', { text: 'No visits or requests yet.' })));
    vs.forEach(function (a) {
      tl.appendChild(h('li', {}, h('time', { text: OA.fmtLong(a.date) + ', ' + OA.fmtTime(a.start) }),
        h('span', {}, h('button', { type: 'button', class: 'link', text: (OA.APPT_TYPES[a.type] + (a.piece ? ': ' + a.piece : '')) + ' with ' + OA.chairName(a.artist), on: { click: function () { OA.apptDialog(a).then(function (r) { if (r) rer(); }); } } }), ' ', ui.chip(OA.APPT_STATUS[a.status], a.status === 'done' ? 'ok' : a.status === 'noshow' ? 'bad' : a.status === 'cancelled' ? 'quiet' : ''), a.price ? ' ' + a.price : '')));
    });
    reqs.forEach(function (r) { tl.appendChild(h('li', {}, h('time', { text: OA.fmtStamp(r.created) }), h('span', {}, h('a', { href: '#/requests/' + r.id, text: 'Request: ' + (r.idea || 'no details').slice(0, 70) }), ' ', ui.statusChip(r.status)))); });
    root.appendChild(ui.section('History', tl));
    return root;
  }

  OA.views.clients = {
    title: function (p) { var c = p[0] && OA.client(p[0]); return c ? c.name : 'Clients'; },
    render: function (parts, q) { return parts[0] ? detail(parts[0]) : list(q); }
  };
})();
