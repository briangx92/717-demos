/* Social links for an artist: platform + handle (or link), checked and turned into a safe https address.
   The same rules run when the owner types it and again before publishing. */
(function () {
  'use strict';
  var OA = window.OA;
  OA.SOCIAL_MAX = 8;
  /* hosts: where a pasted link may point. re: what a handle looks like. pre: shown before the handle. */
  OA.SOCIALS = [
    { p: 'Instagram', hosts: ['instagram.com'], re: /^[A-Za-z0-9._]{1,30}$/, pre: '@', ph: 'handle, no @', url: function (h) { return 'https://www.instagram.com/' + h; } },
    { p: 'Facebook', hosts: ['facebook.com', 'fb.com'], re: /^[A-Za-z0-9.]{5,50}$/, pre: '', ph: 'page link or name', url: function (h) { return 'https://www.facebook.com/' + h; }, keepPath: true },
    { p: 'TikTok', hosts: ['tiktok.com'], re: /^[A-Za-z0-9._]{2,24}$/, pre: '@', ph: 'handle, no @', url: function (h) { return 'https://www.tiktok.com/@' + h; } },
    { p: 'YouTube', hosts: ['youtube.com'], re: /^[A-Za-z0-9._-]{3,30}$/, pre: '@', ph: 'handle, no @', url: function (h) { return 'https://www.youtube.com/@' + h; } },
    { p: 'X', hosts: ['x.com', 'twitter.com'], re: /^[A-Za-z0-9_]{1,15}$/, pre: '@', ph: 'handle, no @', url: function (h) { return 'https://x.com/' + h; } },
    { p: 'Threads', hosts: ['threads.net', 'threads.com'], re: /^[A-Za-z0-9._]{1,30}$/, pre: '@', ph: 'handle, no @', url: function (h) { return 'https://www.threads.net/@' + h; } },
    { p: 'Bluesky', hosts: ['bsky.app'], re: /^[A-Za-z0-9.-]{3,60}$/, pre: '@', ph: 'name.bsky.social', url: function (h) { return 'https://bsky.app/profile/' + h; } },
    { p: 'Snapchat', hosts: ['snapchat.com'], re: /^[A-Za-z0-9._-]{3,15}$/, pre: '', ph: 'username', url: function (h) { return 'https://www.snapchat.com/add/' + h; } },
    { p: 'Website', hosts: null, ph: 'https://…' }
  ];
  OA.socialSpec = function (p) { for (var i = 0; i < OA.SOCIALS.length; i++) if (OA.SOCIALS[i].p === p) return OA.SOCIALS[i]; return null; };

  function hostOk(host, hosts) { host = host.toLowerCase().replace(/^www\./, ''); return hosts.some(function (h) { return host === h || host.slice(-h.length - 1) === '.' + h; }); }

  /* Returns { ok, h, url, label } or { ok:false, msg }. h is what gets stored: the handle, or the link for Facebook and websites. */
  OA.socialNorm = function (p, raw) {
    var sp = OA.socialSpec(p), s = String(raw == null ? '' : raw).trim();
    if (!sp) return { ok: false, msg: 'Pick a platform.' };
    if (!s) return { ok: false, msg: 'Add a handle or a link.' };
    if (/\s/.test(s)) return { ok: false, msg: 'No spaces. Paste the handle or the link as it is.' };
    if (s.length > 300) return { ok: false, msg: 'That is too long.' };
    var looksUrl = /^[a-z][a-z0-9+.-]*:/i.test(s) || /^www\./i.test(s) || (s.indexOf('/') > 0 && s.indexOf('.') > 0) || (sp.p === 'Website' && s.indexOf('.') > 0);
    if (looksUrl) {
      if (/^www\./i.test(s) || !/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
      var u; try { u = new URL(s); } catch (e) { return { ok: false, msg: 'That link does not look right.' }; }
      if (u.protocol !== 'https:') return { ok: false, msg: 'Links have to start with https://' };
      if (!u.hostname || u.username || u.password) return { ok: false, msg: 'That link does not look right.' };
      if (sp.p === 'Website') return { ok: true, h: u.origin + u.pathname.replace(/\/+$/, ''), url: u.origin + u.pathname.replace(/\/+$/, ''), label: u.hostname.replace(/^www\./, '') };
      if (!hostOk(u.hostname, sp.hosts)) return { ok: false, msg: 'That link is not on ' + sp.hosts[0] + '. Check the platform.' };
      if (sp.keepPath) {
        var path = u.pathname; if (path.length < 2) return { ok: false, msg: 'Paste the link to the page itself.' };
        var segs = path.split('/').filter(Boolean), full;
        if (segs[0] === 'profile.php') {
          var id = u.searchParams.get('id'); if (!id || !/^\d{5,20}$/.test(id)) return { ok: false, msg: 'That profile link is missing its id.' };
          full = 'https://www.facebook.com/profile.php?id=' + id; return { ok: true, h: full, url: full, label: 'Facebook page' };
        }
        full = 'https://www.facebook.com' + path;
        return { ok: true, h: full, url: full, label: segs[0] === 'people' && segs[1] ? segs[1] : segs[segs.length - 1] };
      }
      var parts = u.pathname.split('/').filter(Boolean), seg = sp.p === 'Bluesky' ? parts[1] : sp.p === 'Snapchat' ? parts[1] : parts[0];
      if (!seg) return { ok: false, msg: 'Paste the link to the profile itself.' };
      s = seg;
    } else if (sp.p === 'Website') return { ok: false, msg: 'A website link has to start with https://' };
    var hdl = s.replace(/^@/, '');
    if (!sp.re.test(hdl)) return { ok: false, msg: sp.p + ' handles look different from that. Check it and try again.' };
    return { ok: true, h: hdl, url: sp.url(hdl), label: (sp.pre || '') + hdl };
  };

  /* The first thing wrong with a whole list of links, or '' when fine. */
  OA.socialsProblem = function (list) {
    if (list.length > OA.SOCIAL_MAX) return 'More than ' + OA.SOCIAL_MAX + ' social links. Remove some.';
    var seen = {};
    for (var i = 0; i < list.length; i++) {
      var n = OA.socialNorm(list[i].p, list[i].h);
      if (!n.ok) return list[i].p + ': ' + n.msg;
      var k = list[i].p + '|' + n.url.toLowerCase();
      if (seen[k]) return list[i].p + ' ' + n.label + ' is listed twice.';
      seen[k] = 1;
    }
    return '';
  };
  OA.socialSig = function (list) { return (list || []).map(function (x) { return x.p + ':' + x.h; }).join('|'); };
  OA.igOf = function (list) { var x = (list || []).filter(function (s) { return s.p === 'Instagram'; })[0]; return x ? x.h : ''; };
})();
