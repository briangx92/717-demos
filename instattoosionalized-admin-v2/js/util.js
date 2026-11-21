/* Shared helpers. Everything user- or form-supplied goes through h() text nodes, never innerHTML. */
(function () {
  'use strict';
  var OA = window.OA = window.OA || { views: {}, act: {} };

  /* ---------- DOM ---------- */
  function add(el, kids) {
    kids.forEach(function (k) {
      if (k == null || k === false) return;
      if (Array.isArray(k)) add(el, k);
      else el.appendChild(k.nodeType ? k : document.createTextNode(String(k)));
    });
  }
  OA.h = function h(tag, attrs) {
    var el = document.createElement(tag), later = null;
    var kids = Array.prototype.slice.call(arguments, 2);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k === 'on') Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); });
      else if (k.slice(0, 3) === 'on:') el.addEventListener(k.slice(3), v);
      else if (k === 'value') later = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden' || k === 'open') el[k] = true;
      else el.setAttribute(k, v === true ? '' : v);
    });
    add(el, kids);
    if (later != null) el.value = later;
    return el;
  };
  OA.$ = function (s, r) { return (r || document).querySelector(s); };
  OA.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  OA.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  /* ---------- ids, numbers ---------- */
  OA.uid = function (p) { return (p || 'id') + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); };
  OA.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  OA.clamp = function (n, a, b) { return Math.max(a, Math.min(b, n)); };
  OA.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  OA.eq = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };

  /* ---------- dates (local calendar days as 'YYYY-MM-DD') ---------- */
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  OA.DAYS = DAYS;
  OA.iso = function (d) { return d.getFullYear() + '-' + OA.pad(d.getMonth() + 1) + '-' + OA.pad(d.getDate()); };
  OA.parse = function (s) { var p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  OA.validISO = function (s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && OA.iso(OA.parse(s)) === s; };
  OA.todayISO = function () { return OA.iso(new Date()); };
  OA.addDays = function (s, n) { var d = OA.parse(s); d.setDate(d.getDate() + n); return OA.iso(d); };
  OA.diffDays = function (a, b) { return Math.round((OA.parse(a) - OA.parse(b)) / 86400000); };
  OA.dow = function (s) { return OA.parse(s).getDay(); };
  OA.dayName = function (s) { return DAYS[OA.dow(s)]; };
  OA.fmtLong = function (s) { var d = OA.parse(s); return DAYS[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate(); };
  OA.fmtShort = function (s) { var d = OA.parse(s); return MON[d.getMonth()] + ' ' + d.getDate(); };
  OA.fmtDow = function (s) { return DAYS[OA.dow(s)].slice(0, 3) + ' ' + OA.fmtShort(s); };
  OA.mins = function (t) { var p = String(t).split(':'); return (+p[0]) * 60 + (+p[1] || 0); };
  OA.hhmm = function (m) { return OA.pad(Math.floor(m / 60)) + ':' + OA.pad(m % 60); };
  OA.fmtTime = function (t) {
    if (!t) return '';
    var m = OA.mins(t), h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12;
    return h12 + ':' + OA.pad(mm) + ' ' + ap;
  };
  OA.fmtRange = function (a, b) { return OA.fmtTime(a) + ' – ' + OA.fmtTime(b); };
  OA.nowHHMM = function () { var d = new Date(); return OA.pad(d.getHours()) + ':' + OA.pad(d.getMinutes()); };
  OA.fmtStamp = function (ts) {
    var d = new Date(ts), h = d.getHours(), ap = h >= 12 ? 'PM' : 'AM';
    return MON[d.getMonth()] + ' ' + d.getDate() + ', ' + (h % 12 || 12) + ':' + OA.pad(d.getMinutes()) + ' ' + ap;
  };
  OA.ago = function (ts) {
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return 'just now';
    var m = Math.round(s / 60); if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    var d = Math.round(h / 24); if (d < 14) return d + (d === 1 ? ' day ago' : ' days ago');
    return Math.round(d / 7) + ' weeks ago';
  };
  OA.shiftTs = function (ts, days) { var d = new Date(ts); d.setDate(d.getDate() + days); return d.getTime(); };

  /* ---------- people, phones, messages ---------- */
  OA.first = function (name) { return String(name || '').replace(/["“”]/g, '').trim().split(/\s+/)[0] || 'there'; };
  OA.initials = function (name) {
    var p = String(name || '?').replace(/["“”]/g, '').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  };
  OA.digits = function (s) { return String(s || '').replace(/\D/g, ''); };
  OA.fmtPhone = function (s) {
    var d = OA.digits(s); if (d.length === 11 && d[0] === '1') d = d.slice(1);
    return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : String(s || '');
  };
  OA.phoneOk = function (s) { return OA.digits(s).length >= 7; };
  OA.e164 = function (s) { var d = OA.digits(s); if (d.length === 10) d = '1' + d; return '+' + d; };
  OA.telHref = function (s) { return 'tel:' + OA.e164(s); };
  OA.smsHref = function (s, body) { return 'sms:' + OA.e164(s) + '?&body=' + encodeURIComponent(body || ''); };
  OA.slug = function (s) { return String(s || '').toLowerCase().replace(/["“”']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'artist'; };
  OA.plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };
  OA.money = function (s) { return String(s == null ? '' : s).trim(); };

  /* ---------- misc ---------- */
  OA.debounce = function (fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; };
  OA.download = function (name, text, type) {
    var blob = new Blob([text], { type: type || 'application/json' }), url = URL.createObjectURL(blob);
    var a = OA.h('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  };
  OA.reduceMotion = function () { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; };
})();
