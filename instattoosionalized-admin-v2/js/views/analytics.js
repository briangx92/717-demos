/* Analytics: who visits the site, how fast it loads, and how many visits turn into requests.
   Traffic and speed come from Cloudflare through the shop server. Request counts come from the shop's own database.
   Every part says what it is, shows its own error, and never fills a gap with a made-up number. */
(function () {
  'use strict';
  var OA = window.OA, h = OA.h, ui = OA.ui;
  var DAYS = [['7', 'Last 7 days'], ['14', 'Last 14 days'], ['28', 'Last 28 days']];
  var cache = { key: '', at: 0, data: null, error: '', loading: false };
  var useSample = false;

  /* ---------- sample numbers (clearly labelled; only for looking at the layout) ---------- */
  function sample(days) {
    var out = { sample: true, days: days, timezone: 'America/New_York', protection: { honeypot_discarded: 6, captcha_failed: 3 }, form: { total: 0, daily: [], by_source: [{ label: 'quick', count: 21 }, { label: 'guided', count: 13 }], by_artist: [{ label: 'lex', count: 14 }, { label: 'no preference', count: 12 }, { label: 'liv', count: 8 }], by_kind: [] },
      cloudflare: { state: 'ok', days: days } };
    var t = 0, f = 0, base = OA.todayISO(), td = [], fd = [];
    for (var i = days - 1; i >= 0; i--) {
      var d = OA.addDays(base, -i), w = OA.dow(d), v = Math.round(38 + 22 * Math.sin(i * 1.3) + (w === 5 || w === 6 ? 24 : 0) + (i % 4) * 3), q = Math.max(0, Math.round(v / 24 + Math.sin(i * 2.1)));
      td.push({ date: d, count: v }); fd.push({ date: d, count: q }); t += v; f += q;
    }
    out.form.daily = fd; out.form.total = f;
    out.cloudflare.traffic = { state: 'ok', total: t, daily: td,
      pages: [['/', .62], ['/artists/lex', .13], ['/prices', .1], ['/aftercare', .08], ['/artists/liv', .07]].map(function (p) { return { label: p[0], count: Math.round(t * p[1]) }; }),
      referrers: [['(none)', .46], ['instagram.com', .31], ['google.com', .16], ['facebook.com', .07]].map(function (p) { return { label: p[0], count: Math.round(t * p[1]) }; }),
      countries: [['United States', .93], ['Canada', .04], ['United Kingdom', .03]].map(function (p) { return { label: p[0], count: Math.round(t * p[1]) }; }),
      devices: [['mobile', .78], ['desktop', .2], ['tablet', .02]].map(function (p) { return { label: p[0], count: Math.round(t * p[1]) }; }) };
    out.cloudflare.vitals = { state: 'ok', sample: 310, lcp_ms: 2100, inp_ms: 140, cls: 0.03 };
    out.cloudflare.edge = { state: 'ok', requests: 9400, cached: 8650, cache_ratio: 8650 / 9400, bytes: 612000000 };
    return out;
  }

  /* ---------- small pieces ---------- */
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function fmtBytes(b) { return b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(0) + ' MB' : (b / 1e3).toFixed(0) + ' KB'; }
  function empty(msg) { return h('p', { class: 'note', text: msg }); }
  function sectionError(title, msg) { return h('div', { class: 'an-err', role: 'alert' }, h('strong', { text: title + ' could not load. ' }), h('span', { text: msg })); }

  function kpi(label, value, note, kind) {
    return h('div', { class: 'kpi' + (kind ? ' ' + kind : '') }, h('span', { class: 'kpi-l', text: label }), h('strong', { class: 'kpi-v', text: value }), note ? h('span', { class: 'kpi-n', text: note }) : null);
  }

  function bars(series, cls, noun) {
    var max = Math.max.apply(null, series.map(function (x) { return x.count; }).concat([1])), total = series.reduce(function (a, x) { return a + x.count; }, 0);
    var chart = h('div', { class: 'an-bars ' + cls, role: 'img', 'aria-label': noun + ' per day, ' + fmt(total) + ' in total. The numbers are in the table below.' });
    series.forEach(function (x) {
      chart.appendChild(h('div', { class: 'an-col', title: OA.fmtDow(x.date) + ': ' + fmt(x.count) }, h('span', { class: 'an-fill', style: 'height:' + Math.max(x.count ? 3 : 0, Math.round(x.count / max * 100)) + '%' })));
    });
    var rows = series.map(function (x) { return h('tr', {}, h('td', { text: OA.fmtDow(x.date) }), h('td', { class: 'num', text: fmt(x.count) })); });
    return h('div', {}, chart, h('div', { class: 'an-axis' }, h('span', { text: OA.fmtDow(series[0].date) }), h('span', { text: OA.fmtDow(series[series.length - 1].date) })),
      h('details', { class: 'an-table' }, h('summary', { text: 'See the numbers' }), h('table', {}, h('thead', {}, h('tr', {}, h('th', { text: 'Day' }), h('th', { class: 'num', text: noun }))), h('tbody', {}, rows))));
  }

  function ranked(rows, empty0) {
    if (!rows || !rows.length) return empty(empty0 || 'Nothing in this period yet.');
    var max = Math.max.apply(null, rows.map(function (r) { return r.count; })), total = rows.reduce(function (a, r) { return a + r.count; }, 0);
    var ul = h('ul', { class: 'an-rank' });
    rows.forEach(function (r) {
      ul.appendChild(h('li', {}, h('span', { class: 'an-rk-l', text: r.label }), h('span', { class: 'an-rk-bar', 'aria-hidden': 'true' }, h('i', { style: 'width:' + Math.round(r.count / max * 100) + '%' })),
        h('span', { class: 'an-rk-n', text: fmt(r.count) + (total ? ' (' + Math.round(r.count / total * 100) + '%)' : '') })));
    });
    return ul;
  }

  /* Google's published thresholds for Core Web Vitals. */
  var VITALS = [
    { key: 'lcp_ms', name: 'Loading', long: 'Largest Contentful Paint', good: 2500, poor: 4000, show: function (v) { return (v / 1000).toFixed(1) + ' s'; }, goal: 'Good is 2.5 s or less.' },
    { key: 'inp_ms', name: 'Response to taps', long: 'Interaction to Next Paint', good: 200, poor: 500, show: function (v) { return Math.round(v) + ' ms'; }, goal: 'Good is 200 ms or less.' },
    { key: 'cls', name: 'Layout jumping', long: 'Cumulative Layout Shift', good: 0.1, poor: 0.25, show: function (v) { return Number(v).toFixed(2); }, goal: 'Good is 0.10 or less.' }
  ];
  function rate(v, m) { return v <= m.good ? ['Good', 'ok'] : v <= m.poor ? ['Needs work', 'warn'] : ['Poor', 'bad']; }

  function vitals(sec) {
    if (sec.state === 'error') return sectionError('Page speed', sec.error);
    if (sec.lcp_ms == null && sec.inp_ms == null && sec.cls == null) return empty('Not enough visits yet to measure speed. Cloudflare needs a few hundred page loads.');
    var wrap = h('div', { class: 'an-vitals' });
    VITALS.forEach(function (m) {
      var v = sec[m.key];
      if (v == null) { wrap.appendChild(h('div', { class: 'kpi' }, h('span', { class: 'kpi-l', text: m.name }), h('strong', { class: 'kpi-v', text: 'No data' }), h('span', { class: 'kpi-n', text: m.long }))); return; }
      var r = rate(v, m);
      wrap.appendChild(h('div', { class: 'kpi ' + r[1] }, h('span', { class: 'kpi-l', text: m.name }), h('strong', { class: 'kpi-v', text: m.show(v) }), ui.chip(r[0], r[1]), h('span', { class: 'kpi-n', text: m.long + '. ' + m.goal })));
    });
    wrap.appendChild(h('p', { class: 'note an-wide', text: 'Typical (75th percentile) experience across ' + fmt(sec.sample) + ' page loads, as measured in visitors’ own browsers.' }));
    return wrap;
  }

  /* ---------- the page ---------- */
  function build(d) {
    var root = h('div', {}), cf = d.cloudflare || { state: 'not_configured' }, tr = cf.traffic, views = tr && tr.state === 'ok' ? tr.total : null;
    var req = d.form.total, per100 = views ? (req / views * 100) : null;

    root.appendChild(h('div', { class: 'kpis' },
      kpi('Page views', views == null ? 'Not connected' : fmt(views), views == null ? 'Cloudflare traffic is not available.' : 'Last ' + cf.days + ' days, real browsers only.'),
      kpi('Requests from the form', fmt(req), 'Last ' + d.days + ' days, saved on the shop server.'),
      kpi('Requests per 100 views', per100 == null ? '–' : per100.toFixed(1), per100 == null ? 'Needs page views.' : (d.days !== cf.days ? 'Form count covers ' + d.days + ' days, views ' + cf.days + '.' : 'How many visits turned into a request.')),
      kpi('Spam stopped', fmt((d.protection.honeypot_discarded || 0) + (d.protection.captcha_failed || 0)), 'Since the server started. Bots caught by the hidden field or the check.')));

    if (cf.state === 'not_configured') {
      root.appendChild(h('section', { class: 'card an-setup' }, h('h2', { text: 'Connect Cloudflare to see traffic and speed' }),
        h('p', { text: 'The numbers below come from Cloudflare Web Analytics. The shop server asks Cloudflare for them, so the Cloudflare key never reaches this page.' }),
        h('ol', {}, h('li', { text: 'In Cloudflare, turn on Web Analytics for the site (it needs no cookies).' }), h('li', { text: 'Create an API token with Account Analytics: Read, and Zone Analytics: Read if you want caching numbers.' }),
          h('li', { text: 'Put the token and the account and site IDs in data/cloudflare.json on the shop server. The README shows the exact file.' }), h('li', { text: 'Reload this page.' }))));
    } else if (cf.state === 'error') {
      root.appendChild(sectionError('Cloudflare', cf.error || 'Every part of the report failed. See the details below.'));
    }

    if (tr) {
      var t = h('section', { class: 'card' }, h('h2', { text: 'Visits' }));
      if (tr.state === 'error') t.appendChild(sectionError('Traffic', tr.error));
      else {
        t.appendChild(bars(tr.daily, 'views', 'Page views'));
        t.appendChild(h('div', { class: 'an-grid' }, h('div', {}, h('h3', { text: 'Top pages' }), ranked(tr.pages)), h('div', {}, h('h3', { text: 'Where visitors came from' }), ranked(tr.referrers, 'No referrer data yet.')),
          h('div', {}, h('h3', { text: 'Devices' }), ranked(tr.devices)), h('div', {}, h('h3', { text: 'Countries' }), ranked(tr.countries))));
      }
      root.appendChild(t);
    }
    if (cf.vitals) root.appendChild(h('section', { class: 'card' }, h('h2', { text: 'How fast the site feels' }), vitals(cf.vitals)));
    if (cf.edge && cf.edge.state !== 'not_configured') {
      var e = cf.edge, c = h('section', { class: 'card' }, h('h2', { text: 'Cloudflare caching' }));
      if (e.state === 'error') c.appendChild(sectionError('Caching numbers', e.error));
      else c.appendChild(h('div', { class: 'kpis' }, kpi('Served from Cloudflare’s cache', e.cache_ratio == null ? '–' : Math.round(e.cache_ratio * 100) + '%', fmt(e.cached) + ' of ' + fmt(e.requests) + ' requests'), kpi('Data sent', fmtBytes(e.bytes), 'Includes bots and crawlers.')));
      root.appendChild(c);
    }

    var f = h('section', { class: 'card' }, h('h2', { text: 'Requests from the website form' }));
    f.appendChild(req ? bars(d.form.daily, 'reqs', 'Requests') : empty('No requests from the form in this period.'));
    f.appendChild(h('div', { class: 'an-grid' }, h('div', {}, h('h3', { text: 'Which form' }), ranked(d.form.by_source.map(function (x) { return { label: x.label === 'quick' ? 'Call-back (short)' : 'Full request', count: x.count }; }))),
      h('div', {}, h('h3', { text: 'Artist asked for' }), ranked(d.form.by_artist.map(function (x) { return { label: x.label === 'no preference' ? 'No preference' : (OA.chairName ? OA.chairName(x.label) : x.label), count: x.count }; })))));
    root.appendChild(f);
    root.appendChild(h('p', { class: 'note', text: 'Days are counted in ' + d.timezone + '. ' + (d.sample ? '' : 'Generated ' + OA.ago(d.generated_at) + '. Cloudflare numbers are saved for 10 minutes.') }));
    return root;
  }

  function render() {
    var q = arguments[1] || {}, days = DAYS.some(function (x) { return x[0] === q.days; }) ? q.days : '28', page = h('div', { class: 'page' }), body = h('div', { 'aria-live': 'polite' });
    var range = ui.select(DAYS, days, { 'aria-label': 'Time range' });
    range.addEventListener('change', function () { OA.go('analytics' + OA.query({ days: range.value })); });
    var refresh = ui.btn('Refresh', function () { cache.key = ''; load(true); }, '');
    page.appendChild(ui.pageHead('Analytics', 'How the website is doing: visits, speed, and how many visits turn into requests.', [range, refresh]));
    page.appendChild(body);

    function paint() {
      OA.clear(body);
      if (useSample) {
        body.appendChild(h('div', { class: 'bar demo' }, h('span', { text: 'Sample numbers. These are made up to show the layout. They are not this shop’s traffic.' }), ui.btn('Hide sample', function () { useSample = false; paint(); }, 'quiet')));
        body.appendChild(build(sample(Number(days)))); return;
      }
      if (!OA.api.configured()) {
        body.appendChild(ui.empty('The portal is not connected to the shop server', 'Analytics and website requests come from the shop server. Until the portal is pointed at it, there is nothing real to show.', h('div', { class: 'row' }, ui.btn('Show sample numbers', function () { useSample = true; paint(); }, 'primary'))));
        return;
      }
      if (!OA.api.hasToken()) { body.appendChild(ui.empty('Enter the access token', 'The shop server needs the owner’s access token before it shows analytics.', ui.link('Open Settings', '#/settings/connection', 'btn primary'))); return; }
      if (cache.loading) { body.appendChild(h('p', { class: 'note', text: 'Loading…' })); return; }
      if (cache.error) { body.appendChild(ui.empty('Analytics did not load', cache.error, h('div', { class: 'row' }, ui.btn('Try again', function () { load(true); }, 'primary'), ui.link('Settings', '#/settings/connection', 'btn quiet')))); return; }
      if (cache.data) body.appendChild(build(cache.data));
    }
    function load(force) {
      if (!OA.api.ready()) { paint(); return; }
      var key = days;
      if (!force && cache.key === key && Date.now() - cache.at < 60000 && cache.data) { paint(); return; }
      cache.loading = true; cache.error = ''; paint();
      OA.api.analytics(days).then(function (d) { cache = { key: key, at: Date.now(), data: d, error: '', loading: false }; }, function (e) { cache = { key: '', at: 0, data: null, error: e.message, loading: false }; }).then(function () { if (document.body.contains(body)) paint(); });
    }
    load(false);
    return page;
  }

  OA.views.analytics = { title: function () { return 'Analytics'; }, render: render };
})();
