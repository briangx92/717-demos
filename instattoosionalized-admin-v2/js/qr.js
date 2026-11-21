/* Scan-to-phone codes. A QR code holding an sms: or tel: link, so a message or call written on the computer can be finished on a phone.
   Drawn with DOM calls only (no HTML strings). The generator is vendor/qrcode.js (qrcode-generator, MIT). Nothing leaves the page. */
(function () {
  'use strict';
  var OA = window.OA, h = OA.h, SVGNS = 'http://www.w3.org/2000/svg';
  var MAX_BYTES = 1100;   /* bigger than this is too dense for a phone camera across a desk */

  /* Returns an <svg> element, or null when the text is too long to scan. */
  OA.qr = function (text, label) {
    if (String(text).length > MAX_BYTES) return null;
    var q = window.qrcode(0, 'M'); q.addData(String(text)); q.make();
    var n = q.getModuleCount(), m = 3, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + (n + 2 * m) + ' ' + (n + 2 * m)); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label || 'QR code'); svg.setAttribute('class', 'qr');
    var bg = document.createElementNS(SVGNS, 'rect'); bg.setAttribute('width', n + 2 * m); bg.setAttribute('height', n + 2 * m); bg.setAttribute('fill', '#fff');
    var p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', '#000'); p.setAttribute('shape-rendering', 'crispEdges');
    svg.appendChild(bg); svg.appendChild(p); return svg;
  };

  /* The same code, big enough to scan from across a desk. */
  function enlarge(title, help, link) {
    var big = OA.qr(link, title); if (!big) return;
    big.setAttribute('class', 'qr qr-big');
    OA.ui.dialog({ title: title, lead: help, body: h('div', { class: 'qr-bigwrap' }, big), actions: [{ label: 'Close', kind: 'primary', value: null }] });
  }

  /* A labelled code. href() returns the link to encode, or null; why() says why there is none. Call update() when the text changes. */
  OA.qrPanel = function (o) {
    var holder = h('div', { class: 'qr-holder' }), el = h('div', { class: 'qrp' }, h('strong', { text: o.title }), holder, h('p', { class: 'note', text: o.help }));
    el.update = function () {
      OA.clear(holder);
      var link = o.href();
      if (!link) { holder.appendChild(h('p', { class: 'hint warn', text: o.why() })); return; }
      var svg = OA.qr(link, o.title);
      if (!svg) { holder.appendChild(h('p', { class: 'hint warn', text: 'This text is too long for a code. Shorten it, or use Copy text.' })); return; }
      holder.appendChild(h('button', { type: 'button', class: 'qr-open', title: 'Click to enlarge', 'aria-label': 'Enlarge the code: ' + o.title, on: { click: function () { enlarge(o.title, o.help, link); } } }, svg));
      holder.appendChild(h('span', { class: 'qr-zoom', text: 'Click the code to enlarge it' }));
    };
    el.update(); return el;
  };
})();
