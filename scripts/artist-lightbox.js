(function(){
  var figs = Array.prototype.slice.call(document.querySelectorAll('figure.p-feat, .p-grid figure')).filter(function (f) { return !f.closest('[hidden]'); });
  if (!figs.length) return;
  var items = figs.map(function(f){
    var img = f.querySelector('img');
    var cap = f.querySelector('figcaption');
    return { img: img, cap: cap ? cap.textContent.trim().replace(/\s+/g,' ') : '' };
  });
  function srcOf(it) { return it.img ? (it.img.src || '') : ''; }
  var ZOOM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  var lbx = document.getElementById('lbx'), im = document.getElementById('lbx-img'),
      capEl = document.getElementById('lbx-cap'), cntEl = document.getElementById('lbx-count'),
      strip = document.getElementById('lbx-strip'), idx = 0, lastWheel = 0;
  var stripBuilt = false;
  function buildStrip(){
    if (stripBuilt) return; stripBuilt = true;
    items.forEach(function(it, i){
      var t = document.createElement('img');
      t.src = srcOf(it); t.alt = '';
      t.addEventListener('click', function(){ show(i); });
      strip.appendChild(t);
    });
  }
  function show(i){
    idx = (i + items.length) % items.length;
    im.src = srcOf(items[idx]);
    capEl.textContent = items[idx].cap;
    cntEl.textContent = (idx + 1) + ' of ' + items.length;
    Array.prototype.forEach.call(strip.children, function(t, j){ t.classList.toggle('on', j === idx); });
    var on = strip.children[idx];
    if (on) on.scrollIntoView({ block:'nearest', inline:'center' });
  }
  function open(i){
    buildStrip();
    show(i);
    lbx.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close(){
    lbx.classList.remove('open');
    document.body.style.overflow = '';
  }
  figs.forEach(function(f, i){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'lb-zoom'; b.setAttribute('aria-label', 'View photo full screen');
    b.innerHTML = ZOOM;
    b.addEventListener('click', function(ev){ ev.stopPropagation(); open(i); });
    f.appendChild(b);
    var img = f.querySelector('img');
    if (img) { img.style.cursor = 'zoom-in'; img.addEventListener('click', function(){ open(i); }); }
  });
  document.getElementById('lbx-x').addEventListener('click', close);
  document.getElementById('lbx-prev').addEventListener('click', function(){ show(idx - 1); });
  document.getElementById('lbx-next').addEventListener('click', function(){ show(idx + 1); });
  document.getElementById('lbx-stage').addEventListener('click', function(ev){ if (ev.target === this) close(); });
  document.addEventListener('keydown', function(ev){
    if (!lbx.classList.contains('open')) return;
    if (ev.key === 'Escape') close();
    if (ev.key === 'ArrowRight') show(idx + 1);
    if (ev.key === 'ArrowLeft') show(idx - 1);
  });
  lbx.addEventListener('wheel', function(ev){
    if (!lbx.classList.contains('open')) return;
    var now = Date.now();
    if (now - lastWheel < 350) return;
    lastWheel = now;
    show(idx + (ev.deltaY > 0 ? 1 : -1));
  }, { passive:true });
  var tx = null;
  lbx.addEventListener('touchstart', function(ev){ tx = ev.changedTouches[0].clientX; }, { passive:true });
  lbx.addEventListener('touchend', function(ev){
    if (tx === null) return;
    var dx = ev.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 44) show(idx + (dx < 0 ? 1 : -1));
    tx = null;
  }, { passive:true });
})();
