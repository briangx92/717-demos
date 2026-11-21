/* Settings: the words in texts, who can sign in, and the data itself. */
(function () {
  'use strict';
  var OA = window.OA, h = OA.h, S = OA.store, ui = OA.ui, act = OA.act;
  var TABS = [['messages', 'Messages'], ['people', 'People and roles'], ['integrations', 'Google Calendar'], ['data', 'Data and backup']];
  var VARS = ['first', 'shop', 'artist', 'quote', 'deposit', 'depositHow', 'date', 'time', 'address', 'reviewLink'];
  var ROLE = { owner: 'Shop owner', frontdesk: 'Front desk', artist: 'Artist' };

  function note(el, msg, bad) { el.className = 'saved' + (bad ? ' bad' : ''); el.textContent = msg; }

  function messages() {
    var set = S.state.settings, root = h('div', {}), saved = h('div', { class: 'saved', 'aria-live': 'polite' });
    var f = { dep: ui.input(set.depositAmount, { placeholder: '$40' }), how: ui.input(set.depositHow, { placeholder: 'e.g. Pay by Venmo @shop or at the counter.' }), rev: ui.input(set.reviewLink, { type: 'url', placeholder: 'https://g.page/r/...' }) };
    function save() {
      if (f.rev.value && !/^https?:\/\/\S+\.\S+/.test(f.rev.value)) { note(saved, 'The review link has to start with https://. Not saved.', true); return; }
      set.depositAmount = f.dep.value.trim(); set.depositHow = f.how.value.trim(); set.reviewLink = f.rev.value.trim(); S.commit(); note(saved, 'Saved');
    }
    Object.keys(f).forEach(function (k) { f[k].addEventListener('change', save); });
    root.appendChild(h('section', { class: 'card narrow' }, h('h2', { text: 'Deposit and review link' }), h('div', { class: 'form-grid' }, ui.field('Deposit amount', f.dep, 'Fills {deposit} in texts.'), ui.field('How clients pay it', f.how, 'Fills {depositHow}. The portal does not take payments.', 'span2'), ui.field('Google review link', f.rev, 'Fills {reviewLink}.', 'span2')), saved));
    var list = h('section', { class: 'card narrow' }, h('h2', { text: 'Text templates' }), h('p', { class: 'note', text: 'Blanks in curly braces fill in when you open a message: ' + VARS.map(function (v) { return '{' + v + '}'; }).join(' ') + '.' }));
    Object.keys(OA.TEMPLATES).filter(function (k) { return k !== 'blank'; }).forEach(function (k) {
      var ta = ui.area(set.templates[k] || OA.TEMPLATES[k].body, { rows: 3, 'aria-label': OA.TEMPLATES[k].name }), st = h('div', { class: 'saved', 'aria-live': 'polite' });
      ta.addEventListener('change', function () {
        var unknown = (ta.value.match(/\{(\w+)\}/g) || []).filter(function (t) { return VARS.indexOf(t.slice(1, -1)) < 0; });
        if (!ta.value.trim()) { note(st, 'A template cannot be empty. Not saved.', true); return; }
        if (unknown.length) { note(st, 'Unknown blank ' + unknown.join(', ') + '. It would show up as-is in the text. Not saved.', true); return; }
        set.templates[k] = ta.value.trim(); S.commit(); note(st, 'Saved');
      });
      list.appendChild(h('div', { class: 'tpl' }, ui.field(OA.TEMPLATES[k].name, ta), h('div', { class: 'row tight' }, ui.btn('Reset to the original', function () { set.templates[k] = OA.TEMPLATES[k].body; S.commit(); ta.value = OA.TEMPLATES[k].body; note(st, 'Reset'); }, 'small quiet'), st)));
    });
    root.appendChild(list); return root;
  }

  function people() {
    var root = h('section', { class: 'card' }, h('h2', { text: 'Who can sign in' }));
    root.appendChild(h('p', { class: 'note', text: 'Demo only: this list does not control anything yet. On the real portal, signing in uses an emailed one-time code, and only addresses on this list get in.' }));
    var owners = S.state.people.filter(function (p) { return p.role === 'owner'; }).length;
    var table = h('div', { class: 'ledger' });
    S.state.people.forEach(function (p) {
      var role = ui.select([['owner', ROLE.owner], ['frontdesk', ROLE.frontdesk], ['artist', ROLE.artist]], p.role, { 'aria-label': p.name + ' role' });
      role.addEventListener('change', function () {
        if (p.role === 'owner' && role.value !== 'owner' && owners <= 1) { ui.fail('There has to be at least one owner.'); role.value = 'owner'; return; }
        p.role = role.value; if (p.role !== 'artist') p.artist = ''; S.commit(); OA.rerender();
      });
      var art = p.role === 'artist' ? ui.select(OA.chairs().filter(function (c) { return c.slug !== 'piercing'; }).map(function (c) { return [c.slug, c.name]; }), p.artist, { 'aria-label': p.name + ' chair' }) : null;
      if (art) art.addEventListener('change', function () { p.artist = art.value; S.commit(); });
      table.appendChild(h('div', { class: 'ledger-row person' }, ui.avatar(p.name), h('div', { class: 'lr-main' }, h('strong', { text: p.name }), h('span', { text: p.email })), h('div', { class: 'row tight' }, role, art),
        ui.btn('Remove', function () {
          if (p.role === 'owner' && owners <= 1) { ui.fail('There has to be at least one owner.'); return; }
          ui.confirm('Remove ' + p.name + '?', p.email + ' will no longer be able to sign in once this is live.', 'Remove', true).then(function (ok) { if (ok) { S.state.people = S.state.people.filter(function (x) { return x !== p; }); S.commit(); OA.rerender(); } });
        }, 'small quiet')));
    });
    root.appendChild(table);
    var name = ui.input(''), em = ui.input('', { type: 'email' }), saved = h('div', { class: 'saved', 'aria-live': 'polite' });
    root.appendChild(h('h3', { text: 'Add someone' }));
    root.appendChild(h('div', { class: 'form-grid' }, ui.field('Name', name), ui.field('Email', em)));
    root.appendChild(h('div', { class: 'row' }, ui.btn('Add person', function () {
      if (!name.value.trim() || !/^\S+@\S+\.\S+$/.test(em.value)) { note(saved, 'Add a name and a valid email address.', true); return; }
      if (S.state.people.some(function (p) { return p.email.toLowerCase() === em.value.trim().toLowerCase(); })) { note(saved, 'That email is already on the list.', true); return; }
      S.state.people.push({ id: OA.uid('p'), name: name.value.trim(), email: em.value.trim(), role: 'frontdesk', artist: '' }); S.commit(); OA.rerender();
    }, 'primary'), saved));
    return root;
  }


  function integrations() {
    var g = OA.gcalSettings(), st = OA.gcal.status(), root = h('div', {});
    var head = h('section', { class: 'card narrow' }, h('h2', { text: 'Google Calendar' }), h('div', { class: 'row' }, ui.chip(st.text, 'quiet'), h('span', { class: 'note', text: 'Placeholder' })),
      h('p', { text: 'The plan is a one-way push: appointments added here show up as events in each artist\u2019s Google calendar, and changes or cancellations here update the same event. Nothing is read back from Google yet.' }),
      h('p', { class: 'note', text: st.reason }));
    var btn = ui.btn('Connect Google Calendar', function () { OA.gcal.connect().catch(function (e) { ui.fail(e.message); }); }, 'primary', { 'aria-describedby': 'gc-why' });
    head.appendChild(h('div', { class: 'row' }, btn, h('span', { id: 'gc-why', class: 'note', text: 'Not available in the demo. Signing in to Google has to happen on a server.' })));
    root.appendChild(head);

    var saved = h('div', { class: 'saved', 'aria-live': 'polite' }), card = h('section', { class: 'card narrow' }, h('h2', { text: 'Which calendar each chair uses' }), h('p', { class: 'note', text: 'Paste the calendar ID from Google Calendar settings, under Integrate calendar. These are saved now so setup is ready later. They are not used yet.' }));
    OA.chairs().forEach(function (c) {
      var inp = ui.input(g.calendars[c.slug] || '', { placeholder: 'e.g. abc123@group.calendar.google.com', 'aria-label': c.name + ' calendar ID' });
      inp.addEventListener('change', function () {
        var v = inp.value.trim();
        if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { note(saved, 'A calendar ID looks like name@group.calendar.google.com, or an email address. Not saved.', true); return; }
        g.calendars[c.slug] = v; S.commit(); note(saved, 'Saved. Not used until Google Calendar is connected.');
      });
      card.appendChild(ui.field(c.name, inp));
    });
    var detail = ui.select([['minimal', 'First name, last initial and type only'], ['full', 'Also include what is being done']], g.detail, { 'aria-label': 'What goes in the event' });
    detail.addEventListener('change', function () { g.detail = detail.value; S.commit(); note(saved, 'Saved. Not used until Google Calendar is connected.'); });
    card.appendChild(ui.field('What goes in each event', detail, 'Phone numbers, notes and deposit status are never sent. Calendars are often shared, and clients\u2019 details should stay in the portal.'));
    card.appendChild(saved); root.appendChild(card);

    var prev = ui.btn('Preview what would be sent', function () {
      var a = OA.scopeAppts(S.state.appts).filter(function (x) { return x.status !== 'cancelled' && x.date >= OA.todayISO(); }).sort(function (x, y) { return x.date < y.date ? -1 : 1; })[0];
      if (!a) { ui.fail('There is no upcoming appointment to preview.'); return; }
      ui.dialog({ title: 'Example calendar event', lead: 'This is the event for ' + a.client + '\u2019s next appointment. It is only shown here; nothing was sent.', body: h('pre', { class: 'code', text: JSON.stringify(OA.gcal.toEvent(a), null, 2) }), wide: true });
    }, '');
    root.appendChild(h('section', { class: 'card narrow' }, h('h2', { text: 'For the developer' }), h('p', { class: 'note', text: 'Server-side OAuth with the calendar.events scope. Each event carries the portal\u2019s appointment ID in a private extended property so a retry updates the event instead of duplicating it. If a push fails, the appointment must show a visible \u201cnot on Google Calendar\u201d flag, never a silent success. Details in this folder\u2019s README.' }), h('div', { class: 'row' }, prev)));
    return root;
  }

  function data() {
    var root = h('div', {}), size = 0; try { size = JSON.stringify(S.state).length; } catch (e) { size = 0; }
    var photos = h('span', { text: 'checking...' });
    OA.img.all().then(function (k) { photos.textContent = OA.plural(k.length, 'uploaded photo') + ' stored in this browser'; }).catch(function (e) { photos.textContent = 'Photo storage is not available here: ' + e.message; });
    root.appendChild(h('section', { class: 'card narrow' }, h('h2', { text: 'Where this data lives' }),
      h('p', { text: 'Demo mode: everything is kept in this browser only, about ' + Math.max(1, Math.round(size / 1024)) + ' KB of settings, requests, appointments and clients, plus ' }), h('p', {}, photos),
      h('p', { class: 'note', text: 'Clearing this site’s browser data, or using a different browser or device, starts from the sample data. The real portal keeps this in a shared database instead.' })));
    var saved = h('div', { class: 'saved', 'aria-live': 'polite' });
    var file = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr', id: 'restore', 'aria-label': 'Choose a backup file' });
    file.addEventListener('change', function () {
      var fl = file.files[0]; file.value = ''; if (!fl) return;
      var rd = new FileReader();
      rd.onerror = function () { note(saved, 'That file could not be read.', true); };
      rd.onload = function () {
        var st; try { st = JSON.parse(rd.result); } catch (e) { note(saved, 'That is not a valid backup file (it is not JSON). Nothing was changed.', true); return; }
        var okShape = st && st.v === 1 && st.site && st.published && ['requests', 'appts', 'clients', 'timeoff', 'people', 'history'].every(function (k) { return Array.isArray(st[k]); }) && st.settings && st.settings.templates;
        if (!okShape) { note(saved, 'That file is not a backup from this portal, or it is from a newer version. Nothing was changed.', true); return; }
        ui.confirm('Replace everything with this backup?', 'Your current data (' + S.state.requests.length + ' requests, ' + S.state.appts.length + ' appointments, ' + S.state.clients.length + ' clients) will be replaced by the backup (' + st.requests.length + ', ' + st.appts.length + ', ' + st.clients.length + '). Download a backup first if you might want it back.', 'Replace with backup', true).then(function (ok) {
          if (!ok) return; S.replace(st); note(saved, S.error ? S.error : 'Backup restored.', !!S.error); OA.rerender();
        });
      };
      rd.readAsText(fl);
    });
    root.appendChild(h('section', { class: 'card narrow' }, h('h2', { text: 'Backup' }),
      h('p', { text: 'A backup is one file with requests, appointments, clients, settings and the site draft.' }),
      h('p', { class: 'note', text: 'It does not include the photo files you uploaded here. Keep the originals.' }),
      h('div', { class: 'row wrap' }, ui.btn('Download backup', function () { OA.download('instattoosionalized-portal-backup-' + OA.todayISO() + '.json', JSON.stringify(S.state, null, 1)); ui.toast('Backup downloaded. Check your Downloads folder.'); }, 'primary'), h('label', { class: 'btn', for: 'restore', text: 'Restore from a backup' }), file), saved));
    root.appendChild(h('section', { class: 'card narrow' }, h('h2', { text: 'Demo controls' }),
      h('p', { text: 'Sample appointments and requests are dated around today. If you have not touched anything they refresh on their own each day.' }),
      h('div', { class: 'row wrap' }, ui.btn('Move sample data to today', function () { OA.refreshSamples(false); ui.toast('Sample requests and appointments re-dated around today. Anything you added is untouched.'); OA.rerender(); }),
        ui.btn('Reset the whole demo', function () { ui.confirm('Reset the demo?', 'Everything you entered here is erased and the sample data comes back. This cannot be undone.', 'Reset demo', true).then(function (ok) { if (ok) { S.reset(); ui.toast('Demo reset'); OA.go('today'); } }); }, 'danger-quiet'))));
    return root;
  }

  OA.views.settings = {
    title: function (p) { var t = TABS.filter(function (x) { return x[0] === (p[0] || 'messages'); })[0]; return 'Settings: ' + (t ? t[1] : 'Messages'); },
    render: function (parts) {
      var tab = parts[0] || 'messages', root = h('div', { class: 'page' });
      root.appendChild(ui.pageHead('Settings', null, null));
      var sub = h('nav', { class: 'subtabs', 'aria-label': 'Settings sections' });
      TABS.forEach(function (t) { sub.appendChild(ui.link(t[1], '#/settings/' + t[0], 'subtab' + (tab === t[0] ? ' on' : ''))); });
      root.appendChild(sub);
      var v = { messages: messages, people: people, integrations: integrations, data: data }[tab];
      root.appendChild(v ? v() : ui.empty('That section does not exist', null, ui.link('Messages', '#/settings/messages', 'btn primary')));
      return root;
    }
  };
})();
