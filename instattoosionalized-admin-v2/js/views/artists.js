/* Artists: roster, profile, and portfolio. Edits go to the draft site; nothing is live until it is published. */
(function () {
  'use strict';
  var OA = window.OA, h = OA.h, S = OA.store, ui = OA.ui, act = OA.act;
  var SECTIONS = ['', 'Color', 'Black and grey', 'Cover-ups', 'Lettering', 'Flash', 'Healed', 'Before & after'];

  function canEditProfile(slug) { return OA.role.kind === 'owner' || (OA.role.kind === 'artist' && OA.role.slug === slug); }
  function canOpen(slug) { return OA.role.kind !== 'artist' || OA.role.slug === slug; }
  function counts(slug) { var it = OA.items(slug); return { on: it.filter(function (p) { return p.onSite; }).length, off: it.filter(function (p) { return !p.onSite; }).length }; }
  function pendingFor(slug) { return OA.pendingChanges().filter(function (c) { return c.key === 'artists' || c.key === 'portfolio'; }).filter(function (c) { var a = OA.artist(slug); return a && c.text.indexOf(OA.first(a.name) + ':') === 0; }).length; }
  function booksText(a) { return a.books === 'open' ? 'Books open' : 'Booked out' + (a.until ? ' until ' + OA.fmtShort(a.until) : ''); }

  /* Soft delete: the artist leaves the draft site, photos and records are
     kept, and Restore on the Artists list brings them back. Owner only. */
  function removeArtist(a) {
    var up = OA.appt && S.state.appts.filter(function (x) { return x.artist === a.slug && x.date >= OA.todayISO() && x.status === 'booked'; }).length;
    ui.confirm('Remove ' + OA.nick(a) + '?', (up ? OA.plural(up, 'upcoming appointment') + ' with them will show on Today as needing a new artist until you reassign or cancel each one. ' : '') + 'The page and chair leave the draft site. Photos are kept, and you can restore them from the Artists list. Nothing is live until you publish.', 'Remove artist', true).then(function (ok) {
      if (!ok) return;
      a.removedAt = Date.now(); S.commit();
      ui.toast(OA.nick(a) + ' removed from the draft', { action: { label: 'Undo', run: function () { a.removedAt = null; S.commit(); OA.rerender(); } } });
      if (location.hash.indexOf('#/artists/' + a.slug) === 0) OA.go('artists'); else OA.rerender();
    });
  }

  /* ---------- roster ---------- */
  function roster() {
    var root = h('div', { class: 'page' }), arts = S.state.site.artists.filter(function (a) { return !a.removedAt && canOpen(a.slug); });
    root.appendChild(ui.pageHead('Artists', 'Who is on the website, whether their books are open, and their portfolios.', OA.role.kind === 'owner' ? [ui.btn('Add an artist', addArtist, 'primary')] : null));
    var list = h('div', { class: 'artists' });
    arts.forEach(function (a) {
      var n = counts(a.slug), unsaved = pendingFor(a.slug);
      list.appendChild(h('article', { class: 'artist-card' + (a.visible ? '' : ' hidden-page') },
        OA.img.el(a.portrait, OA.first(a.name) + ' portrait', 'portrait'),
        h('div', { class: 'ac-main' },
          h('h2', {}, h('a', { href: '#/artists/' + a.slug + '/profile', text: OA.nick(a) })),
          h('p', { class: 'sub', text: a.role + (a.ig ? ' · @' + a.ig : '') }),
          h('div', { class: 'chips' }, ui.chip(booksText(a), a.books === 'open' ? 'ok' : 'warn'), a.visible ? null : ui.chip('Page hidden from the site', 'quiet'), unsaved ? ui.chip(OA.plural(unsaved, 'unpublished change'), 'draft') : null),
          h('p', { class: 'sub', text: OA.plural(n.on, 'photo') + ' on the site' + (n.off ? ', ' + n.off + ' hidden' : '') })),
        h('div', { class: 'row end wrap' }, ui.link('Portfolio', '#/artists/' + a.slug + '/portfolio', 'btn small'), ui.link('Profile', '#/artists/' + a.slug + '/profile', 'btn small primary'), OA.role.kind === 'owner' ? ui.btn('Remove', function () { removeArtist(a); }, 'small danger-quiet') : null)));
    });
    if (!arts.length) list.appendChild(ui.empty('No artists yet', 'Add the first artist to give them a page and a chair.'));
    root.appendChild(list);
    var gone = S.state.site.artists.filter(function (a) { return a.removedAt && OA.role.kind === 'owner'; });
    if (gone.length) root.appendChild(ui.section('Removed', gone.map(function (a) { return h('div', { class: 'row' }, h('span', { text: a.name }), ui.btn('Restore', function () { a.removedAt = null; S.commit(); ui.toast(OA.nick(a) + ' restored to the draft'); OA.rerender(); }, 'small')); })));
    return root;
  }
  function addArtist() {
    var name = ui.input('', { required: true, autofocus: true }), role = ui.input('Tattoo');
    ui.dialog({ title: 'Add an artist', lead: 'They get a profile page and a chair on the calendar once you publish.', body: h('div', { class: 'form-grid' }, ui.field('Name', name, 'As it should show on the site.'), ui.field('What they do', role)), actions: [{ label: 'Cancel', kind: 'quiet', value: null }, { label: 'Add artist', kind: 'primary', run: function () {
      var n = name.value.trim(); if (!n) return { error: 'Add a name.' };
      var slug = OA.slug(OA.first(n)), k = 2; while (OA.artist(slug) || slug === 'piercing') slug = OA.slug(OA.first(n)) + '-' + (k++);
      S.state.site.artists.push({ slug: slug, name: n, role: role.value.trim() || 'Tattoo', ig: '', socials: [], bio: '', portrait: '', books: 'open', until: '', visible: false, removedAt: null });
      S.state.site.portfolio[slug] = []; S.commit(); return slug;
    } }] }).then(function (slug) { if (slug) { ui.toast('Artist added. Their page stays hidden until you are ready.'); OA.go('artists/' + slug + '/profile'); } });
  }

  /* ---------- artist page shell ---------- */
  function page(slug, tab) {
    var a = OA.artist(slug);
    if (!a || a.removedAt) return ui.empty('That artist is not here', null, ui.link('Back to artists', '#/artists', 'btn primary'));
    if (!canOpen(slug)) return ui.empty('You can only open your own page', null, ui.link('Back to artists', '#/artists', 'btn primary'));
    var root = h('div', { class: 'page' });
    root.appendChild(h('nav', { class: 'crumbs' }, ui.link('Artists', '#/artists', 'link')));
    root.appendChild(ui.pageHead(OA.nick(a), a.role + '. ' + booksText(a) + '.', null));
    root.appendChild(h('nav', { class: 'subtabs', 'aria-label': OA.nick(a) + ' sections' }, ui.link('Profile', '#/artists/' + slug + '/profile', 'subtab' + (tab === 'profile' ? ' on' : '')), ui.link('Portfolio (' + counts(slug).on + ' on site)', '#/artists/' + slug + '/portfolio', 'subtab' + (tab === 'portfolio' ? ' on' : ''))));
    root.appendChild(tab === 'portfolio' ? portfolio(a) : profile(a));
    return root;
  }

  function profile(a) {
    var edit = canEditProfile(a.slug), saved = h('div', { class: 'saved', 'aria-live': 'polite' });
    var f = {
      name: ui.input(a.name, { disabled: !edit, maxlength: OA.LIMITS.artistName }), role: ui.input(a.role, { disabled: !edit, maxlength: OA.LIMITS.artistRole }),
      bio: ui.area(a.bio, { rows: 9, disabled: !edit, maxlength: OA.LIMITS.artistBio }),
      books: ui.select([['open', 'Open'], ['closed', 'Booked out']], a.books), until: ui.input(a.until, { type: 'date' }), visible: h('input', { type: 'checkbox', checked: a.visible, disabled: !edit })
    };
    function mark(msg, bad) { saved.className = 'saved' + (bad ? ' bad' : ''); saved.textContent = msg; }
    function save() {
      if (!f.name.value.trim()) { mark('The name cannot be empty. Not saved.', true); return; }
      if (f.books.value === 'closed' && f.until.value && !OA.validISO(f.until.value)) { mark('Pick a valid date. Not saved.', true); return; }
      if (edit) { a.name = f.name.value.trim(); a.role = f.role.value.trim(); a.bio = f.bio.value.trim(); a.visible = f.visible.checked; }
      a.books = f.books.value; a.until = f.books.value === 'closed' ? f.until.value : ''; a.untilSample = false;
      S.commit(); mark('Saved to the draft. Not on the live site until you publish.');
      untilField.hidden = f.books.value !== 'closed';
    }
    var untilField = ui.field('Booked out until', f.until, 'Shows on the site so people know when to ask again.'); untilField.hidden = a.books !== 'closed';
    Object.keys(f).forEach(function (k) { f[k].addEventListener('change', save); });
    var portraitBox = h('div', { class: 'portrait-edit' }, OA.img.el(a.portrait, 'Current main photo', 'portrait big'));
    var up = h('input', { type: 'file', accept: 'image/*', class: 'sr', 'aria-label': 'Choose a new main photo', on: { change: function () {
      var file = up.files[0]; if (!file) return;
      OA.img.compress(file, 1000).then(OA.img.put).then(function (id) { a.portrait = id; S.commit(); ui.toast('Main photo changed in the draft'); OA.rerender(); }).catch(function (e) { ui.fail(e.message); });
    } } });
    var left = h('section', { class: 'card' }, h('h2', { text: 'On the website' }), h('div', { class: 'form-grid' }, ui.field('Name', f.name, 'Nicknames in quotes are fine.', 'span2'), ui.field('What they do', f.role, null, 'span2'), ui.field('Bio', f.bio, 'Plain paragraphs. A blank line starts a new paragraph.', 'span2')), saved);
    var right = h('div', {}, h('section', { class: 'card' }, h('h2', { text: 'Books' }), h('div', { class: 'form-grid' }, ui.field('Taking new clients', f.books, null, null, 'Open: the website offers this artist in the request form. Booked out: the site shows them as booked out instead, with the date below, so people know when to ask again.'), untilField)),
      h('section', { class: 'card' }, h('h2', { text: 'Main photo' }), portraitBox, edit ? h('label', { class: 'btn small', for: 'portrait-up', text: 'Replace photo' }) : null, edit ? (up.id = 'portrait-up', up) : null),
      h('section', { class: 'card' }, h('h2', { text: 'Page' }), h('label', { class: 'check' }, f.visible, h('span', { text: 'Show this artist’s page on the site' })),
        edit && OA.role.kind === 'owner' ? h('div', { class: 'row' }, ui.btn('Remove this artist', function () { removeArtist(a); }, 'danger-quiet small')) : null));
    if (!edit) left.appendChild(h('p', { class: 'note', text: 'Only the owner or this artist can change the profile. You can change whether their books are open.' }));
    return h('div', { class: 'two' }, h('div', {}, left, socialsCard()), h('div', {}, right, scheduleCard()));

    function scheduleCard() {
      var n = OA.notify(a.slug), label = OA.NOTIFY_MODES.filter(function (m) { return m[0] === n.mode; })[0][1];
      return h('section', { class: 'card' }, h('h2', { text: 'Their schedule' }), h('p', { text: 'Hears about appointments: ' + label + '.' }),
        OA.NOTIFY_LIVE[n.mode] ? null : h('p', { class: 'hint warn', text: OA.NOTIFY_WHY }),
        h('div', { class: 'row' }, ui.btn('Send schedule', function () { OA.sendScheduleDialog(a.slug); }, 'small'), ui.link('Change how', '#/settings/integrations', 'btn small quiet')));
    }

    /* Social links: any platform, any number up to the limit. Each row saves on its own and says why when it cannot. */
    function socialsCard() {
      var list = h('div', { class: 'socials' }), msg = h('div', { class: 'saved', 'aria-live': 'polite' });
      function note(t, bad) { msg.className = 'saved' + (bad ? ' bad' : ''); msg.textContent = t; }
      function persist() { a.ig = OA.igOf(a.socials); S.commit(); OA.updateChrome(); }
      function dupOf(p, url, skip) { return a.socials.some(function (y, j) { var n = OA.socialNorm(y.p, y.h); return j !== skip && y.p === p && n.ok && n.url.toLowerCase() === url.toLowerCase(); }); }
      function row(x, i) {
        var sel = ui.select(OA.SOCIALS.map(function (q) { return [q.p, q.p]; }), x.p, { 'aria-label': 'Platform', disabled: !edit });
        var inp = ui.input(x.h, { 'aria-label': x.p + ' handle or link', disabled: !edit });
        function change() {
          var n = OA.socialNorm(sel.value, inp.value);
          if (!n.ok) { note(n.msg + ' Not saved.', true); return; }
          if (dupOf(sel.value, n.url, i)) { note(sel.value + ' ' + n.label + ' is already listed. Not saved.', true); return; }
          x.p = sel.value; x.h = n.h; inp.value = n.h; persist(); note('Saved to the draft. Not on the live site until you publish.');
        }
        sel.addEventListener('change', change); inp.addEventListener('change', change);
        return h('div', { class: 'social-row' }, sel, inp, edit ? ui.btn('Remove', function () { a.socials.splice(i, 1); persist(); paint(); note('Removed from the draft. Not on the live site until you publish.'); }, 'small quiet') : null);
      }
      function paint() {
        OA.clear(list);
        if (!a.socials.length) list.appendChild(h('p', { class: 'hint', text: 'No social links yet.' }));
        a.socials.forEach(function (x, i) { list.appendChild(row(x, i)); });
      }
      paint();
      var card = h('section', { class: 'card' }, h('h2', { text: 'Social media' }),
        h('p', { class: 'note', text: 'Shown as buttons on ' + OA.nick(a) + '’s page. Paste a handle or a link. Up to ' + OA.SOCIAL_MAX + ' links.' }), list);
      if (edit) {
        var sel2 = ui.select(OA.SOCIALS.map(function (q) { return [q.p, q.p]; }), 'TikTok', { 'aria-label': 'Platform for a new link' });
        var inp2 = ui.input('', { 'aria-label': 'Handle or link for a new link', placeholder: OA.socialSpec('TikTok').ph });
        sel2.addEventListener('change', function () { inp2.placeholder = OA.socialSpec(sel2.value).ph; });
        function add() {
          if (a.socials.length >= OA.SOCIAL_MAX) { note('That is the most links the page can hold (' + OA.SOCIAL_MAX + '). Remove one first.', true); return; }
          var n = OA.socialNorm(sel2.value, inp2.value);
          if (!n.ok) { note(n.msg + ' Not added.', true); return; }
          if (dupOf(sel2.value, n.url, -1)) { note(sel2.value + ' ' + n.label + ' is already listed. Not added.', true); return; }
          a.socials.push({ id: OA.uid('so'), p: sel2.value, h: n.h }); persist(); inp2.value = ''; paint();
          note('Added to the draft. Not on the live site until you publish.');
        }
        inp2.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } });
        card.appendChild(h('div', { class: 'social-row social-add' }, sel2, inp2, ui.btn('Add link', add, 'small')));
      }
      card.appendChild(msg);
      return card;
    }
  }

  /* ---------- portfolio ---------- */
  function portfolio(a) {
    var slug = a.slug, root = h('div', {}), grid = h('div', { class: 'tiles' }), info = h('p', { class: 'sub', 'aria-live': 'polite' }), filter = 'all', dragId = null;
    var fileIn = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'sr', id: 'ph-up', 'aria-label': 'Choose photos to add' });
    function add(files) {
      var n = files.length; if (!n) return;
      var t = ui.toast('Adding ' + OA.plural(n, 'photo') + '...');
      act.addPhotos(slug, files).then(function (r) {
        t(); r.failed.forEach(function (x) { ui.fail(x.msg); });
        if (r.added) ui.toast(OA.plural(r.added, 'photo') + ' added, hidden until you show them and add a caption.');
        OA.rerender();
      }).catch(function (e) { t(); ui.fail('Photos could not be saved: ' + e.message); });
    }
    fileIn.addEventListener('change', function () { add(Array.prototype.slice.call(fileIn.files)); fileIn.value = ''; });
    var drop = h('label', { class: 'dropzone', for: 'ph-up' }, h('strong', { text: 'Add photos' }), h('span', { text: 'Drop images here or choose them. They are resized and stay hidden until you show them.' }));
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0) { e.preventDefault(); drop.classList.add('over'); } }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); add(Array.prototype.slice.call(e.dataTransfer.files || [])); });
    var seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Show' });
    [['all', 'All'], ['on', 'On the site'], ['off', 'Hidden']].forEach(function (o) { seg.appendChild(h('button', { type: 'button', class: 'seg-b' + (o[0] === filter ? ' on' : ''), 'data-f': o[0], text: o[1], on: { click: function () { filter = o[0]; OA.$$('.seg-b', seg).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-f') === filter); }); draw(); } } })); });
    root.appendChild(h('div', { class: 'toolbar' }, drop, fileIn, seg)); root.appendChild(info); root.appendChild(grid);

    function tile(p, idx, all) {
      var cap = ui.input(p.cap, { placeholder: 'Describe the piece', 'aria-label': 'Caption' }), sec = ui.select((SECTIONS.indexOf(p.sec) >= 0 ? SECTIONS : SECTIONS.concat([p.sec])).map(function (x) { return [x, x || 'No section']; }), p.sec, { 'aria-label': 'Section' });
      var show = h('input', { type: 'checkbox', checked: p.onSite, 'aria-label': 'Show on the site' });
      var el = h('article', { class: 'tile' + (p.onSite ? '' : ' off'), draggable: 'true', 'data-id': p.id });
      var media = p.pair ? h('div', { class: 'pair' }, OA.img.el(p.pair.b, 'Before'), OA.img.el(p.pair.a, 'After'), h('span', { class: 'pair-tag', text: 'Before and after' })) : OA.img.el(p.src, p.cap || 'Portfolio photo');
      show.addEventListener('change', function () {
        if (show.checked && !cap.value.trim()) { show.checked = false; ui.fail('Add a caption before showing this photo. Captions are what search engines and screen readers read.'); cap.focus(); return; }
        p.onSite = show.checked; S.commit(); el.classList.toggle('off', !p.onSite); counts_(); OA.updateChrome();
      });
      cap.addEventListener('change', function () { p.cap = cap.value.trim(); if (!p.cap && p.onSite) { p.onSite = false; show.checked = false; el.classList.add('off'); ui.toast('Hidden again, because a shown photo needs a caption.'); } S.commit(); counts_(); OA.updateChrome(); });
      sec.addEventListener('change', function () { p.sec = sec.value; S.commit(); OA.updateChrome(); });
      el.addEventListener('dragstart', function (e) { dragId = p.id; el.classList.add('drag'); try { e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move'; } catch (x) { /* some browsers need this wrapped */ } });
      el.addEventListener('dragend', function () { dragId = null; el.classList.remove('drag'); });
      el.addEventListener('dragover', function (e) { if (dragId && dragId !== p.id) { e.preventDefault(); el.classList.add('over'); } });
      el.addEventListener('dragleave', function () { el.classList.remove('over'); });
      el.addEventListener('drop', function (e) { e.preventDefault(); el.classList.remove('over'); if (dragId && dragId !== p.id) { act.reorder(slug, dragId, p.id); OA.rerender(); } });
      var fnIn = ui.input(p.fileName || '', { placeholder: 'hello-kitty-jason-mask-tattoo.jpg', 'aria-label': 'File name for the site' });
      var fnRow = h('label', { class: 'fnrow' }, h('span', { text: 'File name' }), fnIn);
      if (!p.fileName) fnRow.style.display = 'none';
      fnIn.addEventListener('change', function () { p.fileName = fnIn.value.trim(); S.commit(); OA.updateChrome(); });
      var aiBtn = (OA.api && OA.api.ready()) ? ui.btn('Describe with AI', function () {
        aiBtn.disabled = true; var old = aiBtn.textContent; aiBtn.textContent = 'Describing...';
        OA.api.describe(p).then(function (r) {
          cap.value = r.description; p.cap = r.description;
          if (r.fileName) { p.fileName = r.fileName; fnIn.value = r.fileName; fnRow.style.display = ''; }
          S.commit(); counts_(); OA.updateChrome();
          ui.toast('AI drafted the description. Read it over, it is yours to edit.');
        }).catch(function (e) { ui.fail(e.message); }).then(function () { aiBtn.disabled = false; aiBtn.textContent = old; });
      }, 'small') : null;
      var tools = h('div', { class: 'row tight wrap' },
        aiBtn,
        ui.btn('Earlier', function () { act.moveBy(slug, p.id, -1); OA.rerender(); }, 'small quiet', idx === 0 ? { disabled: 'disabled' } : {}),
        ui.btn('Later', function () { act.moveBy(slug, p.id, 1); OA.rerender(); }, 'small quiet', idx === all.length - 1 ? { disabled: 'disabled' } : {}),
        p.pair ? ui.btn('Split pair', function () { act.splitPair(slug, p.id); OA.rerender(); }, 'small quiet') : (all[idx + 1] && !all[idx + 1].pair ? ui.btn('Pair with next', function () {
          var nx = all[idx + 1]; if (!nx || nx.pair) return; var r = act.makePair(slug, p.id, nx.id); if (r) { ui.toast('Paired as before and after'); OA.rerender(); }
        }, 'small quiet') : null),
        ui.btn('Delete', function () { var rec = act.removePhoto(slug, p.id); if (!rec) return; ui.toast('Photo deleted from the draft', { action: { label: 'Undo', run: function () { act.restorePhoto(slug, rec); OA.rerender(); } } }); OA.rerender(); }, 'small danger-quiet'));
      el.appendChild(media);
      el.appendChild(h('div', { class: 'tile-body' }, h('label', { class: 'check' }, show, h('span', { text: 'Show on the site' })), cap, fnRow, sec, tools));
      return el;
    }
    function counts_() { var n = counts(slug); info.textContent = OA.plural(n.on, 'photo') + ' on the site, ' + n.off + ' hidden. Drag tiles to reorder, or use Earlier and Later. Order here is the order on the site.'; }
    function draw() {
      OA.clear(grid); counts_();
      var all = OA.items(slug).slice().sort(function (x, y) {
        var da = x.date || '', db = y.date || '';
        if (da && db && da !== db) return da < db ? 1 : -1;
        if (da && !db) return -1;
        if (!da && db) return 1;
        return (x.ord || 0) - (y.ord || 0);
      });
      var rows = all.filter(function (p) { return filter === 'all' || (filter === 'on' ? p.onSite : !p.onSite); });
      if (!rows.length) { grid.appendChild(ui.empty(all.length ? 'Nothing in this view' : 'No photos yet', all.length ? 'Switch the filter above.' : 'Add the first photos with the box above.')); return; }
      rows.forEach(function (p) { grid.appendChild(tile(p, all.indexOf(p), all)); });
    }
    draw();
    return root;
  }

  OA.views.artists = {
    title: function (p) { var a = p[0] && OA.artist(p[0]); return a ? OA.nick(a) : 'Artists'; },
    render: function (parts) { return parts[0] ? page(parts[0], parts[1] === 'portfolio' ? 'portfolio' : 'profile') : roster(); }
  };
})();
