(function(){
  var b = document.getElementById('p-burger'), m = document.getElementById('p-menu');
  if(!b || !m) return;
  function close(){ m.hidden = true; b.setAttribute('aria-expanded','false'); }
  b.addEventListener('click', function(e){ e.stopPropagation(); var open = m.hidden; m.hidden = !open; b.setAttribute('aria-expanded', String(open)); });
  document.addEventListener('click', function(e){ if(!m.hidden && !m.contains(e.target)) close(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') close(); });
})();
(function(){
  /* Newest first: figures carry the date their photo entered the site
     (data-date). Undated figures keep their place after the dated ones. */
  var grid = document.querySelector('.p-grid');
  if(!grid) return;
  var figs = Array.prototype.slice.call(grid.querySelectorAll('figure'));
  figs.map(function(f, i){ return [f, i]; }).sort(function(a, b){
    var da = a[0].getAttribute('data-date') || '', db = b[0].getAttribute('data-date') || '';
    if(da && db && da !== db) return da < db ? 1 : -1;
    if(da && !db) return -1;
    if(!da && db) return 1;
    return a[1] - b[1];
  }).forEach(function(x){ grid.appendChild(x[0]); });
})();
