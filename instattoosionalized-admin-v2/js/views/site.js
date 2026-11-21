/* Site: the public website's hours, banner, announcements, prices, services, policies and reviews. Edits are a draft until published. */
(function () {
  'use strict';
  var OA = window.OA, h = OA.h, S = OA.store, ui = OA.ui, act = OA.act;
  var TABS = [['hours', 'Hours and contact'], ['banner', 'Banner'], ['announcements', 'Announcements'], ['prices', 'Prices'], ['services', 'Services'], ['policies', 'Policies'], ['reviews', 'Reviews'], ['publish', 'Publish']];

  function draftNote(el, msg, bad) { el.className = 'saved' + (bad ? ' bad' : ''); el.textContent = msg; }
  var SAVED = 'Saved to the draft. Not on the live site until you publish.';

  /* ---------- hours + contact ---------- */
  function hours(site) {
    var saved = h('div', { class: 'saved', 'aria-live': 'polite' }), rows = h('div', { class: 'hours' });
    site.hours.forEach(function (d) {
      var on = h('input', { type: 'checkbox', checked: !!d.open, 'aria-label': d.day + ' open' }), o = ui.input(d.open || '12:00', { type: 'time', 'aria-label': d.day + ' opens' }), c = ui.input(d.close || '17:00', { type: 'time', 'aria-label': d.day + ' closes' });
      var row = h('div', { class: 'hrow' }, h('label', { class: 'check hday' }, on, h('span', { text: d.day })), h('div', { class: 'times' }, o, h('span', { text: 'to' }), c), h('span', { class: 'closed-tag', text: 'Closed' }));
      function sync() { row.classList.toggle('shut', !on.checked); o.disabled = c.disabled = !on.checked; }
      function save() {
        if (on.checked && OA.mins(c.value) <= OA.mins(o.value)) { draftNote(saved, d.day + ' has to close after it opens. Not saved.', true); return; }
        d.open = on.checked ? o.value : null; d.close = on.checked ? c.value : null; S.commit(); draftNote(saved, SAVED); sync();
      }
      [on, o, c].forEach(function (x) { x.addEventListener('change', save); }); sync(); rows.appendChild(row);
    });
    var shop = site.shop, f = { phone: OA.phoneInput(shop.phone), street: ui.input(shop.street), town: ui.input(shop.town), region: ui.input(shop.region), zip: ui.input(shop.zip), facebook: ui.input(shop.facebook, { type: 'url', placeholder: 'https://facebook.com/...' }) };
    var saved2 = h('div', { class: 'saved', 'aria-live': 'polite' });
    function saveShop() {
      var errs = [];
      if (!OA.phoneOk(f.phone.value, shop.phone)) errs.push(OA.PHONE_MSG);
      if (!f.street.value.trim() || !f.town.value.trim()) errs.push('The address needs a street and a town.');
      if (f.facebook.value && !/^https?:\/\/\S+\.\S+/.test(f.facebook.value)) errs.push('The Facebook link has to start with https://');
      if (errs.length) { draftNote(saved2, errs[0] + ' Not saved.', true); return; }
      shop.phone = f.phone.value.trim(); shop.street = f.street.value.trim(); shop.town = f.town.value.trim(); shop.region = f.region.value.trim(); shop.zip = f.zip.value.trim(); shop.facebook = f.facebook.value.trim();
      S.commit(); draftNote(saved2, SAVED);
    }
    Object.keys(f).forEach(function (k) { f[k].addEventListener('change', saveShop); });
    return h('div', { class: 'two' },
      h('section', { class: 'card' }, h('h2', { text: 'Opening hours' }), h('p', { class: 'note', text: 'These show on the site and on the contact page. Closed days are skipped when the portal picks the next open day.' }), rows, saved),
      h('section', { class: 'card' }, h('h2', { text: 'Contact' }), h('div', { class: 'form-grid' }, ui.field('Phone', f.phone, null, 'span2'), ui.field('Street', f.street, null, 'span2'), ui.field('Town', f.town), ui.field('State', f.region), ui.field('ZIP', f.zip), ui.field('Facebook page', f.facebook, null, 'span2')), saved2));
  }

  /* ---------- banner ---------- */
  function banner(site) {
    var b = site.banner, saved = h('div', { class: 'saved', 'aria-live': 'polite' });
    var on = h('input', { type: 'checkbox', checked: b.on }), text = ui.area(b.text, { rows: 2, maxlength: 140, placeholder: 'e.g. Closed Thursday for a convention. Back Friday at noon.' }), s = ui.input(b.start, { type: 'date' }), e = ui.input(b.end, { type: 'date' });
    var count = h('div', { class: 'hint' }), prev = h('div', { class: 'banner-prev' });
    function paint() { count.textContent = text.value.length + ' of 140 characters'; OA.clear(prev); if (on.checked && text.value.trim()) prev.appendChild(h('div', { class: 'bp', text: text.value.trim() })); else prev.appendChild(h('span', { class: 'note', text: on.checked ? 'Add a message to see the preview.' : 'The banner is off.' })); }
    function save() {
      if (on.checked && !text.value.trim()) { draftNote(saved, 'The banner is on but has no message. Not saved.', true); paint(); return; }
      if (s.value && e.value && e.value < s.value) { draftNote(saved, 'The end date is before the start date. Not saved.', true); return; }
      b.on = on.checked; b.text = text.value.trim(); b.start = s.value; b.end = e.value; S.commit(); draftNote(saved, SAVED); paint();
    }
    [on, text, s, e].forEach(function (x) { x.addEventListener('change', save); }); text.addEventListener('input', paint); paint();
    return h('section', { class: 'card narrow' }, h('h2', { text: 'Site banner' }), h('p', { class: 'note', text: 'A short notice across the top of every page: holidays, closures, walk-in days.' }),
      h('label', { class: 'check' }, on, h('span', { text: 'Show the banner' })), ui.field('Message', text), count, h('div', { class: 'form-grid' }, ui.field('Start showing', s, 'Optional'), ui.field('Stop showing', e, 'Optional. Leave blank to keep it up until you turn it off.')), h('h3', { text: 'Preview' }), prev, saved);
  }

  /* ---------- announcements ---------- */
  function announcements(site) {
    var list = site.announcements, root = h('div', {});
    root.appendChild(h('section', { class: 'card narrow' }, h('h2', { text: 'Announcements' }),
      h('p', { class: 'note', text: 'Short notices near the top of the home page: a closure, a guest artist, a flash day. Each one shows from its start date to its end date. Leave the end date blank to keep it up until you remove it. The site shows up to 3 at a time, pinned ones first.' })));
    if (!list.length) root.appendChild(ui.empty('No announcements yet', 'Add one when the shop has something visitors should see before they ask.'));
    list.forEach(function (a, i) {
      var saved = h('div', { class: 'saved', 'aria-live': 'polite' }), L = OA.LIMITS;
      var kind = ui.select(OA.ANN_KINDS, a.kind, { 'aria-label': 'Kind' }), title = ui.input(a.title, { maxlength: L.annTitle, 'aria-label': 'Title', placeholder: 'e.g. Closed for the Allentown convention' });
      var body = ui.area(a.body, { rows: 3, maxlength: L.annBody, 'aria-label': 'Message', placeholder: 'A sentence or two. Plain text only.' });
      var link = ui.input(a.link, { type: 'url', maxlength: L.annLink, 'aria-label': 'Link', placeholder: 'https://' });
      var start = ui.input(a.start, { type: 'date', 'aria-label': 'Start showing' }), end = ui.input(a.end, { type: 'date', 'aria-label': 'Stop showing' });
      var pin = h('input', { type: 'checkbox', checked: !!a.pinned }), count = h('div', { class: 'hint' }), chip = h('span', {});
      function paint() {
        count.textContent = body.value.length + ' of ' + L.annBody + ' characters';
        var st = OA.annStatus({ start: start.value, end: end.value }, OA.todayISO()), c = ui.chip(st === 'live' ? 'Showing now' : st === 'soon' ? 'Starts ' + OA.fmtShort(start.value) : 'Ended', st === 'live' ? 'ok' : st === 'soon' ? 'warn' : '');
        chip.className = c.className; chip.textContent = c.textContent;
      }
      function save() {
        var d = { id: a.id, kind: kind.value, title: title.value.trim(), body: body.value.trim(), link: link.value.trim(), start: start.value, end: end.value, pinned: pin.checked };
        var p = d.title ? OA.annProblem(d) : '';
        if (p) { draftNote(saved, p + ' Not saved.', true); return; }
        Object.assign(a, d); S.commit(); OA.updateChrome(); paint();
        draftNote(saved, d.title ? SAVED : 'Saved to the draft. Add a title before you publish.');
      }
      [kind, title, body, link, start, end, pin].forEach(function (x) { x.addEventListener('change', save); });
      body.addEventListener('input', paint); paint();
      root.appendChild(h('section', { class: 'card narrow ann' },
        h('div', { class: 'row' }, h('h3', { text: a.title || 'New announcement' }), chip),
        h('div', { class: 'form-grid' }, ui.field('Kind', kind), ui.field('Title', title, null, 'span2'), ui.field('Message', body, null, 'span2'), count,
          ui.field('Link', link, 'Optional. Has to start with https://', 'span2'), ui.field('Start showing', start), ui.field('Stop showing', end, 'Optional')),
        h('label', { class: 'check' }, pin, h('span', { text: 'Pin to the top' })),
        h('div', { class: 'row' }, ui.btn('Remove', function () { list.splice(i, 1); S.commit(); OA.updateChrome(); OA.rerender(); }, 'small quiet'), saved)));
    });
    root.appendChild(ui.btn('Add an announcement', function () {
      if (list.length >= OA.LIMITS.annMax) { ui.fail('That is the most the site can hold (' + OA.LIMITS.annMax + '). Remove one first.'); return; }
      list.push({ id: OA.uid('an'), kind: 'notice', title: '', body: '', link: '', start: OA.todayISO(), end: '', pinned: false }); S.commit(); OA.updateChrome(); OA.rerender();
    }, 'primary'));
    return root;
  }

  /* ---------- prices ---------- */
  function prices(site) {
    var root = h('div', {}), saved = h('div', { class: 'saved', 'aria-live': 'polite' });
    function save() { S.commit(); draftNote(saved, SAVED); OA.updateChrome(); }
    site.prices.forEach(function (g) {
      var card = h('section', { class: 'card narrow' }, h('h2', { text: g.group }));
      if (g.sample) {
        var ok = h('input', { type: 'checkbox' });
        ok.addEventListener('change', function () { if (ok.checked) { g.sample = false; save(); OA.rerender(); } });
        card.appendChild(h('div', { class: 'sample-warn' }, h('strong', { text: 'Sample prices.' }), h('span', { text: ' 717 Digital Studio put these in as placeholders. Replace them with the shop’s real prices before publishing.' }), h('label', { class: 'check' }, ok, h('span', { text: 'These prices are correct' }))));
      }
      var rows = h('div', { class: 'price-rows' });
      g.items.forEach(function (it, i) {
        var n = ui.input(it[0], { 'aria-label': 'Service' }), p = ui.input(it[1], { 'aria-label': 'Price', placeholder: '$80' });
        function upd() { if (!n.value.trim() || !p.value.trim()) { draftNote(saved, 'Each price needs a name and an amount. Not saved.', true); return; } it[0] = n.value.trim(); it[1] = p.value.trim(); save(); }
        n.addEventListener('change', upd); p.addEventListener('change', upd);
        rows.appendChild(h('div', { class: 'prow' }, n, p, ui.btn('Remove', function () { g.items.splice(i, 1); save(); OA.rerender(); }, 'small quiet')));
      });
      card.appendChild(rows);
      card.appendChild(ui.btn('Add a price', function () { g.items.push(['New item', '$0']); save(); OA.rerender(); }, 'small'));
      root.appendChild(card);
    });
    root.appendChild(saved);
    return root;
  }

  /* ---------- services ---------- */
  function services(site) {
    var saved = h('div', { class: 'saved', 'aria-live': 'polite' }), root = h('section', { class: 'card narrow' }, h('h2', { text: 'Services people can ask about' }), h('p', { class: 'note', text: 'These are the choices on the website’s request form.' }));
    function save() { S.commit(); draftNote(saved, SAVED); OA.updateChrome(); }
    site.services.forEach(function (sv, i) {
      var n = ui.input(sv.name, { 'aria-label': 'Name' }), b = ui.input(sv.blurb, { 'aria-label': 'Short description' }), fam = ui.select([['tattoo', 'Tattoo'], ['piercing', 'Piercing']], sv.family, { 'aria-label': 'Kind' });
      function upd() { if (!n.value.trim()) { draftNote(saved, 'A service needs a name. Not saved.', true); return; } sv.name = n.value.trim(); sv.blurb = b.value.trim(); sv.family = fam.value; save(); }
      [n, b, fam].forEach(function (x) { x.addEventListener('change', upd); });
      root.appendChild(h('div', { class: 'srow' }, fam, n, b, ui.btn('Remove', function () { site.services.splice(i, 1); save(); OA.rerender(); }, 'small quiet')));
    });
    root.appendChild(ui.btn('Add a service', function () { site.services.push({ id: OA.uid('sv'), family: 'tattoo', name: 'New service', blurb: '' }); save(); OA.rerender(); }, 'small'));
    root.appendChild(saved); return root;
  }

  /* ---------- policies ---------- */
  function policies(site) {
    var p = site.policies, saved = h('div', { class: 'saved', 'aria-live': 'polite' });
    var f = { deposit: ui.area(p.deposit, { rows: 3, maxlength: OA.LIMITS.policy }), age: ui.area(p.age, { rows: 3, maxlength: OA.LIMITS.policy, placeholder: 'e.g. Clients must be 18 or older with a valid photo ID.' }), aftercare: ui.area(p.aftercare, { rows: 4, maxlength: OA.LIMITS.policy, placeholder: 'A few lines on caring for a new tattoo or piercing.' }) };
    Object.keys(f).forEach(function (k) { f[k].addEventListener('change', function () { p[k] = f[k].value.trim(); S.commit(); draftNote(saved, SAVED); OA.updateChrome(); }); });
    return h('section', { class: 'card narrow' }, h('h2', { text: 'Policies on the site' }), h('p', { class: 'note', text: 'Shown on the Policies page and in the Good to know box on the homepage. Blank boxes do not show. Say only what the shop actually does. A blank line starts a new paragraph.' }), ui.field('Deposit', f.deposit, 'The deposit amount used in texts is set under Settings, Messages.'), ui.field('Age and ID', f.age), ui.field('Aftercare', f.aftercare), saved);
  }

  /* ---------- reviews ---------- */
  function reviews(site) {
    var root = h('section', { class: 'card narrow' }, h('h2', { text: 'Review quotes' })), saved = h('div', { class: 'saved', 'aria-live': 'polite' });
    root.appendChild(h('p', { class: 'note', text: 'Only add reviews real people wrote, word for word, with their permission or from a public review. The site shows the star rating from Google separately.' }));
    function save() { S.commit(); draftNote(saved, SAVED); OA.updateChrome(); }
    site.quotes.forEach(function (qt, i) {
      var t = ui.area(qt.text, { rows: 2, 'aria-label': 'Review text' }), who = ui.input(qt.who, { 'aria-label': 'Who wrote it', placeholder: 'First name and initial' });
      function upd() { if (!t.value.trim()) { draftNote(saved, 'A review quote cannot be empty. Not saved.', true); return; } qt.text = t.value.trim(); qt.who = who.value.trim(); save(); }
      t.addEventListener('change', upd); who.addEventListener('change', upd);
      root.appendChild(h('div', { class: 'qrow' }, t, who, ui.btn('Remove', function () { site.quotes.splice(i, 1); save(); OA.rerender(); }, 'small quiet')));
    });
    if (!site.quotes.length) root.appendChild(ui.empty('No review quotes yet', 'Add a few from the shop’s Google or Facebook reviews.'));
    root.appendChild(ui.btn('Add a review quote', function () { site.quotes.push({ id: OA.uid('q'), text: 'New review', who: '' }); save(); OA.rerender(); }, 'small'));
    var rt = S.state.settings.rating, stars = ui.input(rt.stars, { type: 'number', min: 0, max: 5, step: 0.1, 'aria-label': 'Star rating' }), cnt = ui.input(rt.count, { type: 'number', min: 0, step: 1, 'aria-label': 'Number of reviews' });
    var rs = h('div', { class: 'saved', 'aria-live': 'polite' });
    function saveRating() {
      var s = parseFloat(stars.value), c = parseInt(cnt.value, 10);
      if (!(s >= 0 && s <= 5) || !(c >= 0)) { draftNote(rs, 'Stars go from 0 to 5, and the count has to be a whole number. Not saved.', true); return; }
      rt.stars = s; rt.count = c; S.commit(); draftNote(rs, 'Saved. This is only used in the portal for now.');
    }
    stars.addEventListener('change', saveRating); cnt.addEventListener('change', saveRating);
    root.appendChild(saved);
    return h('div', {}, root, h('section', { class: 'card narrow' }, h('h2', { text: 'Google rating' }), h('p', { class: 'note', text: 'Copy these from the shop’s Google listing now and then. The portal cannot look them up.' }), h('div', { class: 'form-grid' }, ui.field('Stars', stars), ui.field('Number of reviews', cnt)), rs));
  }

  /* ---------- publish ---------- */
  function publish() {
    var root = h('div', {}), ch = OA.pendingChanges(), bl = OA.publishBlockers(), owner = OA.role.kind === 'owner';
    var pub = S.state.published;
    root.appendChild(h('p', { class: 'sub', text: 'Last published ' + OA.fmtStamp(pub.at) + ' by ' + pub.by + '.' }));
    if (!ch.length) root.appendChild(ui.empty('Nothing waiting to publish', 'The live site matches the draft. Changes you make on the other Site tabs and on Artists appear here first.'));
    else {
      var by = {}, order = [];
      ch.forEach(function (c) { if (!by[c.area]) { by[c.area] = []; order.push(c.area); } by[c.area].push(c); });
      var card = h('section', { class: 'card' }, h('h2', { text: OA.plural(ch.length, 'change') + ' waiting' }));
      order.forEach(function (area) {
        var ul = h('ul', { class: 'diff' }); by[area].forEach(function (c) { ul.appendChild(h('li', { text: c.text })); });
        card.appendChild(h('div', { class: 'diff-group' }, h('div', { class: 'dg-title' }, h('h3', { text: area }), owner ? ui.btn('Discard these', function () {
          ui.confirm('Discard ' + area.toLowerCase() + ' changes?', 'The draft goes back to what is live. This cannot be undone.', 'Discard', true).then(function (ok) { if (ok) { act.discard(by[area][0].key); ui.toast(area + ' changes discarded'); OA.rerender(); } });
        }, 'small quiet') : null), ul));
      });
      if (bl.length) card.appendChild(h('div', { class: 'blockers', role: 'alert' }, h('strong', { text: 'Fix these before publishing:' }), h('ul', {}, bl.map(function (b) { return h('li', { text: b }); }))));
      var row = h('div', { class: 'row' });
      if (owner) {
        var btn = ui.btn('Publish ' + OA.plural(ch.length, 'change'), function () {
          var r = act.publish('Shop owner'); if (!r.ok) { ui.fail(r.reason); return; }
          OA.gcImages && OA.gcImages();
          ui.toast('Published ' + OA.plural(r.count, 'change') + '. The demo website in this browser now shows the banner and announcements. The real site is not touched.'); OA.rerender();
        }, 'primary', bl.length ? { disabled: 'disabled' } : {});
        row.appendChild(btn); row.appendChild(ui.btn('Discard everything', function () { ui.confirm('Discard all draft changes?', 'The draft goes back to what is live. This cannot be undone.', 'Discard all', true).then(function (ok) { if (ok) { act.discard(); ui.toast('Draft reset to the live version'); OA.rerender(); } }); }, 'quiet danger-quiet'));
      } else row.appendChild(h('p', { class: 'note', text: 'Only the shop owner can publish.' }));
      row.appendChild(OA.previewLink('btn'));
      card.appendChild(row);
      card.appendChild(h('p', { class: 'note', text: 'Demo: publishing updates the public demo website in this browser, for the banner and announcements only. Hours, prices, services and the rest stay as they are until the real publish path is built. Nothing reaches the real site. Preview site changes opens the demo website with your draft banner and announcements in a new tab. Visitors never see a preview. On the real portal, one publish rebuilds the site once, however many edits are in it.' }));
      root.appendChild(card);
    }
    var hist = S.state.history;
    if (hist.length) {
      var ol = h('ol', { class: 'log wide' });
      hist.slice(0, 10).forEach(function (e) { ol.appendChild(h('li', {}, h('time', { text: OA.fmtStamp(e.at) }), h('span', {}, h('strong', { text: e.by + ' published ' + OA.plural(e.summary.length, 'change') + '. ' }), e.summary.slice(0, 4).join('; ') + (e.summary.length > 4 ? '; and ' + (e.summary.length - 4) + ' more' : '')))); });
      root.appendChild(ui.section('Publish history', ol));
    }
    return root;
  }

  OA.views.site = {
    title: function (p) { var t = TABS.filter(function (x) { return x[0] === (p[0] || 'hours'); })[0]; return 'Site: ' + (t ? t[1] : 'Hours and contact'); },
    render: function (parts) {
      var tab = parts[0] || 'hours', known = TABS.some(function (t) { return t[0] === tab; });
      var root = h('div', { class: 'page' }), n = OA.pendingChanges().length;
      root.appendChild(ui.pageHead('Site', 'What the public website says. Edit freely: nothing goes live until you publish.', [OA.previewLink('btn small')]));
      var sub = h('nav', { class: 'subtabs', 'aria-label': 'Site sections' });
      TABS.forEach(function (t) { sub.appendChild(ui.link(t[1] + (t[0] === 'publish' && n ? ' (' + n + ')' : ''), '#/site/' + t[0], 'subtab' + (tab === t[0] ? ' on' : ''))); });
      root.appendChild(sub);
      if (!known) { root.appendChild(ui.empty('That section does not exist', null, ui.link('Hours and contact', '#/site/hours', 'btn primary'))); return root; }
      var s = S.state.site, view = { hours: hours, banner: banner, announcements: announcements, prices: prices, services: services, policies: policies, reviews: reviews }[tab];
      root.appendChild(tab === 'publish' ? publish() : view(s));
      return root;
    }
  };
})();
