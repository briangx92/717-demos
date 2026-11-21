/* Shell: sign-in, role, tabs, routing. Each tab has its own address, so Back, refresh and shared links all work. */
(function () {
  'use strict';
  var OA = window.OA, h = OA.h, S = OA.store, ui = OA.ui;
  var SESSION = 'oa2:session', THEME = 'oa2:theme';
  var TABS = [
    { key: 'today', label: 'Today' }, { key: 'requests', label: 'Requests' }, { key: 'calendar', label: 'Calendar' },
    { key: 'clients', label: 'Clients' }, { key: 'artists', label: 'Artists' }, { key: 'analytics', label: 'Analytics' }, { key: 'site', label: 'Site' }, { key: 'settings', label: 'Settings' }
  ];
  var PERMS = { today: 1, requests: 1, calendar: 1, clients: 1, artists: 1, analytics: 'owner', site: 'owner', settings: 'owner' };
  var main, nav, chrome = {}, current = { parts: [], q: {} }, firstRender = true;

  OA.can = function (tab) { var p = PERMS[tab]; return p === 1 || p === OA.role.kind; };
  OA.go = function (path, replace) {
    var target = '#/' + path.replace(/^#?\/?/, '');
    if (location.hash === target) { OA.rerender(); return; }
    if (replace) location.replace(target); else location.hash = target;
  };
  OA.href = function (path) { return '#/' + path; };

  function readSession() { try { return JSON.parse(sessionStorage.getItem(SESSION)); } catch (e) { return null; } }
  function writeSession(s) { try { if (s) sessionStorage.setItem(SESSION, JSON.stringify(s)); else sessionStorage.removeItem(SESSION); } catch (e) { /* private mode: the role lasts until reload */ } }
  OA.setRole = function (kind, slug) { OA.role = { kind: kind, slug: slug || '' }; writeSession(OA.role); };

  function parseHash() {
    var raw = location.hash.replace(/^#\/?/, ''), qi = raw.indexOf('?'), q = {};
    if (qi >= 0) { raw.slice(qi + 1).split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); }); raw = raw.slice(0, qi); }
    var parts = raw.split('/').filter(Boolean).map(decodeURIComponent);
    return { parts: parts, q: q };
  }
  OA.query = function (obj) { var s = Object.keys(obj).filter(function (k) { return obj[k] !== '' && obj[k] != null; }).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]); }).join('&'); return s ? '?' + s : ''; };

  /* ---------- sign-in (demo) ---------- */
  function signIn() {
    var shop = S.state.site.shop;
    document.title = 'Sign in | ' + shop.short + ' portal';
    OA.clear(document.body.querySelector('#app'));
    var chooser = h('div', { class: 'signin-roles' });
    [['owner', '', 'Shop owner', 'Everything, including the site and settings'], ['frontdesk', '', 'Front desk', 'Requests, calendar, clients'], ['artist', 'lex', 'Lex', 'Her own chair, clients and portfolio'], ['artist', 'liv', 'Liv', 'Her own chair, clients and portfolio'], ['artist', 'diana', 'Diana', 'Her own chair, clients and portfolio']].forEach(function (r) {
      chooser.appendChild(h('button', { type: 'button', class: 'role-btn', on: { click: function () { OA.setRole(r[0], r[1]); start(); } } }, h('strong', { text: r[2] }), h('span', { text: r[3] })));
    });
    document.querySelector('#app').appendChild(h('div', { class: 'signin' },
      h('img', { class: 'signin-logo', src: '../instattoosionalized-logo.jpg', alt: '' }),
      h('h1', { text: shop.name }),
      h('p', { class: 'lead', text: 'Owner portal' }),
      h('div', { class: 'demo-note' }, h('strong', { text: 'This is a demo.' }), h('span', { text: ' There are no passwords here. Pick who you want to try it as. On the real portal, people sign in with an emailed one-time code and only see what their role allows.' })),
      chooser));
  }

  /* ---------- chrome ---------- */
  function buildChrome() {
    var app = document.querySelector('#app'); OA.clear(app);
    var shop = S.state.site.shop;
    chrome.err = h('div', { class: 'bar bad', role: 'alert', hidden: true });
    chrome.demo = h('div', { class: 'bar demo' }, h('span', { text: 'Demo. Changes stay in this browser. Nothing here texts a client, emails anyone, or touches the live website.' }));
    chrome.publish = h('a', { class: 'btn publish', href: '#/site/publish', hidden: true });
    chrome.who = ui.select([], '', { 'aria-label': 'Preview as' });
    [['owner:', 'Shop owner'], ['frontdesk:', 'Front desk']].concat(S.state.site.artists.filter(function (a) { return !a.removedAt; }).map(function (a) { return ['artist:' + a.slug, OA.nick(a)]; })).forEach(function (o) { chrome.who.appendChild(h('option', { value: o[0], text: o[1] })); });
    chrome.who.addEventListener('change', function () {
      var p = chrome.who.value.split(':'); OA.setRole(p[0], p[1]);
      var parts = parseHash().parts; if (!parts.length || !OA.can(parts[0])) location.hash = '#/today'; else OA.rerender(); updateChrome();
    });
    var theme = ui.btn('Dark', function () { var d = document.documentElement.getAttribute('data-theme') === 'dark'; setTheme(d ? 'light' : 'dark'); }, 'quiet small', { 'aria-pressed': 'false' }); chrome.theme = theme;
    var out = ui.btn('Sign out', function () { writeSession(null); OA.role = null; location.hash = ''; start(); }, 'quiet small');
    nav = h('nav', { class: 'tabs', 'aria-label': 'Portal sections' });
    TABS.forEach(function (t) { var a = h('a', { class: 'tab', href: '#/' + t.key, 'data-tab': t.key }, h('span', { text: t.label }), h('span', { class: 'badge', hidden: true })); nav.appendChild(a); });
    main = h('main', { id: 'main', tabindex: '-1' });
    app.appendChild(h('a', { class: 'skip', href: '#main', text: 'Skip to content', on: { click: function (e) { e.preventDefault(); main.focus(); } } }));
    app.appendChild(chrome.demo); app.appendChild(chrome.err);
    app.appendChild(h('header', { class: 'top' },
      h('div', { class: 'top-in' },
        h('a', { class: 'brand', href: '#/today' }, h('img', { src: '../instattoosionalized-logo.jpg', alt: '' }), h('span', { class: 'brand-name' }, h('b', { text: shop.short || shop.name }), h('i', { text: 'Owner portal' }))),
        h('div', { class: 'top-tools' }, chrome.publish, h('label', { class: 'who' }, h('span', { text: 'Preview as' }), chrome.who), theme, out)),
      nav));
    app.appendChild(main);
    syncTheme();
  }
  function setTheme(t) { try { localStorage.setItem(THEME, t); } catch (e) { /* theme just won't persist */ } syncTheme(); }
  function syncTheme() {
    var t; try { t = localStorage.getItem(THEME); } catch (e) { t = null; }
    if (!t) t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    if (chrome.theme) { chrome.theme.textContent = t === 'dark' ? 'Light mode' : 'Dark mode'; chrome.theme.setAttribute('aria-pressed', String(t === 'dark')); }
  }
  function updateChrome() {
    if (!main) return;
    chrome.who.value = OA.role.kind + ':' + OA.role.slug;
    if (!chrome.who.value) chrome.who.value = 'owner:';
    OA.$$('.tab', nav).forEach(function (a) {
      var k = a.getAttribute('data-tab'), ok = OA.can(k); a.hidden = !ok;
      var b = OA.$('.badge', a), n = 0;
      if (k === 'requests') n = OA.scopeReqs(S.state.requests).filter(function (r) { return r.status === 'New'; }).length;
      b.hidden = !n; b.textContent = n || ''; b.setAttribute('aria-label', n + ' new');
    });
    var pend = OA.role.kind === 'owner' ? OA.pendingChanges().length : 0;
    chrome.publish.hidden = !pend; chrome.publish.textContent = 'Publish ' + OA.plural(pend, 'change');
    chrome.err.hidden = !S.error; chrome.err.textContent = S.error || '';
  }
  OA.updateChrome = updateChrome;

  /* ---------- routing ---------- */
  OA.rerender = function () { render(true); };
  function render(keepScroll) {
    var r = parseHash(), tab = r.parts[0];
    current = r;
    if (!tab) { location.replace('#/today'); return; }
    if (!PERMS[tab]) { show('Not found', ui.empty('That page does not exist', 'The address may be old or mistyped.', ui.link('Go to Today', '#/today', 'btn primary'))); markTab(''); return; }
    if (!OA.can(tab)) { show('No access', ui.empty('This section is for the shop owner', 'You are previewing as ' + roleLabel() + '. Switch the preview to the owner to open it.', ui.link('Back to Today', '#/today', 'btn primary'))); markTab(''); return; }
    var v = OA.views[tab], y = window.scrollY, node;
    try { node = v.render(r.parts.slice(1), r.q); } catch (e) {
      console.error(e);
      node = ui.empty('This page hit an error', 'Nothing was lost. Reload the page. If it happens again, tell 717 Digital Studio what you clicked: ' + (e && e.message), ui.btn('Reload', function () { location.reload(); }, 'primary'));
    }
    show(v.title ? v.title(r.parts.slice(1)) : tab, node, keepScroll ? y : 0);
    markTab(tab); updateChrome();
  }
  function roleLabel() { return OA.role.kind === 'owner' ? 'the shop owner' : OA.role.kind === 'frontdesk' ? 'front desk' : OA.chairName(OA.role.slug); }
  function show(title, node, y) {
    document.title = title + ' | ' + S.state.site.shop.short + ' portal';
    OA.clear(main); main.appendChild(node);
    if (y) window.scrollTo(0, y); else { window.scrollTo(0, 0); if (!firstRender) { var hh = main.querySelector('h1'); if (hh) { hh.setAttribute('tabindex', '-1'); hh.focus({ preventScroll: true }); } } }
    firstRender = false;
  }
  function markTab(tab) {
    OA.$$('.tab', nav).forEach(function (a) { var on = a.getAttribute('data-tab') === tab; a.classList.toggle('on', on); if (on) { a.setAttribute('aria-current', 'page'); a.scrollIntoView && a.scrollIntoView({ block: 'nearest', inline: 'center' }); } else a.removeAttribute('aria-current'); });
  }

  function start() {
    var s = readSession();
    if (!s) { signIn(); return; }
    OA.role = s; buildChrome(); updateChrome(); render();
  }
  window.addEventListener('hashchange', function () { if (OA.role) { render(); } });
  S.subscribe(function () { if (OA.role && main) { updateChrome(); } });
  window.addEventListener('storage', function (e) { if (e.key === 'oa2:state:v1' && OA.role && main) { render(true); } });

  document.addEventListener('DOMContentLoaded', function () {
    S.load();
    if (S.error) console.warn(S.error);
    try { var t = localStorage.getItem(THEME) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); document.documentElement.setAttribute('data-theme', t); } catch (e) { /* default theme */ }
    start();
    OA.api.startPolling();
  });
})();
