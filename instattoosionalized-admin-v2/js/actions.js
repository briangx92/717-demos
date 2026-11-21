/* Everything that changes shop data lives here, so each screen stays a thin view and a live backend has one seam to replace. */
(function () {
  'use strict';
  var OA = window.OA, S = OA.store, act = OA.act;
  OA.role = { kind: 'owner', slug: '' };
  function st() { return S.state; }

  /* ---------- lookups ---------- */
  OA.nick = function (a) { var m = (a.name.match(/["\u201c]([^"\u201d]+)["\u201d]/) || [])[1]; var n = m || OA.first(a.name); return n.charAt(0).toUpperCase() + n.slice(1); };
  OA.chairs = function () {
    var out = st().site.artists.filter(function (a) { return !a.removedAt; }).map(function (a) { return { slug: a.slug, name: OA.nick(a), full: a.name }; });
    if (st().site.services.some(function (s) { return s.family === 'piercing'; })) out.push({ slug: 'piercing', name: 'Piercing', full: 'Piercing' });
    return out;
  };
  OA.artist = function (slug) { return st().site.artists.filter(function (a) { return a.slug === slug; })[0] || null; };
  OA.chairName = function (slug) { if (!slug) return 'No preference'; var c = OA.chairs().filter(function (x) { return x.slug === slug; })[0]; if (c) return c.name; var a = OA.artist(slug); return a ? OA.nick(a) : slug; };
  OA.req = function (id) { return st().requests.filter(function (r) { return r.id === id; })[0] || null; };
  OA.appt = function (id) { return st().appts.filter(function (a) { return a.id === id; })[0] || null; };
  OA.client = function (id) { return st().clients.filter(function (c) { return c.id === id; })[0] || null; };
  OA.depositAmount = function () { return st().settings.depositAmount || ''; };

  /* ---------- who sees what ---------- */
  OA.scopeAppts = function (list) { return OA.role.kind === 'artist' ? list.filter(function (a) { return a.artist === OA.role.slug; }) : list; };
  OA.scopeReqs = function (list) { return OA.role.kind === 'artist' ? list.filter(function (r) { return r.artist === OA.role.slug || (!r.artist && r.kind === 'tattoo'); }) : list; };
  OA.scopeClients = function (list) {
    if (OA.role.kind !== 'artist') return list;
    var ids = {}; st().appts.forEach(function (a) { if (a.artist === OA.role.slug) ids[a.clientId] = 1; });
    st().requests.forEach(function (r) { if (r.artist === OA.role.slug && r.clientId) ids[r.clientId] = 1; });
    return list.filter(function (c) { return ids[c.id]; });
  };

  /* ---------- clients ---------- */
  OA.findClient = function (name, phone) {
    var d = OA.digits(phone), n = String(name || '').trim().toLowerCase();
    return st().clients.filter(function (c) { return (d.length >= 7 && OA.digits(c.phone) === d) || (!d && n && c.name.toLowerCase() === n); })[0] || null;
  };
  act.ensureClient = function (name, phone) {
    var c = OA.findClient(name, phone);
    if (c) { if (phone && !c.phone) c.phone = phone; return c; }
    c = { id: OA.uid('c'), name: String(name).trim(), phone: phone || '', email: '', notes: '', consentAt: null, idChecked: false, created: Date.now() };
    st().clients.push(c); return c;
  };
  act.saveClient = function (c, patch) { Object.keys(patch).forEach(function (k) { c[k] = patch[k]; }); S.commit(); };

  /* ---------- requests ---------- */
  function log(r, text, extra) { var e = { t: Date.now(), text: text }; if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; }); r.log.unshift(e); }
  OA.logReq = log;
  act.addRequest = function (d) {
    var c = act.ensureClient(d.name, d.phone);
    var r = { id: OA.uid('r'), name: d.name.trim(), clientId: c.id, phone: d.phone || '', email: '', artist: d.artist || '', kind: d.kind || 'tattoo', size: d.size || '', place: d.place || '', idea: d.idea || '', when: d.when || '', pref: d.pref ? OA.cleanPref(d.pref) : null, note: '', status: 'New', created: Date.now(), log: [], quote: '', askedAt: null, paidAt: null, consentAt: null, closedReason: '', apptId: '', waitlist: !!d.waitlist, repliedAt: null };
    log(r, d.source || 'Added by hand (phone call or walk-in)');
    st().requests.unshift(r); S.commit(); return r;
  };
  /* Requests from the website form. Each carries the server's id, so pulling twice never makes a second copy. */
  act.importRemote = function (list, nextAfter) {
    var have = {}; st().requests.forEach(function (r) { if (r.remoteId) have[r.remoteId] = 1; });
    var artists = {}; st().site.artists.forEach(function (a) { artists[a.slug] = 1; });
    var n = 0;
    list.slice().sort(function (a, b) { return a.created_at - b.created_at; }).forEach(function (d) {
      if (!d || typeof d.id !== 'string' || have[d.id]) return;
      var c = act.ensureClient(String(d.name || 'Website visitor'), String(d.phone || ''));
      var picked = Array.isArray(d.services) && d.services.length ? ' Picked: ' + d.services.join(', ') + '.' : '';
      var r = { id: OA.uid('r'), remoteId: d.id, name: String(d.name || '').trim() || 'Website visitor', clientId: c.id, phone: String(d.phone || ''), email: '', artist: artists[d.artist] ? d.artist : '',
        kind: d.kind === 'piercing' ? 'piercing' : 'tattoo', size: String(d.size || ''), place: String(d.place || ''), idea: String(d.idea || ''), when: String(d.when || ''), note: String(d.note || ''),
        status: 'New', created: Number(d.created_at) || Date.now(), log: [], quote: '', askedAt: null, paidAt: null, consentAt: null, closedReason: '', apptId: '', waitlist: false, repliedAt: null };
      log(r, 'Came in from the website (' + (d.source === 'guided' ? 'full request' : 'call-back request') + ').' + picked + (d.artist && !artists[d.artist] ? ' Asked for an artist who is not on the roster: ' + d.artist + '.' : ''));
      st().requests.unshift(r); have[d.id] = 1; n++;
    });
    if (typeof nextAfter === 'number') { var a = OA.api.state(); if (nextAfter > (a.after || 0)) a.after = nextAfter; }
    S.commit(); return n;
  };
  act.setStatus = function (r, status, why) {
    if (r.status === status) return false;
    var from = r.status; r.status = status;
    if (status !== 'New' && !r.repliedAt) r.repliedAt = Date.now();
    log(r, 'Moved from ' + OA.STATUS_LABEL[from] + ' to ' + OA.STATUS_LABEL[status] + (why ? '. ' + why : ''), { kind: 'status', to: status });
    S.commit(); return true;
  };
  act.closeReq = function (r, reason) {
    if (r.status === 'Closed') return;
    r.closedReason = reason; r.waitlist = false;
    var was = r.status; r.closedFrom = was; r.status = 'Closed'; if (!r.repliedAt && reason !== 'No response') r.repliedAt = Date.now();
    log(r, 'Closed: ' + reason + ' (was ' + OA.STATUS_LABEL[was] + ')', { kind: 'status', to: 'Closed' }); S.commit();
  };
  act.reopen = function (r) { if (r.status !== 'Closed') return; var to = r.closedFrom && r.closedFrom !== 'Closed' && r.closedFrom !== 'New' ? r.closedFrom : (r.closedFrom === 'New' ? 'New' : 'Contacted'); r.status = to; r.closedReason = ''; r.closedFrom = ''; log(r, 'Reopened, back to ' + OA.STATUS_LABEL[to], { kind: 'status', to: to }); S.commit(); };
  act.updateReq = function (r, patch, note) {
    var changed = Object.keys(patch).filter(function (k) { return r[k] !== patch[k]; });
    if (!changed.length) return false;
    changed.forEach(function (k) { r[k] = patch[k]; });
    if (note) log(r, note);
    var c = OA.client(r.clientId); if (c && patch.phone && !c.phone) c.phone = patch.phone;
    S.commit(); return true;
  };
  act.markAsked = function (r, quote) {
    if (r.askedAt && r.quote === quote) return false;
    r.quote = quote; var first = !r.askedAt; r.askedAt = r.askedAt || Date.now();
    log(r, (first ? 'Deposit asked for' : 'Quote updated to ' + quote) + (first && quote ? '. Quote ' + quote : ''));
    if (r.status === 'New' || r.status === 'Contacted' || r.status === 'Consultation Scheduled') act.setStatus(r, 'Awaiting Deposit'); else S.commit();
    return true;
  };
  act.markPaid = function (r) {
    if (r.paidAt) return false;
    r.paidAt = Date.now(); log(r, 'Deposit received');
    var a = r.apptId && OA.appt(r.apptId); if (a && a.type !== 'consult') a.deposit = 'paid';
    S.commit(); return true;
  };
  act.undoPaid = function (r) { if (!r.paidAt) return; r.paidAt = null; log(r, 'Deposit marked as not received'); var a = r.apptId && OA.appt(r.apptId); if (a && a.deposit === 'paid') a.deposit = 'asked'; S.commit(); };
  act.setConsent = function (r, on) {
    if (!!r.consentAt === !!on) return;
    r.consentAt = on ? Date.now() : null; log(r, on ? 'Consent form on file' : 'Consent form marked as missing');
    var c = OA.client(r.clientId); if (c) { c.consentAt = r.consentAt; }
    S.commit();
  };

  /* ---------- appointments ---------- */
  OA.apptConflicts = function (d, ignoreId) {
    var s = OA.mins(d.start), e = OA.mins(d.end), out = [];
    st().appts.forEach(function (a) {
      if (a.id === ignoreId || a.date !== d.date || a.artist !== d.artist || a.status === 'cancelled') return;
      if (s < OA.mins(a.end) && e > OA.mins(a.start)) out.push(a.client + ', ' + OA.fmtRange(a.start, a.end));
    });
    st().timeoff.forEach(function (t) {
      if (t.date !== d.date || t.artist !== d.artist) return;
      if (s < OA.mins(t.end) && e > OA.mins(t.start)) out.push('Time off' + (t.note ? ' (' + t.note + ')' : '') + ', ' + OA.fmtRange(t.start, t.end));
    });
    return out;
  };
  OA.validateAppt = function (d, ignoreId) {
    var errs = [];
    if (!String(d.client || '').trim()) errs.push('Add the client’s name.');
    if (!d.artist) errs.push('Pick who it is with.');
    if (!OA.validISO(d.date)) errs.push('Pick a date.');
    if (!d.start || !d.end) errs.push('Set a start and end time.');
    else if (OA.mins(d.end) <= OA.mins(d.start)) errs.push('The end time has to be after the start time.');
    if (d.phone && !OA.phoneOk(d.phone, ignoreId && OA.appt(ignoreId) && (OA.client(OA.appt(ignoreId).clientId) || {}).phone)) errs.push(OA.PHONE_MSG);
    if (!errs.length && !ignoreId && OA.validISO(d.date) && d.date < OA.todayISO()) errs.push('That date has already passed. Pick today or later.');
    if (!errs.length) {
      var dup = st().appts.filter(function (x) { return x.id !== ignoreId && x.date === d.date && x.status !== 'cancelled' && x.artist !== d.artist && OA.mins(d.start) < OA.mins(x.end) && OA.mins(d.end) > OA.mins(x.start) && ((d.clientId && x.clientId === d.clientId) || (d.phone && OA.digits(x.client && OA.client(x.clientId) && OA.client(x.clientId).phone) === OA.digits(d.phone) && OA.digits(d.phone).length >= 7)); })[0];
      if (dup) errs.push('This client is already booked then, with ' + OA.chairName(dup.artist) + ' (' + OA.fmtRange(dup.start, dup.end) + ').');
    }
    if (!errs.length) { var c = OA.apptConflicts(d, ignoreId); if (c.length) errs.push((OA.chairName(d.artist)) + ' is already busy then: ' + c.join('; ') + '.'); }
    return errs;
  };
  act.saveAppt = function (d, id) {
    var errs = OA.validateAppt(d, id); if (errs.length) return { ok: false, errors: errs };
    var c = act.ensureClient(d.client, d.phone), a = id ? OA.appt(id) : null;
    var rec = { date: d.date, artist: d.artist, start: d.start, end: d.end, client: c.name, clientId: c.id, piece: d.piece || '', type: d.type || 'session', deposit: d.deposit || 'none', price: d.price || '', note: d.note || '' };
    if (a) Object.keys(rec).forEach(function (k) { a[k] = rec[k]; });
    else { a = Object.assign({ id: OA.uid('a'), status: 'booked', requestId: d.requestId || '', followUp: null }, rec); st().appts.push(a); }
    var r = a.requestId && OA.req(a.requestId);
    if (r && !r.apptId) r.apptId = a.id;
    if (OA.gcal) OA.gcal.onChange(a);
    S.commit(); return { ok: true, appt: a };
  };
  act.setApptStatus = function (a, status) {
    if (a.status === status) return false;
    a.status = status; if (OA.gcal) OA.gcal.onChange(a);
    var r = a.requestId && OA.req(a.requestId);
    if (r) {
      log(r, 'Appointment ' + OA.APPT_STATUS[status].toLowerCase() + ' (' + OA.fmtShort(a.date) + ')');
      if (status === 'cancelled' && r.apptId === a.id) {
        r.apptId = '';
        if (r.status === 'Booked' || r.status === 'Consultation Scheduled') { var to = r.askedAt ? 'Awaiting Deposit' : 'Contacted'; r.status = to; log(r, 'Back to ' + OA.STATUS_LABEL[to] + ' until a new time is set', { kind: 'status', to: to }); }
      }
    }
    S.commit(); return true;
  };
  act.linkAppt = function (r, a) {
    r.apptId = a.id; r.clientId = a.clientId; a.requestId = r.id;
    if (r.paidAt && a.type !== 'consult') a.deposit = 'paid';
    if (!r.artist && a.artist !== 'piercing') r.artist = a.artist;
    if (a.type === 'consult') { log(r, 'Consultation set for ' + OA.fmtDow(a.date) + ' at ' + OA.fmtTime(a.start) + ' with ' + OA.chairName(a.artist)); if (r.status === 'New' || r.status === 'Contacted') r.status = 'Consultation Scheduled'; }
    else { log(r, 'Booked ' + OA.fmtDow(a.date) + ' at ' + OA.fmtTime(a.start) + ' with ' + OA.chairName(a.artist)); r.status = 'Booked'; }
    if (!r.repliedAt) r.repliedAt = Date.now();
    S.commit();
  };
  act.bookFromRequest = function (r, d) {
    var existing = r.apptId && OA.appt(r.apptId);
    if (existing && existing.status !== 'cancelled') return { ok: true, appt: existing, already: true };
    d.requestId = r.id;
    var res = act.saveAppt(d); if (!res.ok) return res;
    r.apptId = res.appt.id; r.clientId = res.appt.clientId;
    if (d.type === 'consult') act.setStatus(r, 'Consultation Scheduled', OA.fmtDow(d.date) + ' with ' + OA.chairName(d.artist));
    else { log(r, 'Booked ' + OA.fmtDow(d.date) + ' at ' + OA.fmtTime(d.start) + ' with ' + OA.chairName(d.artist)); act.setStatus(r, 'Booked'); }
    if (d.artist && d.artist !== 'piercing' && !r.artist) r.artist = d.artist;
    S.commit(); return res;
  };
  act.addTimeoff = function (d) {
    if (!d.artist || !OA.validISO(d.date) || !d.start || !d.end || OA.mins(d.end) <= OA.mins(d.start)) return { ok: false, errors: ['Pick who, a date, and a start time before the end time.'] };
    var clash = st().appts.filter(function (a) { return a.date === d.date && a.artist === d.artist && a.status !== 'cancelled' && OA.mins(d.start) < OA.mins(a.end) && OA.mins(d.end) > OA.mins(a.start); });
    st().timeoff.push({ id: OA.uid('t'), artist: d.artist, date: d.date, start: d.start, end: d.end, note: d.note || '' });
    S.commit(); return { ok: true, clashes: clash };
  };
  act.removeTimeoff = function (id) { st().timeoff = st().timeoff.filter(function (t) { return t.id !== id; }); S.commit(); };
  act.followUpSent = function (a) { if (a.followUp) return false; a.followUp = 'sent'; S.commit(); return true; };

  /* ---------- messages ---------- */
  OA.addressLine = function () { var s = st().site.shop; return s.street + ', ' + s.town + ', ' + s.region; };
  OA.compose = function (key, ctx) {
    var set = st().settings, shop = st().site.shop, body = (set.templates && set.templates[key]) || OA.TEMPLATES[key].body;
    ctx = ctx || {};
    var map = {
      first: OA.first(ctx.name), shop: shop.short, artist: ctx.artist ? OA.chairName(ctx.artist) : 'one of our artists',
      quote: ctx.quote || '', deposit: set.depositAmount || '', depositHow: set.depositHow || '',
      date: ctx.date ? OA.fmtLong(ctx.date) : '', time: ctx.start ? OA.fmtTime(ctx.start) : '', address: OA.addressLine(), reviewLink: set.reviewLink || ''
    };
    return body.replace(/\{(\w+)\}/g, function (m, k) { return map[k] ? map[k] : m; }).replace(/\s+$/g, '');
  };
  OA.blanks = function (text) { var m = text.match(/\{\w+\}/g) || []; return m.filter(function (x, i) { return m.indexOf(x) === i; }); };
  OA.BLANK_HINT = { '{depositHow}': 'how you take deposits (Settings, Messages)', '{reviewLink}': 'your Google review link (Settings, Messages)', '{quote}': 'the quote', '{date}': 'the date', '{time}': 'the time' };

  /* ---------- numbers shown on Today ---------- */
  OA.metrics = function () {
    var s = st(), now = Date.now(), D = 86400000, today = OA.todayISO();
    var recent = s.requests.filter(function (r) { return now - r.created <= 30 * D; });
    var replied = recent.filter(function (r) { return r.repliedAt && r.repliedAt >= r.created; });
    var hrs = replied.map(function (r) { return (r.repliedAt - r.created) / 3600000; }).sort(function (a, b) { return a - b; });
    var median = hrs.length ? hrs[Math.floor(hrs.length / 2)] : null;
    var decided = s.requests.filter(function (r) { return r.status === 'Booked' || (r.status === 'Closed'); });
    var booked = s.requests.filter(function (r) { return r.status === 'Booked' || r.apptId; });
    var pastAppts = s.appts.filter(function (a) { return OA.diffDays(today, a.date) > 0 && OA.diffDays(today, a.date) <= 60 && (a.status === 'done' || a.status === 'noshow'); });
    var ns = pastAppts.filter(function (a) { return a.status === 'noshow'; }).length;
    var week = s.appts.filter(function (a) { var d = OA.diffDays(a.date, today); return d >= 0 && d < 7 && a.status !== 'cancelled'; }).length;
    return { requests30: recent.length, medianReplyH: median, bookedOf: booked.length, decided: decided.length, noShows: ns, pastCount: pastAppts.length, week: week };
  };
  OA.followUpsDue = function () {
    var today = OA.todayISO();
    return st().appts.filter(function (a) { return a.status === 'done' && !a.followUp && OA.diffDays(today, a.date) >= 14; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  };
  OA.openRequests = function () { return st().requests.filter(function (r) { return r.status !== 'Closed' && r.status !== 'Booked'; }); };

  /* ---------- publishing ---------- */
  function hr(x) { return x && x.open ? OA.fmtRange(x.open, x.close) : 'Closed'; }
  function byKey(arr, k) { var m = {}; arr.forEach(function (x) { m[x[k]] = x; }); return m; }
  OA.diffSite = function (pub, cur) {
    var out = [], i;
    for (i = 0; i < 7; i++) { var a = pub.hours[i], b = cur.hours[i]; if (!OA.eq(a, b)) out.push({ key: 'hours', area: 'Hours', text: b.day + ': ' + hr(a) + ' → ' + hr(b) }); }
    if (!OA.eq(pub.banner, cur.banner)) {
      var pb = pub.banner, cb = cur.banner;
      if (pb.on !== cb.on) out.push({ key: 'banner', area: 'Banner', text: cb.on ? 'Banner turned on' : 'Banner turned off' });
      if (pb.text !== cb.text) out.push({ key: 'banner', area: 'Banner', text: 'Banner message changed' });
      if (pb.start !== cb.start || pb.end !== cb.end) out.push({ key: 'banner', area: 'Banner', text: 'Banner dates changed' });
    }
    [['deposit', 'Deposit policy'], ['age', 'Age and ID policy'], ['aftercare', 'Aftercare words']].forEach(function (p) {
      var x = pub.policies[p[0]] || '', y = cur.policies[p[0]] || '';
      if (x !== y) out.push({ key: 'policies', area: 'Policies', text: p[1] + (!x ? ' added' : !y ? ' removed (it will stop showing)' : ' changed') });
    });
    var pp = {}, cp = {};
    pub.prices.forEach(function (g) { g.items.forEach(function (it) { pp[g.group + ' / ' + it[0]] = it[1]; }); });
    cur.prices.forEach(function (g) { g.items.forEach(function (it) { cp[g.group + ' / ' + it[0]] = it[1]; }); });
    Object.keys(cp).forEach(function (k) { if (!(k in pp)) out.push({ key: 'prices', area: 'Prices', text: 'Price added: ' + k + ' ' + cp[k] }); else if (pp[k] !== cp[k]) out.push({ key: 'prices', area: 'Prices', text: k + ': ' + pp[k] + ' → ' + cp[k] }); });
    Object.keys(pp).forEach(function (k) { if (!(k in cp)) out.push({ key: 'prices', area: 'Prices', text: 'Price removed: ' + k }); });
    if (!OA.eq(pub.prices.map(function (g) { return g.group; }), cur.prices.map(function (g) { return g.group; })) && !out.some(function (o) { return o.key === 'prices'; })) out.push({ key: 'prices', area: 'Prices', text: 'Price groups changed' });
    var ps = byKey(pub.services, 'id'), cs = byKey(cur.services, 'id');
    Object.keys(cs).forEach(function (k) { if (!ps[k]) out.push({ key: 'services', area: 'Services', text: 'Service added: ' + cs[k].name }); else if (!OA.eq(ps[k], cs[k])) out.push({ key: 'services', area: 'Services', text: cs[k].name + ': details changed' }); });
    Object.keys(ps).forEach(function (k) { if (!cs[k]) out.push({ key: 'services', area: 'Services', text: 'Service removed: ' + ps[k].name }); });
    var sh = pub.shop, ch = cur.shop;
    if (sh.phone !== ch.phone) out.push({ key: 'shop', area: 'Contact', text: 'Phone: ' + sh.phone + ' → ' + ch.phone });
    if ([sh.street, sh.town, sh.region, sh.zip].join('|') !== [ch.street, ch.town, ch.region, ch.zip].join('|')) out.push({ key: 'shop', area: 'Contact', text: 'Address changed' });
    if (sh.facebook !== ch.facebook) out.push({ key: 'shop', area: 'Contact', text: 'Facebook link changed' });
    if (!OA.eq(pub.quotes, cur.quotes)) { var dq = cur.quotes.length - pub.quotes.length; out.push({ key: 'quotes', area: 'Reviews', text: dq > 0 ? OA.plural(dq, 'review quote') + ' added' : dq < 0 ? OA.plural(-dq, 'review quote') + ' removed' : 'Review quotes edited' }); }
    var pn = byKey(pub.announcements || [], 'id'), cn = byKey(cur.announcements || [], 'id');
    function nm(a) { return '\u201c' + (a.title || 'Untitled') + '\u201d'; }
    Object.keys(cn).forEach(function (k) {
      var n = cn[k], o = pn[k];
      if (!o) { out.push({ key: 'announcements', area: 'Announcements', text: 'Announcement added: ' + nm(n) }); return; }
      if (!OA.eq(o, n)) out.push({ key: 'announcements', area: 'Announcements', text: 'Announcement changed: ' + nm(n) });
    });
    Object.keys(pn).forEach(function (k) { if (!cn[k]) out.push({ key: 'announcements', area: 'Announcements', text: 'Announcement removed: ' + nm(pn[k]) + ' (it will stop showing)' }); });
    var pa = byKey(pub.artists, 'slug'), ca = byKey(cur.artists, 'slug');
    Object.keys(ca).forEach(function (k) {
      var n = ca[k], o = pa[k];
      if (!o) { out.push({ key: 'artists', area: 'Artists', text: 'Artist added: ' + n.name }); return; }
      var who = OA.first(n.name);
      if (!o.removedAt && n.removedAt) { out.push({ key: 'artists', area: 'Artists', text: 'Artist removed: ' + n.name }); return; }
      if (o.removedAt && !n.removedAt) out.push({ key: 'artists', area: 'Artists', text: 'Artist restored: ' + n.name });
      if (o.name !== n.name) out.push({ key: 'artists', area: 'Artists', text: 'Name changed: ' + o.name + ' → ' + n.name });
      if (o.role !== n.role) out.push({ key: 'artists', area: 'Artists', text: who + ': what they do changed' });
      if (o.ig !== n.ig) out.push({ key: 'artists', area: 'Artists', text: who + ': Instagram changed' });
      if (o.bio !== n.bio) out.push({ key: 'artists', area: 'Artists', text: who + ': bio changed' });
      if (o.portrait !== n.portrait) out.push({ key: 'artists', area: 'Artists', text: who + ': main photo changed' });
      if (o.books !== n.books || o.until !== n.until) out.push({ key: 'artists', area: 'Artists', text: who + ': books ' + (n.books === 'open' ? 'open' : 'booked out' + (n.until ? ' until ' + OA.fmtShort(n.until) : '')) });
      if (o.visible !== n.visible) out.push({ key: 'artists', area: 'Artists', text: who + ': page ' + (n.visible ? 'shown' : 'hidden') });
    });
    Object.keys(cur.portfolio).forEach(function (slug) {
      var po = byKey(pub.portfolio[slug] || [], 'id'), pc = cur.portfolio[slug], who = OA.first((ca[slug] || {}).name || slug), nOn = 0, nOff = 0, caps = 0, secs = 0, added = 0, addedOn = 0;
      pc.forEach(function (p) {
        var o = po[p.id];
        if (!o) { added++; if (p.onSite) addedOn++; return; }
        if (o.onSite !== p.onSite) { if (p.onSite) nOn++; else nOff++; }
        if (o.cap !== p.cap) caps++;
        if (o.sec !== p.sec) secs++;
      });
      var removed = Object.keys(po).filter(function (id) { return !pc.some(function (p) { return p.id === id; }); }).length;
      var oldOrder = (pub.portfolio[slug] || []).filter(function (p) { return p.onSite && pc.some(function (q) { return q.id === p.id && q.onSite; }); }).sort(function (x, y) { return x.ord - y.ord; }).map(function (p) { return p.id; });
      var newOrder = pc.filter(function (p) { return p.onSite && oldOrder.indexOf(p.id) >= 0; }).sort(function (x, y) { return x.ord - y.ord; }).map(function (p) { return p.id; });
      var pr = (OA.diffPairs ? OA.diffPairs(po, pc) : 0);
      var L = function (t) { out.push({ key: 'portfolio', area: 'Portfolio', text: who + ': ' + t }); };
      if (added) L(OA.plural(added, 'photo') + ' added' + (added - addedOn ? ' (' + addedOn + ' shown, ' + (added - addedOn) + ' hidden)' : ''));
      if (removed) L(OA.plural(removed, 'photo') + ' removed');
      if (nOn) L(OA.plural(nOn, 'photo') + ' now shown');
      if (nOff) L(OA.plural(nOff, 'photo') + ' now hidden');
      if (caps) L(OA.plural(caps, 'caption') + ' edited');
      if (secs) L(OA.plural(secs, 'photo') + ' tagged');
      if (pr) L(OA.plural(pr, 'before and after pair') + ' changed');
      if (oldOrder.join() !== newOrder.join()) L('photo order changed');
    });
    return out;
  };
  OA.diffPairs = function (po, pc) { var n = 0; pc.forEach(function (p) { var o = po[p.id]; if (!!p.pair !== !!(o && o.pair) || (o && o.pair && p.pair && !OA.eq(o.pair, p.pair))) n++; }); return n; };
  OA.pendingChanges = function () { return OA.diffSite(st().published.site, st().site); };
  OA.publishBlockers = function () {
    var s = st().site, out = [];
    s.hours.forEach(function (x) { if (x.open && (!x.close || OA.mins(x.close) <= OA.mins(x.open))) out.push(x.day + ' closes before it opens.'); });
    if (s.prices.some(function (g) { return g.sample; })) out.push('The prices are still the sample prices from the demo. Check them on Site, Prices, then tick \u201cThese prices are correct\u201d.');
    if (!OA.phoneOk(s.shop.phone)) out.push('The shop phone number needs 10 digits, like (610) 555-0100.');
    if (s.banner.on && !s.banner.text.trim()) out.push('The banner is on but has no message.');
    if (s.banner.on && s.banner.start && s.banner.end && s.banner.end < s.banner.start) out.push('The banner ends before it starts.');
    s.artists.forEach(function (a) { if (!a.removedAt && a.visible && !a.name.trim()) out.push('An artist page has no name.'); });
    if (s.banner.text.length > OA.LIMITS.bannerText) out.push('The banner message is over ' + OA.LIMITS.bannerText + ' characters.');
    if (s.announcements.length > OA.LIMITS.annMax) out.push('There are more than ' + OA.LIMITS.annMax + ' announcements. Remove some.');
    s.announcements.forEach(function (a) { var p = OA.annProblem(a); if (p) out.push('Announcement \u201c' + (a.title || 'Untitled') + '\u201d: ' + p); });
    Object.keys(s.portfolio).forEach(function (slug) {
      var a = OA.artist(slug); if (!a || a.removedAt) return;
      var n = s.portfolio[slug].filter(function (p) { return p.onSite && !String(p.cap || '').trim(); }).length;
      if (n) out.push(OA.first(a.name) + ' has ' + OA.plural(n, 'shown photo') + ' without a caption.');
    });
    return out;
  };
  act.publish = function (who) {
    var s = st(), ch = OA.pendingChanges();
    if (!ch.length) return { ok: false, reason: 'There is nothing to publish.' };
    var bl = OA.publishBlockers(); if (bl.length) return { ok: false, reason: bl[0], blockers: bl };
    var at = Date.now(), bad = OA.writeLive(OA.publicContent(s.site, at));
    if (bad) return { ok: false, reason: bad };
    s.history.unshift({ id: OA.uid('h'), at: at, by: who, summary: ch.map(function (c) { return c.text; }) });
    s.history = s.history.slice(0, 30);
    s.published = { at: at, by: who, site: OA.clone(s.site) };
    S.commit(); return { ok: true, count: ch.length };
  };
  act.discard = function (key) {
    var s = st(), p = s.published.site;
    var map = { hours: 'hours', banner: 'banner', policies: 'policies', prices: 'prices', services: 'services', shop: 'shop', quotes: 'quotes', artists: 'artists', portfolio: 'portfolio', announcements: 'announcements' };
    var keys = key ? [key] : Object.keys(map);
    keys.forEach(function (k) { if (map[k]) s.site[map[k]] = OA.clone(p[map[k]]); });
    S.commit();
  };

  /* ---------- portfolio ---------- */
  OA.items = function (slug) { var s = st().site; if (!s.portfolio[slug]) s.portfolio[slug] = []; return s.portfolio[slug]; };
  act.addPhotos = function (slug, files) {
    var list = Array.prototype.slice.call(files || []), added = [], failed = [];
    return list.reduce(function (p, f) {
      return p.then(function () { return OA.img.compress(f).then(OA.img.put).then(function (id) { added.push(id); }); }).catch(function (e) { failed.push({ name: f.name, msg: e.message }); });
    }, Promise.resolve()).then(function () {
      var items = OA.items(slug), top = items.reduce(function (m, p) { return Math.max(m, p.ord || 0); }, 0);
      added.forEach(function (id, i) { items.push({ id: OA.uid('ph'), src: id, cap: '', sec: '', onSite: false, ord: top + (i + 1) * 10 }); });
      if (added.length) S.commit();
      return { added: added.length, failed: failed };
    });
  };
  act.reorder = function (slug, fromId, toId) {
    var items = OA.items(slug).slice().sort(function (a, b) { return a.ord - b.ord; });
    var fi = items.findIndex(function (p) { return p.id === fromId; }), ti = items.findIndex(function (p) { return p.id === toId; });
    if (fi < 0 || ti < 0 || fi === ti) return;
    var m = items.splice(fi, 1)[0]; items.splice(ti, 0, m);
    items.forEach(function (p, i) { p.ord = (i + 1) * 10; }); S.commit();
  };
  act.moveBy = function (slug, id, delta) {
    var items = OA.items(slug).slice().sort(function (a, b) { return a.ord - b.ord; });
    var i = items.findIndex(function (p) { return p.id === id; }), j = OA.clamp(i + delta, 0, items.length - 1);
    if (i < 0 || i === j) return; act.reorder(slug, id, items[j].id);
  };
  act.removePhoto = function (slug, id) {
    var items = OA.items(slug), i = items.findIndex(function (p) { return p.id === id; });
    if (i < 0) return null; var it = items.splice(i, 1)[0]; S.commit(); return { item: it, index: i };
  };
  act.restorePhoto = function (slug, rec) { OA.items(slug).splice(rec.index, 0, rec.item); S.commit(); };
  act.makePair = function (slug, beforeId, afterId) {
    var items = OA.items(slug), b = items.filter(function (p) { return p.id === beforeId; })[0], a = items.filter(function (p) { return p.id === afterId; })[0];
    if (!b || !a || b === a) return false;
    b.pair = { b: b.src, a: a.src, bcap: b.cap, acap: a.cap }; b.sec = 'Before & after';
    items.splice(items.indexOf(a), 1); S.commit(); return { removedAfter: a };
  };
  act.splitPair = function (slug, id) {
    var items = OA.items(slug), p = items.filter(function (x) { return x.id === id; })[0]; if (!p || !p.pair) return false;
    var top = items.reduce(function (m, x) { return Math.max(m, x.ord || 0); }, 0);
    p.src = p.pair.b; var after = { id: OA.uid('ph'), src: p.pair.a, cap: p.pair.acap || '', sec: '', onSite: p.onSite, ord: p.ord + 1 };
    p.sec = ''; delete p.pair; items.push(after); S.commit(); return true;
  };
})();
