/* Small shared pieces: toasts, dialogs, form fields, chips, message composer. */
(function () {
  'use strict';
  var OA = window.OA, h = OA.h, S = OA.store;
  var ui = OA.ui = {};

  /* ---------- toasts: one live region, an optional action (Undo), and failures that stay until dismissed ---------- */
  var toastBox;
  ui.toast = function (msg, o) {
    o = o || {};
    if (!toastBox) { toastBox = h('div', { class: 'toasts', 'aria-live': 'polite', role: 'status' }); document.body.appendChild(toastBox); }
    var t = h('div', { class: 'toast' + (o.kind === 'bad' ? ' bad' : '') }, h('span', { text: msg }));
    var timer;
    function close() { clearTimeout(timer); if (t.parentNode) t.parentNode.removeChild(t); }
    if (o.action) t.appendChild(h('button', { class: 'link', type: 'button', text: o.action.label, on: { click: function () { close(); o.action.run(); } } }));
    if (o.kind === 'bad') t.appendChild(h('button', { class: 'link', type: 'button', text: 'Dismiss', on: { click: close } }));
    toastBox.appendChild(t);
    if (o.kind !== 'bad') timer = setTimeout(close, o.action ? 9000 : 4500);
    return close;
  };
  ui.fail = function (msg) { return ui.toast(msg, { kind: 'bad' }); };

  /* ---------- dialogs ---------- */
  ui.dialog = function (o) {
    return new Promise(function (resolve) {
      var dlg = h('dialog', { class: 'dlg' + (o.wide ? ' wide' : ''), 'aria-labelledby': 'dlg-t' });
      var err = h('div', { class: 'form-error', role: 'alert', hidden: true });
      var body = typeof o.body === 'function' ? o.body(dlg) : o.body;
      var foot = h('div', { class: 'dlg-foot' });
      var done = false;
      function finish(v) { if (done) return; done = true; try { dlg.close(); } catch (e) { /* already closed */ } if (dlg.parentNode) dlg.parentNode.removeChild(dlg); resolve(v); }
      (o.actions || [{ label: 'Close', kind: 'quiet', value: null }]).forEach(function (a) {
        foot.appendChild(h('button', {
          type: 'button', class: 'btn ' + (a.kind || ''), text: a.label,
          on: { click: function () {
            function handle(r) { if (r === false) return; if (r && r.error) { ui.showError(err, r.error); return; } finish(r === undefined ? a.value : r); }
            if (a.run) { var r = a.run(); if (r && typeof r.then === 'function') r.then(handle); else handle(r); }
            else finish(a.value);
          } }
        }));
      });
      dlg.appendChild(h('form', { method: 'dialog', on: { submit: function (e) { e.preventDefault(); var p = (o.actions || []).filter(function (a) { return a.kind === 'primary' || a.kind === 'danger'; })[0]; if (p) foot.querySelector('.btn.primary,.btn.danger').click(); } } },
        h('h2', { id: 'dlg-t', text: o.title }), o.lead ? h('p', { class: 'lead', text: o.lead }) : null, body, err, foot));
      dlg.addEventListener('cancel', function (e) { e.preventDefault(); finish(null); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) finish(null); });
      document.body.appendChild(dlg);
      dlg.showModal();
      var f = dlg.querySelector('[autofocus]') || dlg.querySelector('input,select,textarea'); if (f && !OA.isTouch) f.focus();
    });
  };
  OA.isTouch = window.matchMedia && matchMedia('(pointer:coarse)').matches;
  ui.showError = function (box, errs) {
    errs = [].concat(errs); box.hidden = false; OA.clear(box);
    errs.forEach(function (e) { box.appendChild(h('div', { text: e })); });
  };
  ui.confirm = function (title, lead, label, danger) {
    return ui.dialog({ title: title, lead: lead, body: h('div'), actions: [{ label: 'Cancel', kind: 'quiet', value: false }, { label: label, kind: danger ? 'danger' : 'primary', value: true }] }).then(function (v) { return v === true; });
  };

  /* ---------- form bits ---------- */
  var fid = 0;
  ui.field = function (label, input, hint, cls) {
    var id = 'f' + (++fid); input.id = input.id || id;
    return h('div', { class: 'field ' + (cls || '') }, h('label', { for: input.id, text: label }), input, hint ? h('div', { class: 'hint', text: hint }) : null);
  };
  ui.input = function (v, a) { a = a || {}; a.value = v == null ? '' : v; return h('input', Object.assign({ type: 'text', autocomplete: 'off' }, a)); };
  ui.area = function (v, a) { a = a || {}; a.value = v == null ? '' : v; return h('textarea', Object.assign({ rows: 3 }, a)); };
  ui.select = function (opts, v, a) {
    var s = h('select', a || {});
    opts.forEach(function (o) { o = Array.isArray(o) ? o : [o, o]; s.appendChild(h('option', { value: o[0], text: o[1] })); });
    s.value = v == null ? '' : v; return s;
  };
  ui.chip = function (text, kind) { return h('span', { class: 'chip' + (kind ? ' ' + kind : ''), text: text }); };
  ui.empty = function (title, text, action) {
    return h('div', { class: 'empty' }, h('h3', { text: title }), text ? h('p', { text: text }) : null, action || null);
  };
  ui.avatar = function (name, cls) { return h('span', { class: 'avatar ' + (cls || ''), 'aria-hidden': 'true', text: OA.initials(name) }); };
  ui.btn = function (label, fn, kind, attrs) { return h('button', Object.assign({ type: 'button', class: 'btn ' + (kind || ''), text: label, on: { click: fn } }, attrs || {})); };
  ui.link = function (label, href, cls) { return h('a', { class: cls || 'btn quiet', href: href, text: label }); };
  ui.statusChip = function (s) { return ui.chip(OA.STATUS_LABEL[s], 'st-' + s.toLowerCase().replace(/\s+/g, '-')); };

  /* ---------- clipboard: say so when it fails ---------- */
  ui.copy = function (text) {
    function fallback() {
      var ta = h('textarea', { style: 'position:fixed;left:-999px', value: text }); document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta); return ok;
    }
    var p = navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); }) : Promise.resolve(fallback());
    return p.then(function (ok) { if (ok) ui.toast('Copied'); else ui.fail('Copy did not work in this browser. Select the text and copy it by hand.'); return ok; });
  };

  /* ---------- the message composer: shows the words, hands them to the phone's messaging app, never claims it was sent ---------- */
  ui.message = function (o) {
    /* o: {key, ctx:{name,artist,quote,date,start}, phone, title, req, onOpened} */
    var text = OA.compose(o.key, o.ctx), area = ui.area(text, { rows: 6, 'aria-label': 'Message text' }), warn = h('div', { class: 'hint warn' }), actions = h('div', { class: 'row' });
    function recheck() {
      var left = OA.blanks(area.value); OA.clear(warn);
      if (left.length) warn.textContent = 'Fill in before sending: ' + left.map(function (b) { return b + (OA.BLANK_HINT[b] ? ' (' + OA.BLANK_HINT[b] + ')' : ''); }).join(', ') + '.';
      return left;
    }
    area.addEventListener('input', recheck);
    var phone = o.phone || '';
    var body = h('div', {},
      h('div', { class: 'to', text: 'To: ' + (o.ctx.name || 'client') + (phone ? ', ' + OA.fmtPhone(phone) : ', no phone number on file') }),
      area, warn,
      h('div', { class: 'hint', text: 'This opens your phone’s messaging app with the words filled in. Nothing is sent from this page.' })
    );
    recheck();
    return ui.dialog({
      title: o.title || OA.TEMPLATES[o.key].name, body: body, wide: true,
      actions: [
        { label: 'Close', kind: 'quiet', value: null },
        { label: 'Copy text', kind: '', run: function () { ui.copy(area.value); return false; } },
        { label: phone ? 'Open in messages' : 'No phone number', kind: 'primary', run: function () {
          if (!phone || !OA.phoneOk(phone)) return { error: 'Add a phone number for this client first.' };
          var left = recheck(); if (left.length) return { error: 'Replace ' + left.join(', ') + ' before opening the message.' };
          window.location.href = OA.smsHref(phone, area.value);
          if (o.onOpened) o.onOpened(area.value);
          return 'opened';
        } }
      ]
    });
  };

  /* ---------- page furniture ---------- */
  ui.pageHead = function (title, sub, actions) {
    return h('header', { class: 'pagehead' }, h('div', {}, h('h1', { text: title }), sub ? h('p', { class: 'sub', text: sub }) : null), actions ? h('div', { class: 'row' }, actions) : null);
  };
  ui.section = function (title, kids, o) {
    o = o || {};
    return h('section', { class: 'sec' + (o.cls ? ' ' + o.cls : ''), id: o.id }, title ? h('h2', { text: title }) : null, kids);
  };
  ui.ago = function (ts) { return OA.ago(ts); };
  ui.rowLink = function (href, kids, cls) { return h('a', { class: 'ledger-row ' + (cls || ''), href: href }, kids); };
})();
