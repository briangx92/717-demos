/* The one artist profile page. The address carries the artist's page variable (?artist=lex),
   which follows their name in the roster: rename an artist in the portal, publish, and every
   link the site builds uses the new variable. The built-in roster below carries each artist's
   photos and words; published portal content overrides the words, and the portal's draft
   portfolio (same browser) overrides the photos, exactly as the separate pages behaved. */
(function () {
  'use strict';
  var ROOT = '../../';
  var ROSTER = {
 "lex": {
  "key": "lex",
  "var": "lex",
  "name": "Alexis \"lex\"",
  "titleName": "Alexis \"lex\"",
  "desc": "Lex is a tattoo artist at Instattoosionalized in Northampton, PA. Horror, whimsical and spooky pieces, cartoon characters and high contrast work. See her work and send a request.",
  "socials": [
   {
    "p": "Instagram",
    "label": "@lextattss",
    "url": "https://www.instagram.com/lextattss"
   },
   {
    "p": "Facebook",
    "label": "lextatts",
    "url": "https://www.facebook.com/people/lextatts/61593932873434/"
   }
  ],
  "bioParas": [
   "Hi, I'm lex! I'm a freshly new tattoo artist! i love all things horror and whimsical. I love to tattoo things like cartoon characters, spooky, and high contrast!"
  ],
  "does": [
   "Horror",
   "Whimsical",
   "Cartoon characters",
   "Spooky",
   "High contrast"
  ],
  "work": [
   {
    "src": "portfolio/lex/images/lex-work-02.jpg",
    "alt": "Snoopy in a pumpkin costume tattoo",
    "cap": "Snoopy pumpkin, cartoon"
   },
   {
    "src": "portfolio/lex/images/lex-work-03.jpg",
    "alt": "Ghostface knife tattoo on a forearm",
    "cap": "Ghostface knife"
   },
   {
    "src": "portfolio/lex/images/lex-work-04.jpg",
    "alt": "Sun and moon with florals tattoo on an upper arm",
    "cap": "Sun and moon with florals"
   },
   {
    "src": "portfolio/lex/images/lex-work-05.jpg",
    "alt": "Rose wreath and infinity heart tattoos on a forearm",
    "cap": "Rose wreath and infinity heart"
   },
   {
    "src": "portfolio/lex/images/lex-work-06.jpg",
    "alt": "The word secrets tattooed down a finger",
    "cap": "Finger script"
   },
   {
    "src": "portfolio/lex/images/lex-work-07.jpg",
    "alt": "Small flamingo tattoo on an ankle",
    "cap": "Flamingo, ankle"
   },
   {
    "src": "portfolio/lex/images/lex-work-08.jpg",
    "alt": "Deathly Hallows symbol tattoo on a forearm",
    "cap": "Deathly Hallows symbol"
   },
   {
    "src": "portfolio/lex/images/lex-work-09.jpg",
    "alt": "The word Unbothered in script on a forearm",
    "cap": "Script lettering"
   },
   {
    "src": "portfolio/lex/images/lex-work-10.jpg",
    "alt": "Script tattoo reading be still and know, Psalm 46:10",
    "cap": "Psalm 46:10 script"
   },
   {
    "src": "portfolio/lex/images/lex-work-11.jpg",
    "alt": "Rose tattoo with the name kaya in script",
    "cap": "Rose with name script"
   },
   {
    "src": "portfolio/lex/images/lex-work-12.jpg",
    "alt": "Daisy stem tattoo on a leg",
    "cap": "Daisy stem"
   },
   {
    "src": "portfolio/lex/images/lex-work-13.jpg",
    "alt": "The numbers 666 tattooed on an arm",
    "cap": "666, bold numbers"
   },
   {
    "src": "portfolio/lex/images/lex-work-14.jpg",
    "alt": "Paw print tattoo with a galaxy fill",
    "cap": "Paw print"
   }
  ],
  "noteFirst": "Send the shop request form with lex picked, or message her on Instagram at @lextattss. Tell her the idea, where it is going, and roughly how big.",
  "portrait": "portfolio/lex/images/lex-portrait.jpg"
 },
 "liv": {
  "key": "liv",
  "var": "liv",
  "name": "Olivia \"Liv\"",
  "titleName": "Olivia \"Liv\"",
  "desc": "Liv is a tattoo artist at Instattoosionalized in Northampton, PA. Whimsical, soft and fairytale work, florals and cute characters. See her work and send a request.",
  "socials": [
   {
    "p": "Instagram",
    "label": "@Inked.by_liv",
    "url": "https://www.instagram.com/Inked.by_liv"
   },
   {
    "p": "TikTok",
    "label": "@Oliviaaaa._",
    "url": "https://www.tiktok.com/@Oliviaaaa._"
   }
  ],
  "bioParas": [
   "Hello! I'm Olivia but everyone calls me Liv! I'm a tattoo artist who loves all things whimsical, soft, and a little out of the ordinary. If you have an idea for a tattoo but aren't sure how to bring it to life, come see me.",
   "I love florals, cute little characters, and anything that feels like it belongs in a fairytale. My goal is to turn your ideas into a piece of art that's uniquely yours. Whether you come in with a fully formed idea or just a bunch of screenshots, I'm always excited to create something together!"
  ],
  "does": [
   "Whimsical",
   "Soft",
   "Florals",
   "Cute characters",
   "Fairytale pieces"
  ],
  "work": [
   {
    "src": "portfolio/liv/images/liv-work-02.jpg",
    "alt": "Character tattoo on a thigh",
    "cap": "Character piece"
   },
   {
    "src": "portfolio/liv/images/liv-work-03.jpg",
    "alt": "Lily tattoos with swirls on a forearm",
    "cap": "Lilies with swirls"
   },
   {
    "src": "portfolio/liv/images/liv-work-04.jpg",
    "alt": "Heart with wings memorial tattoo on a calf",
    "cap": "Heart with wings, memorial piece"
   },
   {
    "src": "portfolio/liv/images/liv-work-05.jpg",
    "alt": "Three small cat face tattoos on a forearm",
    "cap": "Three cat faces"
   },
   {
    "src": "portfolio/liv/images/liv-work-06.jpg",
    "alt": "Daisy tattoo with a face on a calf",
    "cap": "Daisy with a face"
   },
   {
    "src": "portfolio/liv/images/liv-work-07.jpg",
    "alt": "Floral tattoos on a forearm",
    "cap": "Florals"
   },
   {
    "src": "portfolio/liv/images/liv-work-08.jpg",
    "alt": "Baby footprint tattoos on a forearm",
    "cap": "Baby footprints"
   },
   {
    "src": "portfolio/liv/images/liv-work-09.jpg",
    "alt": "Eagle tattoo with a sword and scales on a forearm",
    "cap": "Eagle with sword and scales"
   },
   {
    "src": "portfolio/liv/images/liv-work-10.jpg",
    "alt": "Skull and crossbones tattoo on an arm",
    "cap": "Skull and crossbones"
   },
   {
    "src": "portfolio/liv/images/liv-work-11.jpg",
    "alt": "Script lettering tattoo on a chest",
    "cap": "Script lettering"
   },
   {
    "src": "portfolio/liv/images/liv-work-12.jpg",
    "alt": "Small tattoo on an upper back",
    "cap": "Small piece, upper back"
   }
  ],
  "noteFirst": "Send the shop request form with Liv picked, or message her on Instagram at @Inked.by_liv. Fully formed idea or just a bunch of screenshots, she is always excited to create something together.",
  "portrait": "portfolio/liv/images/liv-portrait.jpg"
 },
 "diana": {
  "key": "diana",
  "var": "diana",
  "name": "Diana",
  "titleName": "Diana",
  "desc": "Diana is a tattoo artist at Instattoosionalized in Northampton, PA. Realism, characters, dark gothic work, detailed designs and cover-ups. See her work and send a request.",
  "socials": [
   {
    "p": "Instagram",
    "label": "@excommunicated_af",
    "url": "https://www.instagram.com/excommunicated_af"
   },
   {
    "p": "TikTok",
    "label": "@excommunicated_pos",
    "url": "https://www.tiktok.com/@excommunicated_pos"
   }
  ],
  "bioParas": [
   "I enjoy doing tattoos ranging from realism, characters of all sorts, dark gothic art, to detailed designs of all natures. I as well love to tattoo cover up tattoos"
  ],
  "does": [
   "Realism",
   "Characters",
   "Dark gothic",
   "Detailed designs",
   "Cover-ups"
  ],
  "work": [
   {
    "src": "portfolio/diana/images/diana-work-02.jpg",
    "alt": "Detailed tattoo covering a hand",
    "cap": "Detailed hand piece"
   },
   {
    "src": "portfolio/diana/images/diana-work-03.jpg",
    "alt": "Dark hooded figure tattoo, black and grey",
    "cap": "Dark hooded figure, black and grey"
   },
   {
    "src": "portfolio/diana/images/diana-work-04.jpg",
    "alt": "Monarch butterfly tattoo on a forearm",
    "cap": "Monarch butterfly"
   },
   {
    "src": "portfolio/diana/images/diana-work-05.jpg",
    "alt": "Stag beetle tattoo on a forearm",
    "cap": "Stag beetle"
   },
   {
    "src": "portfolio/diana/images/diana-work-06.jpg",
    "alt": "Blue fish tattoo with script on a forearm",
    "cap": "Blue fish with script"
   },
   {
    "src": "portfolio/diana/images/diana-work-07.jpg",
    "alt": "Color tattoo on a forearm",
    "cap": "Color piece, forearm"
   },
   {
    "src": "portfolio/diana/images/diana-work-08.jpg",
    "alt": "Phoenix tattoo on a shoulder",
    "cap": "Phoenix, shoulder"
   },
   {
    "src": "portfolio/diana/images/diana-work-09.jpg",
    "alt": "Sleeve tattoo in progress on a forearm",
    "cap": "Sleeve in progress"
   },
   {
    "src": "portfolio/diana/images/diana-work-10.jpg",
    "alt": "Red and black tattoo design on a forearm",
    "cap": "Red and black design"
   },
   {
    "src": "portfolio/diana/images/diana-work-11.jpg",
    "alt": "Woman's face tattoo in an ornate frame on a forearm",
    "cap": "Woman's face in an ornate frame"
   },
   {
    "src": "portfolio/diana/images/diana-work-12.jpg",
    "alt": "Lizard tattoo on a forearm",
    "cap": "Lizard"
   },
   {
    "src": "portfolio/diana/images/diana-work-13.jpg",
    "alt": "Creature silhouette tattoo on a forearm",
    "cap": "Creature silhouette"
   },
   {
    "src": "portfolio/diana/images/diana-work-14.jpg",
    "alt": "Cartoon character tattoo with script on a leg",
    "cap": "Cartoon character with script"
   },
   {
    "src": "portfolio/diana/images/diana-work-15.jpg",
    "alt": "Character in a dress tattoo on a side",
    "cap": "Character in a dress"
   },
   {
    "src": "portfolio/diana/images/diana-work-16.jpg",
    "alt": "Orange floral tattoo on a forearm",
    "cap": "Orange florals"
   },
   {
    "src": "portfolio/diana/images/diana-work-17.jpg",
    "alt": "Hearts and florals tattoo on a forearm",
    "cap": "Hearts and florals"
   },
   {
    "src": "portfolio/diana/images/diana-work-18.jpg",
    "alt": "Small daisy tattoo on a forearm",
    "cap": "Small daisies"
   },
   {
    "src": "portfolio/diana/images/diana-work-19.jpg",
    "alt": "Cherry tattoo on a leg",
    "cap": "Cherries"
   },
   {
    "src": "portfolio/diana/images/diana-work-20.jpg",
    "alt": "Balloon dog tattoo on an ankle",
    "cap": "Balloon dog, ankle"
   },
   {
    "src": "portfolio/diana/images/diana-work-21.jpg",
    "alt": "Skull tattoo on a forearm",
    "cap": "Skull design, forearm"
   },
   {
    "src": "portfolio/diana/images/diana-work-22.jpg",
    "alt": "Fine line tattoo on a wrist",
    "cap": "Fine line wrist piece"
   },
   {
    "src": "portfolio/diana/images/diana-work-23.jpg",
    "alt": "Ornamental script tattoo on a forearm",
    "cap": "Ornamental script"
   },
   {
    "src": "portfolio/diana/images/diana-work-24.jpg",
    "alt": "Small script tattoo with a bird on a wrist",
    "cap": "Small script with a bird"
   }
  ],
  "noteFirst": "Send the shop request form with Diana picked, or message her on Instagram at @excommunicated_af. Tell her the idea, where it is going, and roughly how big.",
  "portrait": "portfolio/diana/images/diana-portrait.jpg"
 }
};

  function paras(bio) { return String(bio || '').split(/\n\s*\n/).map(function (p) { return p.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean); }
  function nickOf(name) {
    var qn = /["\u201c]([^"\u201d]+)["\u201d]/.exec(name || '');
    var first = (qn ? qn[1].trim() : String(name || '').replace(/["\u201c\u201d]/g, '').split(/\s+/)[0]) || '';
    return first;
  }
  function srcFor(src) {
    if (!src || /^(idb:|https?:|data:|blob:|\/|\.\.)/.test(src)) return src;
    return ROOT + src;
  }

  var ICONS = {
    Instagram: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none"/></svg>',
    Facebook: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M13.5 21.9v-7.2h2.42l.36-2.8H13.5V10.1c0-.81.23-1.36 1.4-1.36h1.5V6.25c-.26-.04-1.15-.11-2.19-.11-2.17 0-3.65 1.32-3.65 3.75v2.01H8.13v2.8h2.43v7.2a10.03 10.03 0 0 0 2.94 0z"/></svg>',
    TikTok: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>'
  };
  function chip(s) {
    var a = document.createElement('a');
    a.className = 'c-chip'; a.href = s.url; a.target = '_blank'; a.rel = 'noopener';
    if (ICONS[s.p]) a.innerHTML = ICONS[s.p];
    a.appendChild(document.createTextNode(s.label));
    return a;
  }

  function roster(by) {
    document.title = 'Our artists | Instattoosionalized Tattoos and Piercings';
    var main = document.querySelector('main');
    if (!main) return;
    while (main.firstChild) main.removeChild(main.firstChild);
    var list = [];
    if (by) {
      Object.keys(by).forEach(function (k) {
        var r = by[k];
        if (!r.visible) return;
        var b = ROSTER[r.key] || null;
        list.push({ varName: r.slug, name: r.name, role: r.role || '', portrait: b ? b.portrait : '' });
      });
    }
    if (!list.length) {
      Object.keys(ROSTER).forEach(function (k) {
        var b = ROSTER[k];
        list.push({ varName: b.var, name: b.name, role: '', portrait: b.portrait });
      });
    }
    var box = document.createElement('section'); box.className = 'p-sec';
    var h1 = document.createElement('h1'); h1.className = 'p-name'; h1.textContent = 'Our artists';
    var grid = document.createElement('div'); grid.className = 'p-roster';
    list.forEach(function (a) {
      var card = document.createElement('a'); card.className = 'p-roster-card'; card.href = 'artist.html?artist=' + a.varName;
      if (a.portrait) { var im = document.createElement('img'); im.src = srcFor(a.portrait); im.alt = 'Portrait of ' + a.name; im.loading = 'lazy'; card.appendChild(im); }
      var nm = document.createElement('span'); nm.className = 'p-roster-name'; nm.textContent = a.name;
      card.appendChild(nm);
      if (a.role) { var rl = document.createElement('span'); rl.className = 'p-roster-role'; rl.textContent = a.role; card.appendChild(rl); }
      grid.appendChild(card);
    });
    box.append(h1, grid); main.appendChild(box);
  }

  function unavailable() {
    document.title = 'Instattoosionalized Tattoos and Piercings';
    var main = document.querySelector('main');
    if (!main) return;
    while (main.firstChild) main.removeChild(main.firstChild);
    var box = document.createElement('section'); box.className = 'p-sec';
    var h1 = document.createElement('h1'); h1.className = 'p-name'; h1.textContent = 'This page is not available right now';
    var p = document.createElement('p'); p.textContent = 'The shop has taken this page down for now.';
    var back = document.createElement('a'); back.className = 'c-btn c-btn--solid'; back.href = ROOT + 'instattoosionalized-tattoos-and-piercings.html'; back.textContent = 'Back to the shop';
    box.append(h1, p, back); main.appendChild(box);
  }

  function wireBa(stage) {
    function setSplit(e) {
      var r = stage.getBoundingClientRect();
      var p = (e.clientX - r.left) / r.width * 100;
      p = Math.max(4, Math.min(96, p));
      stage.style.setProperty('--split', p + '%');
    }
    stage.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* no capture */ }
      setSplit(e);
      var mv = function (ev) { setSplit(ev); };
      var up = function () { stage.removeEventListener('pointermove', mv); stage.removeEventListener('pointerup', up); stage.removeEventListener('pointercancel', up); };
      stage.addEventListener('pointermove', mv); stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    });
  }

  function main() {
    var SC = window.SiteContent;
    var varName = '';
    try { varName = new URLSearchParams(location.search).get('artist') || ''; } catch (e) { /* no variable: the roster */ }

    var by = SC ? SC.cleanArtists(SC.read()) : null;
    var rec = null;
    if (by) {
      if (by[varName]) rec = by[varName];
      else Object.keys(by).forEach(function (k) { if (by[k].key === varName) rec = by[k]; });
    }
    var baked = ROSTER[varName] || (rec && ROSTER[rec.key]) || null;
    if ((rec && !rec.visible) || (!rec && !baked)) { roster(by); return; }

    var key = rec ? rec.key : baked.key;
    var curVar = rec ? rec.slug : varName;
    var name = rec ? rec.name : baked.name;
    var nick = rec ? rec.nick : nickOf(baked.name);
    var bioParas = rec ? paras(rec.bio) : baked.bioParas;
    var socials = rec ? rec.socials : baked.socials;
    var does = baked ? baked.does : (rec && rec.role ? [rec.role] : []);
    var portrait = baked ? baked.portrait : '';
    var work = baked ? baked.work.map(function (w) { return { src: w.src, cap: w.cap, alt: w.alt }; }) : [];

    /* The portal's draft portfolio in this browser overrides the built-in photos. */
    try {
      var st = JSON.parse(localStorage.getItem('oa-state-v3') || 'null');
      var items = st && st.portfolio && st.portfolio[key];
      if (items && items.length) {
        work = items.map(function (w) {
          if (w.ba) return { ba: { a: srcFor(w.ba.a), b: srcFor(w.ba.b), acap: w.ba.acap, bcap: w.ba.bcap, title: w.ba.title, story: w.ba.story }, cap: w.cap };
          return { src: srcFor(w.src), cap: w.cap || '', alt: w.cap || '' };
        });
      }
    } catch (e) { /* built-in photos stay */ }

    document.title = name + ' | Instattoosionalized Tattoos and Piercings';
    var desc = (baked && baked.name === name) ? baked.desc : (nick + ' is an artist at Instattoosionalized in Northampton, PA. See their work and send a request.');
    var md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute('content', desc);
    var ogT = document.querySelector('meta[property="og:title"]'); if (ogT) ogT.setAttribute('content', document.title);
    var ogD = document.querySelector('meta[property="og:description"]'); if (ogD) ogD.setAttribute('content', desc);
    if (portrait) {
      var ogI = document.querySelector('meta[property="og:image"]');
      if (ogI) ogI.setAttribute('content', location.href.split('/view/pages/')[0] + '/' + portrait);
    }

    var img = document.querySelector('.p-portrait');
    if (img) {
      if (portrait) { img.src = srcFor(portrait); img.alt = 'Portrait of ' + nick + ', tattoo artist at Instattoosionalized'; }
      else img.hidden = true;
    }
    var nameEl = document.querySelector('.p-name'); if (nameEl) nameEl.textContent = name;

    var links = document.querySelector('.p-links');
    if (links) {
      while (links.firstChild) links.removeChild(links.firstChild);
      socials.forEach(function (s) { links.appendChild(chip(s)); });
      links.hidden = !socials.length;
    }

    var about = document.querySelector('.p-about');
    if (about) {
      var h2 = about.querySelector('h2'); if (h2) h2.textContent = 'In ' + nick + '\u2019s words';
      Array.prototype.slice.call(about.querySelectorAll('p')).forEach(function (n) { n.remove(); });
      bioParas.forEach(function (t) { var p = document.createElement('p'); p.textContent = t; about.appendChild(p); });
      about.hidden = !bioParas.length;
    }

    var chipsBox = document.querySelector('.p-chips');
    if (chipsBox) {
      while (chipsBox.firstChild) chipsBox.removeChild(chipsBox.firstChild);
      does.forEach(function (d) { var s = document.createElement('span'); s.className = 'c-chip'; s.textContent = d; chipsBox.appendChild(s); });
      var sec = chipsBox.closest('section'); if (sec) sec.hidden = !does.length;
    }

    var grid = document.querySelector('.p-grid');
    if (grid) {
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      work.forEach(function (w) {
        var f = document.createElement('figure');
        if (w.ba) {
          var stage = document.createElement('div'); stage.className = 'ba-stage';
          var aft = document.createElement('img'); aft.loading = 'lazy'; aft.src = w.ba.a; aft.alt = w.ba.acap || w.ba.title || ''; aft.draggable = false;
          var bef = document.createElement('img'); bef.className = 'ba-before'; bef.src = w.ba.b; bef.alt = w.ba.bcap || ''; bef.draggable = false;
          var lb = document.createElement('span'); lb.className = 'ba-lab b'; lb.textContent = 'Before';
          var la = document.createElement('span'); la.className = 'ba-lab a'; la.textContent = 'After';
          var hd = document.createElement('span'); hd.className = 'ba-handle';
          stage.append(aft, bef, lb, la, hd); wireBa(stage); f.appendChild(stage);
          var c2 = document.createElement('figcaption'); c2.textContent = (w.ba.title || w.cap || '') + (w.ba.story ? ' \u00b7 ' + w.ba.story : ''); f.appendChild(c2);
        } else {
          var im = document.createElement('img'); im.loading = 'lazy'; im.src = srcFor(w.src); im.alt = w.alt || w.cap || '';
          var c = document.createElement('figcaption'); c.textContent = w.cap || '';
          f.append(im, c);
        }
        grid.appendChild(f);
      });
      var wsec = grid.closest('section'); if (wsec) wsec.hidden = !work.length;
    }

    var note = document.querySelector('.p-note');
    if (note) {
      var nh = note.querySelector('h2'); if (nh) nh.textContent = 'Booking with ' + nick;
      var first = note.querySelector('p');
      if (first) {
        if (rec) {
          var ig = rec.socials.filter(function (x) { return x.p === 'Instagram'; })[0];
          first.textContent = 'Send the shop request form with ' + nick + ' picked' + (ig ? ', or message them on Instagram at ' + ig.label : '') + '. Tell them the idea, where it is going, and roughly how big.';
        } else if (baked) first.textContent = baked.noteFirst;
      }
    }

    var req = document.querySelector('.p-req');
    if (req) {
      var rh = req.querySelector('h2'); if (rh) rh.textContent = 'Want work by ' + nick + '?';
      var rp = req.querySelector('p'); if (rp) rp.textContent = 'Send a request and pick ' + nick + ' by name. The shop writes back to set it up.';
      var ra = req.querySelector('a.c-btn');
      if (ra) { ra.textContent = 'Request with ' + nick; ra.href = ROOT + 'instattoosionalized-tattoos-and-piercings.html?artist=' + curVar + '#ask'; }
    }

    if (SC) { SC.applyDepositLine(); SC.stickyRequest(); }
  }

  /* This script sits after the page content and after the reader, so the whole page and
     window.SiteContent are ready; it runs at once, before the lightbox script below it
     collects the photos. */
  main();
})();
