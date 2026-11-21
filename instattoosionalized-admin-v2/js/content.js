/* The public content format: what the portal publishes and the website reads.
   One shape for both the demo (kept in this browser) and the real site (served by the API later).
   Today it carries the banner and announcements. Other sections join it as they get a real publish path. */
(function () {
  'use strict';
  var OA = window.OA;

  OA.PUBLIC_KEY = 'oa2:published:v1';
  OA.PREVIEW_KEY = 'oa2:preview:v1';
  /* The demo website, relative to the portal. The real build points this at the shop's live address. */
  OA.LIVE_URL = '../instattoosionalized-tattoos-and-piercings.html';
  OA.LIMITS = { policy: 800, artistName: 80, artistRole: 40, artistBio: 1500, bannerText: 140, annTitle: 80, annBody: 400, annLink: 300, annMax: 20 };
  OA.ANN_KINDS = [['notice', 'News'], ['closure', 'Closure'], ['special', 'Special']];

  var ISO = /^\d{4}-\d{2}-\d{2}$/;

  /* Saved data from before announcements existed gets an empty list, so nothing downstream has to ask. */
  /* The seed has each artist's links; an artist with only a handle gets that as an Instagram link. */
  OA.seedSocials = function (a) {
    var src = a.socials;
    if (!Array.isArray(src)) { var seed = (window.OA_SEED_SITE && window.OA_SEED_SITE.artists || []).filter(function (x) { return x.slug === a.slug; })[0]; src = seed && seed.socials; }
    if (!Array.isArray(src)) src = a.ig ? [{ p: 'Instagram', h: a.ig }] : [];
    return src.map(function (x, i) { return { id: x.id || 'so_' + a.slug + '_' + i, p: x.p, h: x.h }; });
  };

  OA.migrate = function (st) {
    if (!st || !st.site) return st;
    [st.site, st.published && st.published.site].forEach(function (site) {
      if (site && Array.isArray(site.artists)) site.artists.forEach(function (a) { if (!Array.isArray(a.socials)) a.socials = OA.seedSocials(a); });
    });
    if (!Array.isArray(st.site.announcements)) st.site.announcements = [];
    if (st.published && st.published.site && !Array.isArray(st.published.site.announcements)) st.published.site.announcements = [];
    return st;
  };

  OA.httpsLink = function (s) {
    if (!s) return true;
    if (s.length > OA.LIMITS.annLink || /\s/.test(s)) return false;
    try { var u = new URL(s); return u.protocol === 'https:' && !!u.hostname; } catch (e) { return false; }
  };

  /* The first thing wrong with one announcement, in words the owner can act on. Empty string means fine. */
  OA.annProblem = function (a) {
    var L = OA.LIMITS;
    if (!String(a.title || '').trim()) return 'Add a title.';
    if (a.title.length > L.annTitle) return 'The title is over ' + L.annTitle + ' characters.';
    if (String(a.body || '').length > L.annBody) return 'The message is over ' + L.annBody + ' characters.';
    if (!OA.ANN_KINDS.some(function (k) { return k[0] === a.kind; })) return 'Pick what kind of announcement this is.';
    if (a.start && !ISO.test(a.start)) return 'The start date is not a date.';
    if (a.end && !ISO.test(a.end)) return 'The end date is not a date.';
    if (a.start && a.end && a.end < a.start) return 'It ends before it starts.';
    if (!OA.httpsLink(a.link || '')) return 'The link has to start with https:// and have no spaces.';
    return '';
  };

  /* Where an announcement stands on a given day: live, soon, or over. */
  OA.annStatus = function (a, today) {
    if (a.start && a.start > today) return 'soon';
    if (a.end && a.end < today) return 'over';
    return 'live';
  };

  /* What the website needs to know about each artist. Photos are not here: they need the real publish path. */
  OA.artistsContent = function (site) {
    return (site.artists || []).map(function (a) {
      var socials = [];
      (a.socials || []).forEach(function (x) { var n = OA.socialNorm(x.p, x.h); if (n.ok) socials.push({ p: x.p, label: n.label, url: n.url }); });
      return { slug: a.slug, name: a.name, nick: OA.nick(a), role: a.role || '', bio: a.bio || '', visible: !!a.visible && !a.removedAt, socials: socials };
    });
  };

  OA.publicContent = function (site, at) {
    var b = site.banner || {};
    return {
      v: 1,
      at: at,
      artists: OA.artistsContent(site),
      policies: { deposit: String((site.policies || {}).deposit || '').trim(), age: String((site.policies || {}).age || '').trim(), aftercare: String((site.policies || {}).aftercare || '').trim() },
      banner: { on: !!b.on, text: String(b.text || ''), start: b.start || '', end: b.end || '' },
      announcements: (site.announcements || []).map(function (a) {
        return { id: a.id, kind: a.kind, title: a.title, body: a.body || '', link: a.link || '', start: a.start || '', end: a.end || '', pinned: !!a.pinned };
      })
    };
  };

  /* Demo: the live copy is a key in this browser, which the public demo page reads. It is written, read back and compared,
     so "published" is never reported for a write that did not land. */
  OA.writeLive = function (content) {
    var json = JSON.stringify(content);
    try {
      localStorage.setItem(OA.PUBLIC_KEY, json);
      if (localStorage.getItem(OA.PUBLIC_KEY) !== json) return 'The live copy did not save. Nothing was published.';
    } catch (e) { return 'This browser would not keep the live copy, so nothing was published.'; }
    return '';
  };
  OA.clearLive = function () { try { localStorage.removeItem(OA.PUBLIC_KEY); localStorage.removeItem(OA.PREVIEW_KEY); } catch (e) { /* nothing to clear */ } };

  /* A preview is the draft, saved apart from the live copy, so looking never changes what visitors see. */
  OA.writePreview = function (content) {
    var json = JSON.stringify(content);
    try {
      localStorage.setItem(OA.PREVIEW_KEY, json);
      if (localStorage.getItem(OA.PREVIEW_KEY) !== json) return 'The preview did not save, so it was not opened.';
    } catch (e) { return 'This browser would not keep the preview, so it was not opened.'; }
    return '';
  };

  /* Links to the website. Real links, so they open in a new tab like any link and stay keyboard friendly. */
  OA.liveLink = function (cls) {
    return OA.h('a', { class: cls || 'btn small quiet', href: OA.LIVE_URL, target: '_blank', rel: 'noopener noreferrer', text: 'View live site', title: 'Opens the public website in a new tab' });
  };
  OA.previewLink = function (cls) {
    var a = OA.h('a', { class: cls || 'btn small', href: OA.LIVE_URL + '?preview=1', target: '_blank', rel: 'noopener noreferrer', text: 'Preview site changes', title: 'Opens the website in a new tab with your unpublished changes. Visitors do not see this.' });
    a.addEventListener('click', function (e) {
      var bad = OA.writePreview(OA.publicContent(OA.store.state.site, Date.now()));
      if (bad) { e.preventDefault(); OA.ui.fail(bad); }
    });
    return a;
  };
})();
