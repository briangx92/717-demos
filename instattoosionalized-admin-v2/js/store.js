/* State, persistence, sample data, and the image store.
   Demo mode keeps everything in this browser (localStorage for data, IndexedDB for uploaded photos).
   Every change goes through OA.store.commit(), which is the one place a live backend would plug in. */
(function () {
  'use strict';
  var OA = window.OA, KEY = 'oa2:state:v1';
  var S = OA.store = { state: null, error: null, subs: [], seq: 0 };

  OA.STATUSES = ['New', 'Contacted', 'Consultation Scheduled', 'Awaiting Deposit', 'Booked', 'Closed'];
  OA.STATUS_LABEL = { 'New': 'New', 'Contacted': 'Contacted', 'Consultation Scheduled': 'Consult set', 'Awaiting Deposit': 'Deposit pending', 'Booked': 'Booked', 'Closed': 'Closed' };
  OA.APPT_STATUS = { booked: 'Booked', arrived: 'In the chair', done: 'Done', noshow: 'No-show', cancelled: 'Cancelled' };
  OA.APPT_TYPES = { consult: 'Consultation', session: 'Tattoo session', touchup: 'Touch-up', piercing: 'Piercing', other: 'Other' };

  S.subscribe = function (fn) { S.subs.push(fn); };
  S.emit = function () { S.subs.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); };
  S.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(S.state)); S.error = null; return true; }
    catch (e) {
      S.error = 'This browser would not save your changes (' + (e && e.name === 'QuotaExceededError' ? 'storage is full' : 'storage is blocked') + '). What you see now will be lost when this tab closes. Download a backup from Settings, then free up space.';
      return false;
    }
  };
  S.commit = function () { S.state.touched = true; S.seq++; S.save(); S.emit(); };

  S.load = function () {
    var raw = null, st = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { S.error = 'This browser is blocking storage, so nothing you change here can be kept.'; }
    if (raw) {
      try { st = JSON.parse(raw); } catch (e) {
        try { localStorage.setItem(KEY + ':unreadable:' + Date.now(), raw); } catch (e2) { /* nothing more to try */ }
        S.error = 'Saved data could not be read, so the sample data was loaded instead. The unreadable copy was kept in this browser.';
        st = null;
      }
    }
    if (!st || st.v !== 1) { st = OA.freshState(); S.state = st; S.save(); }
    S.state = OA.migrate(st);
    if (!st.touched && st.anchor !== OA.todayISO()) { OA.refreshSamples(true); }
  };
  S.reset = function () { S.state = OA.freshState(); S.error = null; OA.clearLive(); S.save(); S.emit(); };
  S.replace = function (st) { S.state = OA.migrate(st); S.save(); S.emit(); };
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY || !e.newValue) return;
    try { S.state = OA.migrate(JSON.parse(e.newValue)); S.emit(); } catch (err) { /* ignore a half-written value */ }
  });

  /* ---------- sample data ---------- */
  function hoursFromSeed(seed) {
    return seed.hours.map(function (p) {
      if (!p[1]) return { day: p[0], open: null, close: null };
      var m = p[1].match(/(\d+):(\d+)\s*(AM|PM)\s*\S+\s*(\d+):(\d+)\s*(AM|PM)/i);
      if (!m) return { day: p[0], open: null, close: null };
      function t(h, mi, ap) { h = +h % 12; if (/pm/i.test(ap)) h += 12; return OA.pad(h) + ':' + mi; }
      return { day: p[0], open: t(m[1], m[2], m[3]), close: t(m[4], m[5], m[6]) };
    });
  }
  OA.isOpenDay = function (iso, hours) { var hrs = hours || S.state.site.hours; var x = hrs[(OA.dow(iso) + 6) % 7]; return !!(x && x.open); };
  OA.hoursFor = function (iso) { return S.state.site.hours[(OA.dow(iso) + 6) % 7]; };

  function openDays(from, n, hours) { var out = [], d = from; while (out.length < n) { if (OA.isOpenDay(d, hours)) out.push(d); d = OA.addDays(d, 1); if (OA.diffDays(d, from) > 60) break; } return out; }
  function pastOpen(from, n, hours) { var out = [], d = OA.addDays(from, -1); while (out.length < n) { if (OA.isOpenDay(d, hours)) out.push(d); d = OA.addDays(d, -1); if (OA.diffDays(from, d) > 90) break; } return out; }

  function makeSamples(today, hours) {
    var now = Date.now(), H = 3600000, D = 86400000;
    var up = openDays(today, 6, hours), past = pastOpen(today, 12, hours);
    var clients = [], appts = [], requests = [];
    function client(name, phone, extra) {
      var c = { id: OA.uid('c'), name: name, phone: phone, email: '', notes: '', consentAt: null, idChecked: false, created: now - 30 * D, sample: true };
      Object.keys(extra || {}).forEach(function (k) { c[k] = extra[k]; });
      clients.push(c); return c;
    }
    var P = function (n) { return '(610) 555-01' + (n < 10 ? '0' : '') + n; };
    var C = {
      sam: client('Sam R.', P(11), { consentAt: now - 2 * D, idChecked: true }),
      casey: client('Casey B.', P(12)),
      mia: client('Mia T.', P(13), { consentAt: now - 26 * D, idChecked: true, notes: 'Repeat client. Likes florals.' }),
      ana: client('Ana P.', P(14)),
      priya: client('Priya N.', P(15)),
      mike: client('Mike K.', P(16), { consentAt: now - D, idChecked: true }),
      jordan: client('Jordan T.', P(17), { consentAt: now - 20 * D, idChecked: true, notes: 'Large piece in four sessions.' }),
      tom: client('Tom W.', P(18), { consentAt: now - D, idChecked: true }),
      chris: client('Chris P.', P(19)),
      riley: client('Riley S.', P(20), { consentAt: now - 21 * D, idChecked: true }),
      avery: client('Avery L.', P(21), { consentAt: now - 17 * D, idChecked: true }),
      noah: client('Noah G.', P(22), { consentAt: now - 9 * D, idChecked: true }),
      devon: client('Devon H.', P(23)),
      jess: client('Jess M.', P(24)),
      jules: client('Jules M.', P(25)),
      sam2: client('Sam K.', P(26)),
      taylor: client('Taylor R.', P(27)),
      dana: client('Dana R.', P(28)),
      casey2: client('Casey L.', P(29)),
      alex: client('Alex Q.', P(30))
    };
    function appt(date, artist, start, end, c, piece, type, extra) {
      var a = { id: OA.uid('a'), date: date, artist: artist, start: start, end: end, client: c.name, clientId: c.id, piece: piece, type: type, status: 'booked', deposit: 'none', price: '', note: '', requestId: '', followUp: null, sample: true };
      Object.keys(extra || {}).forEach(function (k) { a[k] = extra[k]; });
      appts.push(a); return a;
    }
    var d0 = up[0], d1 = up[1], d2 = up[2], d3 = up[3], d4 = up[4];
    var todayOpen = d0 === today;
    var aBulldog, aScript, aConsultPriya, aConsultAna;
    if (todayOpen) {
      appt(d0, 'lex', '12:00', '13:30', C.sam, 'Hello Kitty in a Jason mask', 'session', { deposit: 'paid', price: '$140' });
      appt(d0, 'lex', '15:00', '16:30', C.casey, 'Spooky cartoon, calf', 'session', { note: 'Walk-in. Deposit taken at the counter.', deposit: 'paid', price: '$120' });
      appt(d0, 'liv', '13:00', '14:30', C.mia, 'Bunny with florals', 'session', { deposit: 'paid', price: '$160' });
      aConsultAna = appt(d0, 'liv', '16:00', '17:00', C.ana, 'Fairytale piece', 'consult');
      aConsultPriya = appt(d0, 'diana', '12:00', '13:00', C.priya, 'Cover-up ideas', 'consult');
      aBulldog = appt(d0, 'diana', '14:00', '16:00', C.mike, 'Bulldog portrait, session 1 of 2', 'session', { deposit: 'paid', price: '$280' });
      appt(d0, 'diana', '16:00', '17:00', C.jordan, 'Character piece, session 2 of 4', 'session', { deposit: 'paid' });
    } else {
      aConsultAna = appt(d0, 'liv', '16:00', '17:00', C.ana, 'Fairytale piece', 'consult');
      aConsultPriya = appt(d0, 'diana', '12:00', '13:00', C.priya, 'Cover-up ideas', 'consult');
      aBulldog = appt(d0, 'diana', '14:00', '16:00', C.mike, 'Bulldog portrait, session 1 of 2', 'session', { deposit: 'paid', price: '$280' });
    }
    aScript = appt(d1, 'lex', '12:00', '14:00', C.tom, 'Script lettering, forearm', 'session', { deposit: 'paid', price: '$110' });
    appt(d1, 'liv', '12:30', '14:30', C.chris, 'Florals, forearm', 'session', { deposit: 'asked', price: '$140' });
    appt(d1, 'diana', '13:00', '16:00', C.jordan, 'Dark gothic sleeve, session 3 of 4', 'session', { deposit: 'paid' });
    appt(d2, 'piercing', '13:00', '13:45', C.jess, 'Forward helix', 'piercing', { deposit: 'asked' });
    appt(d3, 'lex', '13:00', '15:00', C.sam2, 'Small Ghostface knife, forearm', 'session', { deposit: 'asked' });
    appt(d4, 'diana', '12:00', '15:00', C.priya, 'Cover-up, shoulder', 'session');
    /* history: done, no-show, a couple that are due a check-in */
    appt(past[3], 'lex', '13:00', '14:30', C.riley, 'Flamingo, ankle', 'session', { status: 'done', deposit: 'paid', price: '$90' });
    appt(past[4], 'liv', '12:30', '15:00', C.avery, 'Lilies with swirls, forearm', 'session', { status: 'done', deposit: 'paid', price: '$150' });
    appt(past[2], 'diana', '13:00', '15:00', C.noah, 'Monarch butterfly, forearm', 'session', { status: 'done', deposit: 'paid', price: '$180' });
    appt(past[5], 'lex', '14:00', '15:30', C.devon, 'Paw print, galaxy fill', 'session', { status: 'noshow', deposit: 'paid' });
    appt(past[9], 'diana', '12:00', '15:00', C.mia, 'Phoenix, shoulder', 'session', { status: 'done', deposit: 'paid', price: '$320', followUp: 'sent' });
    appt(past[6], 'lex', '13:00', '14:00', C.jordan, 'Daisy stem, calf', 'session', { status: 'done', deposit: 'paid', price: '$100', followUp: 'sent' });

    function req(name, c, artist, kind, status, ageH, f) {
      var r = { id: OA.uid('r'), name: name, clientId: c ? c.id : '', phone: c ? c.phone : '', email: '', artist: artist, kind: kind, size: '', place: '', idea: '', when: '', note: '', status: status, created: now - ageH * H, log: [], quote: '', askedAt: null, paidAt: null, consentAt: null, closedReason: '', apptId: '', waitlist: false, sample: true };
      Object.keys(f || {}).forEach(function (k) { r[k] = f[k]; });
      if (r.status !== 'New' && !r.repliedAt) r.repliedAt = r.created + (1 + requests.length % 5) * H * 1.5;
      r.log.unshift({ t: r.created, text: 'Request came in from the website form' });
      requests.push(r); return r;
    }
    req('Taylor R.', C.taylor, '', 'tattoo', 'New', 0.6, { size: 'Medium', place: 'Upper arm', idea: 'Sun and moon with florals, like the one on Lex’s page.', when: 'Weekends' });
    req('Sam K.', C.sam2, 'lex', 'tattoo', 'Contacted', 30, { size: 'Small', place: 'Forearm', idea: 'Small Ghostface knife.', when: 'Saturday afternoon', apptId: '' });
    req('Jules M.', C.jules, '', 'piercing', 'New', 76, { place: 'Forward helix', idea: 'First piercing. Wondering about jewelry options.', when: 'Flexible' });
    req('Jess M.', C.jess, '', 'piercing', 'Awaiting Deposit', 50, { place: 'Forward helix', when: 'Flexible', askedAt: now - 2 * D, quote: '$45' });
    var rpr = req('Priya N.', C.priya, 'diana', 'tattoo', 'Consultation Scheduled', 120, { size: 'Large', place: 'Left shoulder', idea: 'Cover-up of an older piece. Wants to talk through options.', when: 'Any open day' });
    rpr.apptId = aConsultPriya.id; aConsultPriya.requestId = rpr.id;
    var rana = req('Ana P.', C.ana, 'liv', 'tattoo', 'Consultation Scheduled', 96, { size: 'Medium', place: 'Thigh', idea: 'Something fairytale. Has a folder of screenshots.', when: 'After 4 PM' });
    rana.apptId = aConsultAna.id; aConsultAna.requestId = rana.id;
    req('Chris P.', C.chris, 'liv', 'tattoo', 'Awaiting Deposit', 118, { size: 'Medium', place: 'Forearm', idea: 'Florals wrapping the forearm.', when: 'Weekdays', quote: '$140', askedAt: now - 2 * D });
    var rmk = req('Mike K.', C.mike, 'diana', 'tattoo', 'Booked', 200, { size: 'Large', place: 'Calf', idea: 'Portrait of his bulldog.', quote: '$280', askedAt: now - 6 * D, paidAt: now - 5 * D, consentAt: now - D });
    rmk.apptId = aBulldog.id; aBulldog.requestId = rmk.id;
    var rtm = req('Tom W.', C.tom, 'lex', 'tattoo', 'Booked', 160, { size: 'Small', place: 'Forearm', idea: 'Lettering. Has the exact words.', quote: '$110', askedAt: now - 4 * D, paidAt: now - 3 * D, consentAt: now - D });
    rtm.apptId = aScript.id; aScript.requestId = rtm.id;
    req('Dana R.', C.dana, 'liv', 'tattoo', 'Contacted', 140, { size: 'Medium', place: 'Ribs', idea: 'Floral piece.', when: 'Whenever Liv opens up', waitlist: true });
    req('Casey L.', C.casey2, 'liv', 'tattoo', 'Contacted', 100, { size: 'Small', place: 'Ankle', idea: 'Cat face.', when: 'Flexible', waitlist: true });
    req('Alex Q.', C.alex, '', 'tattoo', 'Closed', 260, { size: 'Large', place: 'Back', idea: 'Full-color realism back piece.', closedReason: 'Not a fit' });
    return { clients: clients, appts: appts, requests: requests, timeoff: [{ id: OA.uid('t'), artist: 'lex', date: d2, start: '12:00', end: '14:00', note: 'Dentist', sample: true }] };
  }

  var TEMPLATES = {
    ack: { name: 'Got your request', body: 'Hi {first}, this is {shop}. We got your request and will get back to you soon.' },
    details: { name: 'Ask for details', body: 'Hi {first}, thanks for reaching out about your tattoo. Can you send a photo of where it is going, plus any reference pictures? We will put a quote together after that.' },
    quote: { name: 'Quote and deposit', body: 'Hi {first}, {artist} can do this for about {quote}. To hold your spot, the shop’s deposit is {deposit}. {depositHow}' },
    confirm: { name: 'Booking confirmation', body: 'Hi {first}, you are booked with {artist} on {date} at {time}. Reply here if anything changes. {shop}, {address}' },
    reminder: { name: 'Appointment reminder', body: 'Hi {first}, a reminder about your appointment with {artist} on {date} at {time} at {shop}, {address}. See you then!' },
    aftercare: { name: 'Healing check-in', body: 'Hi {first}, it is {shop} checking in on your tattoo. How is it healing? When it is healed, send us a photo. We would love to see it.' },
    review: { name: 'Ask for a review', body: 'Thanks again for coming in, {first}! If you have a minute, a Google review helps a small shop a lot: {reviewLink}' },
    waitlist: { name: 'Books are open', body: 'Hi {first}, {artist}’s books are open again. Want to set up a time? {shop}' },
    blank: { name: 'New text', body: 'Hi {first}, ' },
    decline: { name: 'Polite decline', body: 'Hi {first}, thanks so much for thinking of us. This one is not a fit for the shop right now, but we would love to see you for something else.' }
  };
  OA.TEMPLATES = TEMPLATES;

  OA.freshState = function () {
    var seed = window.OA_SEED_SITE, today = OA.todayISO(), hours = hoursFromSeed(seed);
    var artists = [], portfolio = {};
    seed.artists.forEach(function (a) {
      artists.push({ slug: a.slug, name: a.name, role: a.role || 'Tattoo', ig: OA.igOf(a.socials) || a.ig || '', socials: OA.seedSocials(a), bio: a.about.join('\n\n'), portrait: a.portrait, books: a.slug === 'liv' ? 'closed' : 'open', until: a.slug === 'liv' ? OA.addDays(today, 21) : '', untilSample: a.slug === 'liv', visible: true, removedAt: null });
      portfolio[a.slug] = a.work.map(function (w, i) { return { id: a.slug + '-' + (i + 1), src: w.src, cap: w.cap, sec: '', onSite: true, ord: (i + 1) * 10 }; });
    });
    var site = {
      shop: { name: seed.name, short: seed.shortName, phone: seed.phoneDisplay, street: seed.street, town: seed.town, region: seed.region, zip: seed.zip, facebook: seed.facebook },
      hours: hours,
      banner: { on: false, text: '', start: '', end: '' },
      announcements: [],
      policies: { deposit: 'The shop’s deposit is $40 and holds your spot.', age: '', aftercare: '' },
      services: [].concat.apply([], seed.pickGroups.map(function (g) { return g.items.map(function (it) { return { id: it.id, family: g.family, name: it.name, blurb: it.blurb }; }); })),
      prices: seed.prices.map(function (g) { return { group: g.group, sample: !!g.sample, items: g.items.map(function (x) { return [x[0], x[1]]; }) }; }),
      quotes: [],
      artists: artists,
      portfolio: portfolio
    };
    var s = makeSamples(today, hours);
    var tpl = {}; Object.keys(TEMPLATES).forEach(function (k) { tpl[k] = TEMPLATES[k].body; });
    return {
      v: 1, anchor: today, created: Date.now(), touched: false,
      site: site, published: { at: Date.now(), by: '717 Digital Studio', site: OA.clone(site) }, history: [],
      requests: s.requests, appts: s.appts, clients: s.clients, timeoff: s.timeoff,
      settings: { depositAmount: '$40', depositHow: '', reviewLink: '', templates: tpl, rating: { stars: seed.rating.stars, count: seed.rating.count, source: seed.rating.source } },
      people: [
        { id: 'p1', name: 'Shop owner', email: 'owner@example.com', role: 'owner', artist: '' },
        { id: 'p2', name: 'Front desk', email: 'desk@example.com', role: 'frontdesk', artist: '' },
        { id: 'p3', name: 'Lex', email: 'lex@example.com', role: 'artist', artist: 'lex' },
        { id: 'p4', name: 'Liv', email: 'liv@example.com', role: 'artist', artist: 'liv' },
        { id: 'p5', name: 'Diana', email: 'diana@example.com', role: 'artist', artist: 'diana' }
      ],
      activity: []
    };
  };

  /* Replace the sample records with ones built around today. Anything the shop added by hand stays. */
  OA.refreshSamples = function (quiet) {
    var st = S.state, today = OA.todayISO(), s = makeSamples(today, st.site.hours);
    ['requests', 'appts', 'clients', 'timeoff'].forEach(function (k) { st[k] = st[k].filter(function (x) { return !x.sample; }).concat(s[k]); });
    st.anchor = today;
    st.site.artists.forEach(function (a) { if (a.untilSample) a.until = OA.addDays(today, 21); });
    if (st.published && st.published.site) st.published.site.artists.forEach(function (a) { if (a.untilSample) a.until = OA.addDays(today, 21); });
    S.save(); if (!quiet) { st.touched = true; S.save(); S.emit(); }
  };

  /* ---------- images: uploads are shrunk, then kept in IndexedDB (localStorage is far too small for photos) ---------- */
  var DBN = 'oa2-images', urlCache = {};
  function db() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) { rej(new Error('This browser has no photo storage (IndexedDB is unavailable).')); return; }
      var rq = indexedDB.open(DBN, 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('blobs'); };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(new Error('Photo storage could not be opened: ' + (rq.error && rq.error.message || 'unknown error'))); };
    });
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction('blobs', mode), out = fn(t.objectStore('blobs'));
        t.oncomplete = function () { res(out && out.result !== undefined ? out.result : undefined); };
        t.onerror = t.onabort = function () { rej(new Error('Photo storage failed: ' + (t.error && t.error.message || 'the browser refused the write'))); };
      });
    });
  }
  OA.img = {
    compress: function (file, max, q) {
      max = max || 1600; q = q || 0.82;
      if (!file || !/^image\//.test(file.type || '')) return Promise.reject(new Error('“' + (file && file.name || 'That file') + '” is not a photo. Use a JPEG, PNG, or WebP.'));
      var load = window.createImageBitmap ? createImageBitmap(file) : new Promise(function (res, rej) {
        var im = new Image(), u = URL.createObjectURL(file); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('decode')); }; im.src = u;
      });
      return load.then(function (bm) {
        var w = bm.width, h = bm.height, sc = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * sc)); c.height = Math.max(1, Math.round(h * sc));
        var cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); cx.drawImage(bm, 0, 0, c.width, c.height);
        return new Promise(function (res, rej) { c.toBlob(function (b) { b ? res(b) : rej(new Error('encode')); }, 'image/jpeg', q); });
      }).catch(function () { throw new Error('“' + (file.name || 'That photo') + '” could not be read. If it came from an iPhone, share it as JPEG instead of HEIC.'); });
    },
    put: function (blob) { var id = 'idb:' + OA.uid('img'); return tx('readwrite', function (s) { return s.put(blob, id); }).then(function () { return id; }); },
    del: function (id) { if (urlCache[id]) { URL.revokeObjectURL(urlCache[id]); delete urlCache[id]; } return tx('readwrite', function (s) { return s.delete(id); }).catch(function () { /* a leftover blob is harmless */ }); },
    url: function (id) {
      if (urlCache[id]) return Promise.resolve(urlCache[id]);
      return tx('readonly', function (s) { return s.get(id); }).then(function (b) { if (!b) return ''; urlCache[id] = URL.createObjectURL(b); return urlCache[id]; });
    },
    all: function () { return tx('readonly', function (s) { return s.getAllKeys(); }); },
    /* Plain repo photos live one folder up from this page. */
    src: function (ref) { if (!ref) return ''; if (/^(idb:)/.test(ref)) return ''; if (/^(https?:|data:|blob:)/.test(ref)) return ref; return '../' + ref; },
    el: function (ref, alt, cls) {
      var im = OA.h('img', { alt: alt || '', class: cls || '', loading: 'lazy', decoding: 'async' });
      if (/^idb:/.test(ref || '')) {
        OA.img.url(ref).then(function (u) { if (u) im.src = u; else im.classList.add('img-missing'); }).catch(function () { im.classList.add('img-missing'); });
      } else if (ref) { im.src = OA.img.src(ref); im.addEventListener('error', function () { im.classList.add('img-missing'); }); }
      return im;
    }
  };
  /* After a publish nothing needs the photos that are no longer in the site, so free them. */
  OA.gcImages = function () {
    var used = {};
    function scan(site) { Object.keys(site.portfolio).forEach(function (k) { site.portfolio[k].forEach(function (p) { [p.src, p.pair && p.pair.b, p.pair && p.pair.a].forEach(function (x) { if (x) used[x] = 1; }); }); site.artists.forEach(function (a) { if (a.portrait) used[a.portrait] = 1; }); }); }
    scan(S.state.site); scan(S.state.published.site);
    (S.state.requests || []).forEach(function (r) { (r.refs || []).forEach(function (x) { if (x.img) used[x.img] = 1; }); });
    (S.state.appts || []).forEach(function (a) { (a.refs || []).forEach(function (x) { if (x.img) used[x.img] = 1; }); });
    return OA.img.all().then(function (keys) { return Promise.all(keys.filter(function (k) { return !used[k]; }).map(function (k) { return OA.img.del(k); })); }).catch(function () { /* leftovers are harmless */ });
  };
})();
