/* Content published from the owner portal: banner, announcements, phone, hours, prices, services, policies. The checking lives in scripts/site-content.js. */
(function(){
  'use strict';
  var SC = window.SiteContent; if (!SC) return;
  try {
    var data = SC.read(), el = SC.el;
    SC.previewBar(!!data);
    SC.homePolicies();
    SC.mergeSite(SITE);
    SC.applyDepositLine();
    SC.applyReviews();
    if (!data) return;
    var c = SC.cleanNews(data), today = SC.shopToday(SITE.timeZone);
    if (c.banner && SC.active(c.banner, today)) {
      var bar = el('div', 's-banner', c.banner.text.trim()); bar.setAttribute('role', 'status');
      var before = document.getElementById('news') || document.querySelector('[data-module="hero"]');
      if (before && before.parentNode) before.parentNode.insertBefore(bar, before);
    }
    var show = c.items.filter(function(a){ return SC.active(a, today); }).sort(function(a, b){
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return (b.start || '') < (a.start || '') ? -1 : (b.start || '') > (a.start || '') ? 1 : 0;
    }).slice(0, 3);
    var box = document.getElementById('news'), list = document.getElementById('news-list');
    if (box && list && show.length) {
      show.forEach(function(a){
        var li = el('li'), art = el('article', 's-news__item s-news__item--' + a.kind);
        art.append(el('p', 'c-kicker', SC.KINDS[a.kind]), el('h2', 's-news__title', a.title.trim()));
        if (a.body && a.body.trim()) art.append(el('p', 's-news__body', a.body.trim()));
        if (a.link) { var l = el('a', 's-news__link', 'More details'); l.href = a.link; l.target = '_blank'; l.rel = 'noopener noreferrer'; art.append(l); }
        li.append(art); list.append(li);
      });
      box.hidden = false;
    }
  } catch (e) { SC.warn('Could not show the published content: ' + e.message); }
})();
