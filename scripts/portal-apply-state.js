(function(){
  try {
    var fl = document.getElementById('oa-footer-login');
    var raw = localStorage.getItem('oa-state-v3');
    if (!raw) return;
    var st = JSON.parse(raw);
    function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    if (st.phoneDisplay && st.phoneE164) {
      SITE.phoneDisplay = st.phoneDisplay; SITE.phoneE164 = st.phoneE164;
      SITE.phoneHref = 'tel:' + st.phoneE164; SITE.smsBase = 'sms:' + st.phoneE164;
      document.querySelectorAll('[data-fill="phoneDisplay"]').forEach(function(e){ e.textContent = st.phoneDisplay; });
      document.querySelectorAll('[data-href="phoneHref"]').forEach(function(e){ e.setAttribute('href', SITE.phoneHref); });
      document.querySelectorAll('a[href^="tel:"]').forEach(function(e){ e.setAttribute('href', SITE.phoneHref); });
      var ac = document.querySelector('#ask-call a'); if (ac) ac.textContent = st.phoneDisplay;
    }
    if (Array.isArray(st.ticker) && st.ticker.length) {
      var applyTicker = function(){ var box = document.getElementById('ticker-scroll');
        if (box) { box.innerHTML = ''; var frag = document.createDocumentFragment();
          for (var hh = 0; hh < 2; hh++) for (var rr = 0; rr < 6; rr++) st.ticker.forEach(function(p){ frag.append(document.createTextNode(p)); frag.append(el('i', null, '✦')); });
          box.append(frag); } };
      if (document.readyState === 'complete') applyTicker(); else window.addEventListener('load', applyTicker);
    }
    if (Array.isArray(st.hours) && st.hours.length === 7) {
      SITE.hours.splice(0, SITE.hours.length, ...st.hours);
      var table = document.getElementById('hours-table');
      if (table) { table.innerHTML = ''; var tb = el('tbody'); var today = new Intl.DateTimeFormat('en-US', {timeZone: SITE.timeZone, weekday: 'long'}).format(new Date());
        if (SITE.hours.every(function(x){ return x[1] === null; })) { var tr0 = el('tr'); tr0.append(el('td', null, 'Hours'), el('td', null, 'Call for hours')); tb.append(tr0); }
        else SITE.hours.forEach(function(x){ var tr = el('tr'); if (x[0] === today) tr.className = 'is-today'; tr.append(el('td', null, x[0]), el('td', null, x[1] === null ? 'Closed' : x[1])); tb.append(tr); });
        table.append(tb); }
    }
    if (Array.isArray(st.services) && st.services.length) {
      var labels = {tattoo: 'Tattoos', piercing: 'Piercing'};
      var groups = [];
      st.services.forEach(function(s){
        var g = null;
        for (var k = 0; k < groups.length; k++) if (groups[k].family === s.family) g = groups[k];
        if (!g) { g = {family: s.family, label: labels[s.family] || s.family, items: []}; groups.push(g); }
        g.items.push({id: s.id, name: s.name, blurb: s.blurb});
      });
      SITE.pickGroups.splice(0, SITE.pickGroups.length, ...groups);
      var grid = document.getElementById('service-cards');
      if (grid) { grid.innerHTML = ''; var n = 0;
        SITE.pickGroups.forEach(function(g){ g.items.forEach(function(item){ n++;
          var art = el('article', 'c-card');
          var num = el('span', 's-services__num', String(n).padStart(2, '0')); num.setAttribute('aria-hidden', 'true');
          var b = el('button', 'c-btn c-btn--ghost', 'Add'); b.type = 'button'; b.dataset.add = item.id; b.setAttribute('aria-pressed', 'false');
          (function(it, btn){ b.addEventListener('click', function(){ if (window.__form) window.__form.toggleService(it.id, btn); }); })(item, b);
          art.append(num, el('h3', null, item.name), el('p', null, item.blurb), b); grid.append(art);
        }); });
      }
    }
    if (Array.isArray(st.prices) && st.prices.length) {
      SITE.prices.splice(0, SITE.prices.length, ...st.prices);
      var pbox = document.getElementById('price-groups');
      if (pbox) { pbox.innerHTML = '';
        SITE.prices.forEach(function(g){ var grp = el('div', 's-prices__group'); grp.append(el('h3', null, g.group));
          g.items.forEach(function(pair){ var row = el('div', 's-prices__row'); var right = el('span'); right.append(el('b', null, pair[1])); if (g.sample) right.append(el('small', null, 'sample')); row.append(el('span', null, pair[0]), el('span', 's-prices__lead'), right); row.children[1].setAttribute('aria-hidden', 'true'); grp.append(row); });
          pbox.append(grp); });
      }
    }
    if (Array.isArray(st.photos) && st.photos.length) {
      SITE.photos.splice(0, SITE.photos.length, ...st.photos);
      var work = document.querySelector('[data-module="work"]');
      if (work) work.dispatchEvent(new CustomEvent('pv-rebuild-work'));
    }
    if (st.policies) { Object.keys(st.policies).forEach(function(k){ var row = document.querySelector('[data-pol="' + k + '"]'); if (!row) return; var t = (st.policies[k] || '').trim(); var span = row.querySelector('[data-pol-text]'); if (t) { if (span) span.textContent = t; row.hidden = false; } else { row.hidden = true; } }); var pc = document.getElementById('policies-card'); if (pc && !pc.querySelector('[data-pol]:not([hidden])')) pc.hidden = true; } if (st.bookedOut) { Object.keys(st.bookedOut).forEach(function(slug){ var r = st.bookedOut[slug] || {}; (SITE.artists || []).forEach(function(ar){ if (ar.slug === slug) { ar.bookedOutFrom = r.from || ''; ar.bookedOutTo = r.to || ''; } }); }); }
    if (st.banner && st.banner.on && st.banner.text && !localStorage.getItem('oa2:published:v1')) {
      var isoToday = new Date().toISOString().slice(0, 10);
      if ((!st.banner.from || st.banner.from <= isoToday) && (!st.banner.to || st.banner.to >= isoToday)) {
        var bar = el('div', null, st.banner.text);
        bar.setAttribute('style', 'background:#BE1E2D;color:#fff;text-align:center;padding:9px 14px;font-size:14.5px;font-weight:600;');
        var heroEl = document.querySelector('[data-module="hero"]');
        if (heroEl && heroEl.parentNode) heroEl.parentNode.insertBefore(bar, heroEl);
      }
    }
  } catch (e) {}
})();
