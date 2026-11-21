/* Content the owner portal publishes, read by the homepage and the artist pages.
   Everything is checked again here and drawn as text only. Anything invalid is skipped and logged to the console.
   The demo reads it from this browser. The real site will fetch it from the API in read() and nothing else changes. */
(function () {
  'use strict';
  var PREVIEW = /[?&]preview=1(&|$)/.test(location.search);
  var KEY = PREVIEW ? 'oa2:preview:v1' : 'oa2:published:v1';
  var HOME = 'instattoosionalized-tattoos-and-piercings.html';
  var KINDS = { notice: 'News', closure: 'Closed', special: 'Special' };
  var ISO = /^\d{4}-\d{2}-\d{2}$/;
  var HOSTS = { Instagram: ['instagram.com'], Facebook: ['facebook.com'], TikTok: ['tiktok.com'], YouTube: ['youtube.com'], X: ['x.com'], Threads: ['threads.net', 'threads.com'], Bluesky: ['bsky.app'], Snapchat: ['snapchat.com'], Website: null };
  var MAX = { policy: 800, artists: 20, socials: 8, name: 80, role: 40, bio: 1500, label: 60, url: 300 };

  function warn(msg) { try { console.error('[site-content] ' + msg); } catch (e) { /* console missing */ } }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function str(v, max) { return typeof v === 'string' && v.length <= max; }
  function okDate(s) { return s == null || s === '' || (typeof s === 'string' && ISO.test(s)); }
  function parseUrl(s) {
    if (typeof s !== 'string' || s.length > MAX.url || /\s/.test(s)) return null;
    try { var u = new URL(s); return u.protocol === 'https:' && u.hostname && !u.username && !u.password ? u : null; } catch (e) { return null; }
  }
  function okLink(s) { return s == null || s === '' || !!parseUrl(s); }
  function hostOk(u, platform) {
    var hosts = HOSTS[platform]; if (hosts === null) return true;
    var h = u.hostname.toLowerCase().replace(/^www\./, '');
    return hosts.some(function (x) { return h === x || h.slice(-x.length - 1) === '.' + x; });
  }

  var cache;
  /* The one place content comes from. Returns the parsed object, or null when nothing is published. */
  function read() {
    if (cache !== undefined) return cache;
    cache = null;
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { return cache; }
    if (!raw) return cache;
    var c;
    try { c = JSON.parse(raw); } catch (e) { warn('The published content could not be read. Showing the built-in content.'); return cache; }
    if (!c || c.v !== 1) { warn('The published content has an unknown version. Showing the built-in content.'); return cache; }
    cache = c;
    return cache;
  }

  function shopToday(tz) {
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return p.year + '-' + p.month + '-' + p.day;
  }
  function active(x, today) { return (!x.start || x.start <= today) && (!x.end || x.end >= today); }

  /* Banner and announcements. */
  function cleanNews(c) {
    var out = { banner: null, items: [] }, b = c && c.banner;
    if (b && b.on === true) {
      if (str(b.text, 140) && b.text.trim() && okDate(b.start) && okDate(b.end)) out.banner = b; else warn('The banner was skipped because it is not valid.');
    }
    (Array.isArray(c && c.announcements) ? c.announcements : []).slice(0, 20).forEach(function (a, i) {
      var ok = a && str(a.title, 80) && a.title.trim() && str(a.body == null ? '' : a.body, 400) && typeof a.kind === 'string' &&
        Object.prototype.hasOwnProperty.call(KINDS, a.kind) && okDate(a.start) && okDate(a.end) && okLink(a.link);
      if (ok) out.items.push(a); else warn('Announcement ' + (i + 1) + ' was skipped because it is not valid.');
    });
    return out;
  }

  /* Artists: returns a map of slug to a checked record, or null when the content has no artists. */
  function cleanArtists(c) {
    if (!c || !Array.isArray(c.artists)) return null;
    var by = {};
    c.artists.slice(0, MAX.artists).forEach(function (a, i) {
      var tag = 'Artist ' + (i + 1);
      if (!a || typeof a.slug !== 'string' || !/^[a-z0-9-]{1,40}$/.test(a.slug)) { warn(tag + ' was skipped: the slug is not valid.'); return; }
      tag = 'Artist ' + a.slug;
      if (!str(a.name, MAX.name) || !a.name.trim() || !str(a.nick, MAX.name) || !a.nick.trim() || !str(a.role == null ? '' : a.role, MAX.role) || !str(a.bio == null ? '' : a.bio, MAX.bio) || typeof a.visible !== 'boolean') {
        warn(tag + ' was skipped because it is not valid.'); return;
      }
      var socials = [];
      (Array.isArray(a.socials) ? a.socials : []).slice(0, MAX.socials).forEach(function (x) {
        var u = x && Object.prototype.hasOwnProperty.call(HOSTS, x.p) ? parseUrl(x.url) : null;
        if (u && hostOk(u, x.p) && str(x.label, MAX.label) && x.label.trim()) socials.push({ p: x.p, label: x.label.trim(), url: u.href });
        else warn(tag + ': a social link was skipped because it is not valid.');
      });
      by[a.slug] = { slug: a.slug, name: a.name.trim(), nick: a.nick.trim(), role: (a.role || '').trim(), bio: (a.bio || '').trim(), visible: a.visible, socials: socials };
    });
    return by;
  }

  /* Policies: the three the shop can post. Returns an object of checked strings, or null when the content has none. */
  var POLICY_TITLES = { deposit: 'Deposit', age: 'Age and ID', aftercare: 'Aftercare' };
  var POLICY_DEFAULTS = { deposit: 'The shop\u2019s deposit is $40 and holds your spot.', age: '', aftercare: '' };
  function cleanPolicies(c) {
    if (!c || !c.policies || typeof c.policies !== 'object' || Array.isArray(c.policies)) return null;
    var out = {};
    Object.keys(POLICY_TITLES).forEach(function (k) {
      var v = c.policies[k];
      if (v == null) { out[k] = ''; return; }
      if (str(v, MAX.policy)) out[k] = v.trim(); else { warn('The ' + POLICY_TITLES[k] + ' policy was skipped because it is not valid.'); out[k] = POLICY_DEFAULTS[k]; }
    });
    return out;
  }
  function pointPolicyLinks() {
    if (!PREVIEW) return;
    Array.prototype.forEach.call(document.querySelectorAll('a[data-pol-link]'), function (a) { a.setAttribute('href', withPreview(a.getAttribute('href'))); });
  }
  /* Homepage "Good to know" box: shows the published policies. Blank ones stay hidden, as do all of them when every one is blank. */
  function homePolicies() {
    pointPolicyLinks();
    var p = cleanPolicies(read()); if (!p) return;
    Object.keys(POLICY_TITLES).forEach(function (k) {
      var row = document.querySelector('[data-pol="' + k + '"]'); if (!row) return;
      var span = row.querySelector('[data-pol-text]'); if (p[k]) { if (span) span.textContent = p[k]; row.hidden = false; } else row.hidden = true;
    });
    var card = document.getElementById('policies-card'); if (card) card.hidden = !card.querySelector('[data-pol]:not([hidden])');
  }
  /* Menu: the artist links become one "Artists" dropdown, built from the published artists (hidden ones left out),
     or from the links already on the page when nothing is published. Works for any number of artists. */
  function navNames() {
    try {
      var nav = document.querySelector('.p-menu'); if (!nav || nav.querySelector('.p-drop')) return;
      var found = Array.prototype.filter.call(nav.querySelectorAll('a[href^="instattoosionalized-artist-"]'), function (a) { return !a.children.length; });
      if (!found.length) return;
      var by = cleanArtists(read()), items = [];
      if (by) {
        var order = (read() && read().artists) || [];
        order.forEach(function (a) { var q = a && by[a.slug]; if (q && q.visible) items.push({ href: 'instattoosionalized-artist-' + q.slug + '.html', text: q.nick }); });
      } else {
        found.forEach(function (a) { items.push({ href: a.getAttribute('href'), text: a.textContent }); });
      }
      var wrap = el('div', 'p-drop'), btn = el('button', 'p-drop__btn', 'Artists'), list = el('div', 'p-drop__list');
      btn.type = 'button'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'p-drop-list'); list.id = 'p-drop-list'; list.hidden = true;
      items.forEach(function (it) { var a = el('a', null, it.text); a.href = withPreview(it.href); list.appendChild(a); });
      wrap.append(btn, list);
      function close() { list.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
      btn.addEventListener('click', function (e) { e.stopPropagation(); var open = list.hidden; list.hidden = !open; btn.setAttribute('aria-expanded', String(open)); });
      document.addEventListener('click', function (e) { if (!list.hidden && !wrap.contains(e.target)) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !list.hidden) { close(); btn.focus(); } });
      found[0].parentNode.insertBefore(wrap, found[0]);
      found.forEach(function (a) { if (a.parentNode) a.parentNode.removeChild(a); });
      if (!items.length) wrap.hidden = true;
    } catch (e) { warn('menu names not updated'); }
  }
  /* Policies page. */
  function policiesPage() {
    try {
      var c = read(); previewBar(!!c); pointPolicyLinks(); navNames();
      if (PREVIEW) Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) { var h = a.getAttribute('href'), n = withPreview(h); if (n !== h) a.setAttribute('href', n); });
      var p = cleanPolicies(c) || POLICY_DEFAULTS, list = document.getElementById('pol-list'), empty = document.getElementById('pol-empty'), n = 0;
      if (!list) return;
      Object.keys(POLICY_TITLES).forEach(function (k) {
        var t = (p[k] || '').trim(); if (!t) return;
        var box = el('section', 'pol-item'); box.appendChild(el('h2', null, POLICY_TITLES[k]));
        paragraphs(t).forEach(function (x) { box.appendChild(el('p', null, x)); });
        list.appendChild(box); n++;
      });
      if (empty) empty.hidden = n > 0;
    } catch (e) { warn('Could not show the policies: ' + e.message); }
  }

  function paragraphs(bio) { return bio.split(/\n\s*\n/).map(function (p) { return p.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean); }
  function withPreview(href) {
    if (!PREVIEW || typeof href !== 'string' || !/^instattoosionalized-[a-z-]+\.html/.test(href)) return href;
    var hash = '', i = href.indexOf('#'); if (i >= 0) { hash = href.slice(i); href = href.slice(0, i); }
    return href + (href.indexOf('?') >= 0 ? '&' : '?') + 'preview=1' + hash;
  }

  function previewBar(found) {
    if (!PREVIEW) return null;
    var pv = el('div', 's-preview'); pv.setAttribute('role', 'status');
    pv.textContent = found
      ? 'Preview of unpublished changes. Visitors do not see this page. It shows what would be live today: announcements that start later stay hidden until their date.'
      : 'No preview was found, so this is the built-in site. Open the preview again from the portal.';
    document.body.insertBefore(pv, document.body.firstChild);
    if (!found) warn('No preview content found.');
    return pv;
  }

  /* Homepage: updates the built-in artist list in place. Call once, before the page draws the artist cards. */
  function mergeHome(list) {
    var by = cleanArtists(read());
    if (PREVIEW) { try { var old = window.artistPageHref; if (old) window.artistPageHref = function (a) { return withPreview(old(a)); }; } catch (e) { /* link stays as it is */ } }
    if (!by) return;
    for (var i = list.length - 1; i >= 0; i--) {
      var a = list[i], p = by[a.slug];
      if (!p) continue;
      if (!p.visible) { list.splice(i, 1); continue; }
      var ig = p.socials.filter(function (x) { return x.p === 'Instagram'; })[0];
      a.name = p.name; a.first = p.nick; a.role = p.role || a.role;
      a.bio = p.bio; a.about = paragraphs(p.bio); a.socials = p.socials;
      a.ig = ig ? ig.label.replace(/^@/, '') : '';
      a.portraitAlt = 'Portrait of ' + p.nick + ' at Instattoosionalized';
    }
  }

  var ICONS = {
    Instagram: function (svg, ns) {
      svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
      var r = document.createElementNS(ns, 'rect'); ['x', 'y'].forEach(function (k) { r.setAttribute(k, '3'); }); r.setAttribute('width', '18'); r.setAttribute('height', '18'); r.setAttribute('rx', '5');
      var c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '4');
      var d = document.createElementNS(ns, 'circle'); d.setAttribute('cx', '17.2'); d.setAttribute('cy', '6.8'); d.setAttribute('r', '0.6'); d.setAttribute('fill', 'currentColor'); d.setAttribute('stroke', 'none');
      svg.append(r, c, d);
    },
    Facebook: function (svg, ns) { path(svg, ns, 'M13.5 21.9v-7.2h2.42l.36-2.8H13.5V10.1c0-.81.23-1.36 1.4-1.36h1.5V6.25c-.26-.04-1.15-.11-2.19-.11-2.17 0-3.65 1.32-3.65 3.75v2.01H8.13v2.8h2.43v7.2a10.03 10.03 0 0 0 2.94 0z'); },
    TikTok: function (svg, ns) { path(svg, ns, 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z'); }
  };
  function path(svg, ns, d) { svg.setAttribute('fill', 'currentColor'); var p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); svg.appendChild(p); }
  function chip(s) {
    var a = el('a', 'c-chip'); a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    if (ICONS[s.p]) {
      var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '16'); svg.setAttribute('height', '16'); svg.setAttribute('aria-hidden', 'true');
      ICONS[s.p](svg, ns); a.appendChild(svg);
    }
    a.appendChild(document.createTextNode(s.label));
    a.setAttribute('aria-label', s.p + ': ' + s.label);
    return a;
  }

  function setText(node, text) { if (node) node.textContent = text; }

  /* Artist page: replaces the words the owner can edit. The rest of the page stays as built. */
  function applyArtistPage(slug) {
    try {
      var c = read(), by = cleanArtists(c), p = by && by[slug];
      previewBar(!!c); navNames();
      if (PREVIEW) {
        Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) { var h = a.getAttribute('href'); var n = withPreview(h); if (n !== h) a.setAttribute('href', n); });
      }
      if (!p) return;
      var main = document.querySelector('main');
      if (!p.visible) {
        document.title = 'Instattoosionalized Tattoos and Piercings';
        if (main) {
          while (main.firstChild) main.removeChild(main.firstChild);
          var box = el('section', 'p-sec'); box.append(el('h1', 'p-name', 'This page is not available right now'));
          var back = el('a', 'c-btn c-btn--solid', 'Back to the shop'); back.href = withPreview(HOME); box.append(el('p', null, 'The shop has taken this page down for now.'), back);
          main.appendChild(box);
        }
        return;
      }
      document.title = p.name + ' | Instattoosionalized Tattoos and Piercings';
      setText(document.querySelector('.p-name'), p.name);
      var img = document.querySelector('.p-portrait'); if (img) img.alt = 'Portrait of ' + p.nick + ', tattoo artist at Instattoosionalized';
      var links = document.querySelector('.p-links');
      if (links) { while (links.firstChild) links.removeChild(links.firstChild); p.socials.forEach(function (s) { links.appendChild(chip(s)); }); links.hidden = !p.socials.length; }

      var about = document.querySelector('.p-about');
      if (about) {
        var ps = paragraphs(p.bio);
        Array.prototype.slice.call(about.querySelectorAll('p')).forEach(function (n) { n.remove(); });
        setText(about.querySelector('h2'), 'In ' + p.nick + '’s words');
        ps.forEach(function (t) { about.appendChild(el('p', null, t)); });
        about.hidden = !ps.length;
      }
      var note = document.querySelector('.p-note');
      if (note) {
        setText(note.querySelector('h2'), 'Booking with ' + p.nick);
        var first = note.querySelector('p'), ig = p.socials.filter(function (x) { return x.p === 'Instagram'; })[0];
        if (first) first.textContent = 'Send the shop request form with ' + p.nick + ' picked' + (ig ? ', or message them on Instagram at ' + ig.label : '') + '. Tell them the idea, where it is going, and roughly how big.';
      }
      var req = document.querySelector('.p-req');
      if (req) {
        setText(req.querySelector('h2'), 'Want work by ' + p.nick + '?');
        setText(req.querySelector('p'), 'Send a request and pick ' + p.nick + ' by name. The shop writes back to set it up.');
        setText(req.querySelector('a.c-btn'), 'Request with ' + p.nick);
      }
    } catch (e) { warn('Could not show the published artist content: ' + e.message); }
  }

  window.SiteContent = { navNames: navNames, homePolicies: homePolicies, cleanPolicies: cleanPolicies, withPreview: withPreview, PREVIEW: PREVIEW, KINDS: KINDS, read: read, shopToday: shopToday, active: active, cleanNews: cleanNews, cleanArtists: cleanArtists, mergeHome: mergeHome, applyArtistPage: applyArtistPage, previewBar: previewBar, el: el, warn: warn };

  var me = document.currentScript;
  function navPage() {
    previewBar(!!read()); navNames();
    if (PREVIEW) Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) { var h = a.getAttribute('href'), n = withPreview(h); if (n !== h) a.setAttribute('href', n); });
  }
  if (me && me.getAttribute('data-nav')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', navPage); else navPage();
  }
  if (me && me.getAttribute('data-policies')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', policiesPage); else policiesPage();
  }
  if (me && me.getAttribute('data-artist')) {
    var slug = me.getAttribute('data-artist');
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { applyArtistPage(slug); }); else applyArtistPage(slug);
  }
})();
