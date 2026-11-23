(function(){
  var b = document.getElementById('p-burger'), m = document.getElementById('p-menu');
  if(!b || !m) return;
  function close(){ m.hidden = true; b.setAttribute('aria-expanded','false'); }
  b.addEventListener('click', function(e){ e.stopPropagation(); var open = m.hidden; m.hidden = !open; b.setAttribute('aria-expanded', String(open)); });
  document.addEventListener('click', function(e){ if(!m.hidden && !m.contains(e.target)) close(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') close(); });
})();
