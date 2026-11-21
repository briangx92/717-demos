#!/usr/bin/env python3
"""Instattoosionalized request API: a small local server with an SQLite database.

Public:  GET /api/challenge, POST /api/requests   (website form)
Admin:   GET /api/requests                         (owner portal, Bearer token)

Standard library only. Run:  python3 server.py   (see README.md)
Security notes are in README.md. The short version: every query is parameterized,
every value is stored as plain text and never echoed back, the captcha is a signed
single-use proof-of-work, and nothing secret is printed or kept in code.
"""
import datetime as dt, hashlib, hmac, json, os, re, secrets, sqlite3, sys, threading, time, unicodedata, urllib.error, urllib.request
from zoneinfo import ZoneInfo
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- settings
MAX_BODY = 8 * 1024
CHALLENGE_TTL_MS = 10 * 60 * 1000
MIN_FILL_MS = 1000            # a human cannot read and finish a form faster than this after the challenge was issued
POW_MAX = 40000               # about 20k hashes on average, around a second in a browser
LIMITS = {'submit_hour': 5, 'submit_day': 20, 'admin_fail': 10, 'global_day': 300}
KINDS = ('tattoo', 'piercing', 'general')
SIZES = ('', 'Small', 'Medium', 'Large', 'Not sure yet')
SOURCES = ('quick', 'guided')
SLUG = re.compile(r'^[a-z0-9][a-z0-9-]{0,31}$')
KEY = re.compile(r'^[a-f0-9]{16,32}$')
FIELD_MAX = {'name': 80, 'phone': 30, 'place': 120, 'idea': 600, 'when': 160, 'note': 600}
ALLOWED_KEYS = {'name', 'phone', 'kind', 'artist', 'services', 'size', 'place', 'idea', 'when', 'note', 'source', 'captcha', 'hp', 'client_key'}
CAPTCHA_KEYS = {'challenge', 'salt', 'iat', 'expires', 'number', 'signature'}


class Config:
    def __init__(self, env=None):
        e = os.environ if env is None else env
        self.bind = e.get('PORTAL_BIND', '127.0.0.1')
        self.port = int(e.get('PORTAL_PORT', '8787'))
        self.data_dir = os.path.abspath(e.get('PORTAL_DATA_DIR', os.path.join(HERE, 'data')))
        self.origins = {o.strip().rstrip('/') for o in e.get('PORTAL_ALLOWED_ORIGINS', '').split(',') if o.strip()}
        self.artists = {a.strip() for a in e.get('PORTAL_ARTISTS', '').split(',') if a.strip()}
        self.trust_proxy = e.get('PORTAL_TRUST_PROXY', '0') == '1'
        self.tz = e.get('PORTAL_TZ', 'America/New_York')
        ZoneInfo(self.tz)   # fail at startup, not at the first report, if the zone name is wrong
        self.limits = dict(LIMITS)


def _private_file(path, make):
    """Read a secret file, creating it (mode 0600) on first use."""
    if not os.path.exists(path):
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as f:
            f.write(make())
    with open(path) as f:
        return f.read().strip()


class App:
    def __init__(self, cfg):
        self.cfg = cfg
        os.makedirs(cfg.data_dir, mode=0o700, exist_ok=True)
        self.secret = _private_file(os.path.join(cfg.data_dir, 'secret.key'), lambda: secrets.token_hex(32)).encode()
        tok_path = os.path.join(cfg.data_dir, 'admin.token')
        self.admin_token = ''
        if os.path.exists(tok_path):
            with open(tok_path) as f:
                self.admin_token = f.read().strip()
        self.lock = threading.Lock()
        old = os.umask(0o077)  # the database file is created private
        try:
            self.db = sqlite3.connect(os.path.join(cfg.data_dir, 'portal.db'), check_same_thread=False, isolation_level=None)
        finally:
            os.umask(old)
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('PRAGMA busy_timeout=5000')
        with open(os.path.join(HERE, 'schema.sql')) as f:
            self.db.executescript(f.read())

    # ------------------------------------------------------------ helpers
    def ip_hash(self, ip):
        return hmac.new(self.secret, b'ip:' + ip.encode(), hashlib.sha256).hexdigest()[:32]

    def count(self, ip_hash, kind, since_ms):
        return self.db.execute('SELECT COUNT(*) FROM attempts WHERE ip_hash=? AND kind=? AND ts>=?', (ip_hash, kind, since_ms)).fetchone()[0]

    def record(self, ip_hash, kind, now):
        self.db.execute('INSERT INTO attempts (ip_hash, kind, ts) VALUES (?,?,?)', (ip_hash, kind, now))

    def bump(self, name):
        self.db.execute('INSERT INTO counters (name, value) VALUES (?,1) ON CONFLICT(name) DO UPDATE SET value=value+1', (name,))

    def purge(self, now):
        self.db.execute('DELETE FROM used_challenges WHERE expires < ?', (now,))
        self.db.execute('DELETE FROM attempts WHERE ts < ?', (now - 2 * 86400000,))


    # ------------------------------------------------------------ analytics
    def form_stats(self, days, now_ms):
        tz = ZoneInfo(self.cfg.tz)
        today = dt.datetime.fromtimestamp(now_ms / 1000, tz).date()
        since = today - dt.timedelta(days=days - 1)
        start_ms = int(dt.datetime.combine(since, dt.time.min, tz).timestamp() * 1000)
        rows = self.db.execute('SELECT created_at, source, artist, kind FROM requests WHERE created_at >= ?', (start_ms,)).fetchall()
        per, src, art, kind = {}, {}, {}, {}
        for created, source, artist, k in rows:
            d = dt.datetime.fromtimestamp(created / 1000, tz).date().isoformat()
            per[d] = per.get(d, 0) + 1; src[source] = src.get(source, 0) + 1; kind[k] = kind.get(k, 0) + 1
            art[artist or 'no preference'] = art.get(artist or 'no preference', 0) + 1
        series = [{'date': (since + dt.timedelta(days=i)).isoformat(), 'count': per.get(((since + dt.timedelta(days=i)).isoformat()), 0)} for i in range(days)]
        top = lambda m: sorted(({'label': k, 'count': v} for k, v in m.items()), key=lambda x: -x['count'])
        return {'total': len(rows), 'daily': series, 'by_source': top(src), 'by_artist': top(art), 'by_kind': top(kind), 'today': today}

    def analytics(self, days, now_ms):
        form = self.form_stats(days, now_ms)
        today = form.pop('today')
        cache = getattr(self, '_cf_cache', {})
        c, why = _load_cf(self.cfg)
        if c is None:
            cf = {'state': 'not_configured'} if why == 'not_configured' else {'state': 'error', 'error': why}
        else:
            hit = cache.get(days)
            if hit and time.time() < hit[0]:
                cf = hit[1]
            else:
                cf = build_cloudflare(c, min(days, 30), today)
                ok = all(v.get('state') in ('ok', 'not_configured') for v in cf.values())
                cache[days] = (time.time() + (CF_CACHE_OK_S if ok else CF_CACHE_ERR_S), cf); self._cf_cache = cache
            cf = {'state': 'ok' if any(v.get('state') == 'ok' for v in cf.values()) else 'error', **cf, 'days': min(days, 30)}
        stats = dict(self.db.execute('SELECT name, value FROM counters').fetchall())
        return {'generated_at': now_ms, 'days': days, 'timezone': self.cfg.tz, 'form': form, 'cloudflare': cf, 'protection': stats}

    # ------------------------------------------------------------ captcha (signed proof-of-work)
    def _sign(self, challenge, salt, iat, expires):
        return hmac.new(self.secret, f'{challenge}.{salt}.{iat}.{expires}'.encode(), hashlib.sha256).hexdigest()

    def new_challenge(self, now):
        salt = secrets.token_hex(12)
        number = secrets.randbelow(POW_MAX + 1)
        challenge = hashlib.sha256((salt + str(number)).encode()).hexdigest()
        expires = now + CHALLENGE_TTL_MS
        return {'algorithm': 'SHA-256', 'challenge': challenge, 'salt': salt, 'iat': now, 'expires': expires,
                'maxnumber': POW_MAX, 'signature': self._sign(challenge, salt, now, expires)}

    def check_captcha(self, c, now):
        """Returns (ok, reason). Does not mark the challenge used; the caller does that in the same transaction as the insert."""
        if not isinstance(c, dict) or set(c) != CAPTCHA_KEYS:
            return False, 'Please wait for the check to finish and try again.'
        try:
            challenge, salt, signature = str(c['challenge']), str(c['salt']), str(c['signature'])
            iat, expires, number = int(c['iat']), int(c['expires']), int(c['number'])
        except (TypeError, ValueError):
            return False, 'The check could not be read. Reload the page and try again.'
        if not hmac.compare_digest(signature, self._sign(challenge, salt, iat, expires)):
            return False, 'The check did not verify. Reload the page and try again.'
        if now > expires:
            return False, 'The check expired. Try again.'
        if now - iat < MIN_FILL_MS:
            return False, 'That was too fast. Try again.'
        if not 0 <= number <= POW_MAX or hashlib.sha256((salt + str(number)).encode()).hexdigest() != challenge:
            return False, 'The check did not verify. Reload the page and try again.'
        return True, ''



# ---------------------------------------------------------------- analytics
CF_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql'
CF_CACHE_OK_S, CF_CACHE_ERR_S = 600, 30


def _load_cf(cfg):
    """data/cloudflare.json: {"api_token","account_tag","site_tag","zone_tag"}. The token is read here and nowhere else."""
    path = os.path.join(cfg.data_dir, 'cloudflare.json')
    if not os.path.exists(path):
        return None, 'not_configured'
    try:
        with open(path) as f:
            c = json.load(f)
    except (OSError, ValueError):
        return None, 'cloudflare.json could not be read. It has to be valid JSON.'
    missing = [k for k in ('api_token', 'account_tag', 'site_tag') if not isinstance(c.get(k), str) or not c[k].strip()]
    if missing:
        return None, 'cloudflare.json is missing: ' + ', '.join(missing)
    for k in ('account_tag', 'site_tag', 'zone_tag'):
        if c.get(k) and not re.match(r'^[A-Za-z0-9_-]{8,64}$', c[k]):
            return None, k + ' does not look like a Cloudflare ID.'
    return c, ''


def cf_post(token, query, variables):
    req = urllib.request.Request(CF_ENDPOINT, data=json.dumps({'query': query, 'variables': variables}).encode(), method='POST',
                                 headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError('Cloudflare answered %d. %s' % (e.code, 'The API token was refused. Check it has Account Analytics: Read.' if e.code in (401, 403) else ''))
    except (urllib.error.URLError, TimeoutError, ValueError):
        raise RuntimeError('Could not reach Cloudflare.')


Q_TRAFFIC = """query($acc: String!, $site: String!, $dates: [Date!]) { viewer { accounts(filter:{accountTag:$acc}) {
  daily: rumPageloadEventsAdaptiveGroups(filter:{siteTag:$site, date_in:$dates}, limit:100) { count dimensions { date } }
  pages: rumPageloadEventsAdaptiveGroups(filter:{siteTag:$site, date_in:$dates}, limit:10, orderBy:[count_DESC]) { count dimensions { requestPath } }
  countries: rumPageloadEventsAdaptiveGroups(filter:{siteTag:$site, date_in:$dates}, limit:8, orderBy:[count_DESC]) { count dimensions { countryName } }
  referrers: rumPageloadEventsAdaptiveGroups(filter:{siteTag:$site, date_in:$dates}, limit:8, orderBy:[count_DESC]) { count dimensions { refererHost } }
  devices: rumPageloadEventsAdaptiveGroups(filter:{siteTag:$site, date_in:$dates}, limit:5, orderBy:[count_DESC]) { count dimensions { deviceType } }
} } }"""
# Field names below are NOT confirmed against Cloudflare's live schema (only cumulativeLayoutShiftP50 appears in the docs I could read).
Q_VITALS = """query($acc: String!, $site: String!, $dates: [Date!]) { viewer { accounts(filter:{accountTag:$acc}) {
  vitals: rumWebVitalsEventsAdaptiveGroups(filter:{siteTag:$site, date_in:$dates}, limit:1) {
    count quantiles { largestContentfulPaintP75 interactionToNextPaintP75 cumulativeLayoutShiftP75 } } } } }"""
Q_EDGE = """query($zone: String!, $since: Date!, $until: Date!) { viewer { zones(filter:{zoneTag:$zone}) {
  edge: httpRequests1dGroups(limit:100, filter:{date_geq:$since, date_leq:$until}) { dimensions { date } sum { requests cachedRequests bytes cachedBytes } } } } }"""


def _cf_section(token, query, variables, pick):
    try:
        res = cf_post(token, query, variables)
        if res.get('errors'):
            msg = '; '.join(str(e.get('message', 'error'))[:160] for e in res['errors'][:3])
            return {'state': 'error', 'error': 'Cloudflare rejected this part of the report: ' + msg}
        return {'state': 'ok', **pick(res['data']['viewer'])}
    except RuntimeError as e:
        return {'state': 'error', 'error': str(e)}
    except (KeyError, IndexError, TypeError):
        return {'state': 'error', 'error': 'Cloudflare answered in a shape this portal does not recognize.'}


def build_cloudflare(c, days, today):
    dates = [(today - dt.timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]
    tok = c['api_token']
    def rows(a, key, dim):
        return [{'label': (r['dimensions'].get(dim) or '(none)'), 'count': r['count']} for r in a.get(key, [])]
    def traffic(v):
        a = v['accounts'][0]
        per = {r['dimensions']['date']: r['count'] for r in a['daily']}
        series = [{'date': d, 'count': per.get(d, 0)} for d in dates]
        return {'total': sum(x['count'] for x in series), 'daily': series, 'pages': rows(a, 'pages', 'requestPath'), 'countries': rows(a, 'countries', 'countryName'),
                'referrers': rows(a, 'referrers', 'refererHost'), 'devices': rows(a, 'devices', 'deviceType')}
    out = {'traffic': _cf_section(tok, Q_TRAFFIC, {'acc': c['account_tag'], 'site': c['site_tag'], 'dates': dates}, traffic)}
    def vitals(v):
        g = v['accounts'][0]['vitals']
        q = g[0]['quantiles'] if g else None
        return {'sample': g[0]['count'] if g else 0, 'lcp_ms': q and q['largestContentfulPaintP75'], 'inp_ms': q and q['interactionToNextPaintP75'], 'cls': q and q['cumulativeLayoutShiftP75']}
    out['vitals'] = _cf_section(tok, Q_VITALS, {'acc': c['account_tag'], 'site': c['site_tag'], 'dates': dates}, vitals)
    if c.get('zone_tag'):
        def edge(v):
            g = v['zones'][0]['edge']
            req = sum(r['sum']['requests'] for r in g); hit = sum(r['sum']['cachedRequests'] for r in g)
            return {'requests': req, 'cached': hit, 'cache_ratio': (hit / req) if req else None, 'bytes': sum(r['sum']['bytes'] for r in g)}
        out['edge'] = _cf_section(tok, Q_EDGE, {'zone': c['zone_tag'], 'since': dates[0], 'until': dates[-1]}, edge)
    else:
        out['edge'] = {'state': 'not_configured'}
    return out


# ---------------------------------------------------------------- validation
class Invalid(Exception):
    pass


def clean_text(value, field, max_len, multiline=False, required=False):
    if value is None:
        value = ''
    if not isinstance(value, str):
        raise Invalid(f'{field} has to be text.')
    value = unicodedata.normalize('NFC', value)
    out = []
    for ch in value:
        cat = unicodedata.category(ch)
        if ch in '\n\r\t':
            out.append('\n' if (multiline and ch != '\t') else ' ')
        elif cat in ('Cc', 'Cf', 'Cs', 'Co', 'Cn') or ch in '  ':
            continue   # control, format (bidi tricks, zero width), surrogate, private, unassigned
        else:
            out.append(ch)
    value = ''.join(out)
    value = re.sub(r'[ ]{2,}', ' ', value)
    value = re.sub(r'\n{3,}', '\n\n', value).strip()
    if required and not value:
        raise Invalid(f'Add your {field}.')
    if len(value) > max_len:
        raise Invalid(f'{field.capitalize()} is too long (the limit is {max_len} characters).')
    return value


def validate_request(body, cfg):
    if not isinstance(body, dict):
        raise Invalid('Send the request as a JSON object.')
    extra = set(body) - ALLOWED_KEYS
    if extra:
        raise Invalid('The request had a field the shop does not accept.')
    name = clean_text(body.get('name'), 'name', FIELD_MAX['name'], required=True)
    if re.search(r'[<>]', name):
        raise Invalid('Names cannot include < or >.')
    phone = clean_text(body.get('phone'), 'phone', FIELD_MAX['phone'], required=True)
    digits = re.sub(r'\D', '', phone)
    if not 7 <= len(digits) <= 15 or re.search(r'[^0-9+()\-.\s]', phone):
        raise Invalid('The phone number needs 7 to 15 digits and only numbers, spaces and ( ) + - .')
    kind = body.get('kind', 'general')
    if kind not in KINDS:
        raise Invalid('Pick tattoo, piercing or general.')
    client_key = body.get('client_key')
    if not isinstance(client_key, str) or not KEY.match(client_key):
        raise Invalid('The request is missing its retry key. Reload the page and try again.')
    artist = body.get('artist') or ''
    if artist and (not isinstance(artist, str) or not SLUG.match(artist) or (cfg.artists and artist not in cfg.artists)):
        raise Invalid('That artist is not on the list.')
    services = body.get('services', [])
    if not isinstance(services, list) or len(services) > 10:
        raise Invalid('Too many services were picked.')
    services = [clean_text(s, 'service', 80) for s in services]
    size = body.get('size') or ''
    if size not in SIZES:
        raise Invalid('Pick a size from the list.')
    source = body.get('source', 'quick')
    if source not in SOURCES:
        raise Invalid('Unknown form type.')
    return {
        'client_key': client_key, 'name': name, 'phone': phone, 'kind': kind, 'artist': artist, 'services': json.dumps([s for s in services if s]),
        'size': size, 'place': clean_text(body.get('place'), 'placement', FIELD_MAX['place']),
        'idea': clean_text(body.get('idea'), 'idea', FIELD_MAX['idea'], multiline=True),
        'when': clean_text(body.get('when'), 'timing', FIELD_MAX['when']),
        'note': clean_text(body.get('note'), 'note', FIELD_MAX['note'], multiline=True), 'source': source,
    }


# ---------------------------------------------------------------- http
def make_handler(app):
    cfg = app.cfg

    class Handler(BaseHTTPRequestHandler):
        server_version = 'portal-api'
        sys_version = ''
        timeout = 10               # slow or stalled clients are dropped
        protocol_version = 'HTTP/1.1'

        def log_message(self, fmt, *args):   # method, path and status only: no bodies, no tokens
            sys.stderr.write('%s %s\n' % (self.log_date_time_string(), fmt % args))

        # -------- plumbing
        def client_ip(self):
            if cfg.trust_proxy:
                ip = self.headers.get('CF-Connecting-IP')
                if ip:
                    return ip.strip()[:64]
            return self.client_address[0]

        def origin_ok(self):
            o = self.headers.get('Origin')
            return o is None or o.rstrip('/') in cfg.origins

        def send_json(self, status, obj, extra=None):
            data = json.dumps(obj, ensure_ascii=False).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
            o = self.headers.get('Origin')
            if o and o.rstrip('/') in cfg.origins:
                self.send_header('Access-Control-Allow-Origin', o.rstrip('/'))
                self.send_header('Vary', 'Origin')
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(data)

        def fail(self, status, msg, extra=None):
            self.send_json(status, {'error': msg}, extra)

        def read_json(self):
            ctype = (self.headers.get('Content-Type') or '').split(';')[0].strip().lower()
            if ctype != 'application/json':
                self.fail(415, 'Send JSON with Content-Type: application/json.'); return None
            if self.headers.get('Transfer-Encoding'):
                self.fail(411, 'Send a Content-Length instead of chunked encoding.'); return None
            try:
                n = int(self.headers.get('Content-Length', ''))
            except ValueError:
                self.fail(411, 'Content-Length is required.'); return None
            if n < 0 or n > MAX_BODY:
                self.fail(413, 'That request is too large.'); return None
            raw = self.rfile.read(n)
            try:
                return json.loads(raw.decode('utf-8'))
            except (UnicodeDecodeError, ValueError, RecursionError):
                self.fail(400, 'The request was not valid JSON.'); return None

        # -------- routes
        def do_OPTIONS(self):
            o = self.headers.get('Origin')
            if not o or o.rstrip('/') not in cfg.origins:
                self.fail(403, 'This site is not allowed to call the API.'); return
            self.send_response(204)
            self.send_header('Access-Control-Allow-Origin', o.rstrip('/'))
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.send_header('Access-Control-Max-Age', '600')
            self.send_header('Vary', 'Origin')
            self.send_header('Content-Length', '0')
            self.end_headers()

        def do_GET(self):
            try:
                u = urlsplit(self.path)
                if u.path == '/api/health':
                    return self.send_json(200, {'ok': True})
                if u.path == '/api/challenge':
                    if not self.origin_ok():
                        return self.fail(403, 'This site is not allowed to call the API.')
                    return self.send_json(200, app.new_challenge(int(time.time() * 1000)))
                if u.path == '/api/requests':
                    return self.admin(parse_qs(u.query), self.admin_list)
                if u.path == '/api/analytics':
                    return self.admin(parse_qs(u.query), self.admin_analytics)
                self.fail(404, 'Not found.')
            except Exception as e:  # never leak internals
                self.internal(e)

        def do_POST(self):
            try:
                if urlsplit(self.path).path != '/api/requests':
                    return self.fail(404, 'Not found.')
                if not self.origin_ok():
                    return self.fail(403, 'This site is not allowed to call the API.')
                self.submit()
            except Exception as e:
                self.internal(e)

        def internal(self, e):
            sys.stderr.write('internal error: %s\n' % type(e).__name__)
            try:
                self.fail(500, 'Something went wrong on the shop’s server. Please call or text the shop instead.')
            except Exception:
                pass

        def submit(self):
            now = int(time.time() * 1000)
            body = self.read_json()
            if body is None:
                return
            iph = app.ip_hash(self.client_ip())
            with app.lock:
                app.purge(now)
                if app.count(iph, 'submit', now - 3600000) >= cfg.limits['submit_hour'] or app.count(iph, 'submit', now - 86400000) >= cfg.limits['submit_day']:
                    return self.fail(429, 'Too many requests from this connection. Please call or text the shop.', {'Retry-After': '3600'})
                total = app.db.execute('SELECT COUNT(*) FROM requests WHERE created_at >= ?', (now - 86400000,)).fetchone()[0]
                if total >= cfg.limits['global_day']:
                    return self.fail(503, 'The form is paused for today. Please call or text the shop.')
                # Every attempt that gets this far counts, successful or not, so guessing the captcha is limited too.
                app.record(iph, 'submit', now)
                if isinstance(body, dict) and body.get('hp'):
                    app.bump('honeypot_discarded')     # a bot filled the hidden field: look successful, store nothing
                    return self.send_json(201, {'ok': True, 'id': secrets.token_hex(6)})
                try:
                    fields = validate_request(body, cfg)
                except Invalid as e:
                    return self.fail(400, str(e))
                # A retry of a request that already saved (the answer got lost on the way back) must not save twice.
                prior = app.db.execute('SELECT public_id FROM requests WHERE client_key=?', (fields['client_key'],)).fetchone()
                if prior:
                    app.bump('retry_deduplicated')
                    return self.send_json(201, {'ok': True, 'id': prior[0]})
                ok, reason = app.check_captcha(body.get('captcha'), now)
                if not ok:
                    app.bump('captcha_failed')
                    return self.fail(400, reason)
                public_id = secrets.token_urlsafe(9)
                try:
                    app.db.execute('BEGIN IMMEDIATE')
                    app.db.execute('INSERT INTO used_challenges (challenge, expires) VALUES (?,?)', (body['captcha']['challenge'], int(body['captcha']['expires'])))
                    app.db.execute(
                        'INSERT INTO requests (client_key, public_id, created_at, name, phone, kind, artist, services, size, place, idea, when_text, note, source, ip_hash) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                        (fields['client_key'], public_id, now, fields['name'], fields['phone'], fields['kind'], fields['artist'], fields['services'], fields['size'],
                         fields['place'], fields['idea'], fields['when'], fields['note'], fields['source'], iph))
                    app.db.execute('COMMIT')
                except sqlite3.IntegrityError:
                    app.db.execute('ROLLBACK')
                    app.bump('captcha_replayed')   # the only unique key that can collide here is the single-use challenge
                    return self.fail(400, 'That check was already used. Reload the page and try again.')
                except Exception:
                    app.db.execute('ROLLBACK')
                    raise
            self.send_json(201, {'ok': True, 'id': public_id})   # nothing the visitor typed is sent back

        def admin(self, q, handler):
            if not app.admin_token:
                return self.fail(503, 'Admin access is not set up on this server. Run: python3 server.py --make-token')
            if not self.origin_ok():
                return self.fail(403, 'This site is not allowed to call the API.')
            now = int(time.time() * 1000)
            iph = app.ip_hash(self.client_ip())
            with app.lock:
                if app.count(iph, 'admin_fail', now - 600000) >= cfg.limits['admin_fail']:
                    return self.fail(429, 'Too many failed sign-ins. Wait ten minutes.', {'Retry-After': '600'})
                auth = self.headers.get('Authorization', '')
                tok = auth[7:] if auth.startswith('Bearer ') else ''
                if not hmac.compare_digest(tok.encode(), app.admin_token.encode()):
                    app.record(iph, 'admin_fail', now)
                    return self.fail(401, 'The access token was not accepted.', {'WWW-Authenticate': 'Bearer'})
                return handler(q, now)

        def admin_analytics(self, q, now):
            try:
                days = int((q.get('days') or ['28'])[0])
            except ValueError:
                return self.fail(400, 'days has to be a whole number.')
            if not 7 <= days <= 90:
                return self.fail(400, 'days has to be between 7 and 90.')
            self.send_json(200, app.analytics(days, now))

        def admin_list(self, q, now):
            if True:
                try:
                    after = max(0, int((q.get('after') or ['0'])[0]))
                    limit = min(200, max(1, int((q.get('limit') or ['100'])[0])))
                except ValueError:
                    return self.fail(400, 'after and limit have to be whole numbers.')
                rows = app.db.execute(
                    'SELECT seq, public_id, created_at, name, phone, kind, artist, services, size, place, idea, when_text, note, source FROM requests WHERE seq > ? ORDER BY seq LIMIT ?',
                    (after, limit)).fetchall()
            keys = ['seq', 'id', 'created_at', 'name', 'phone', 'kind', 'artist', 'services', 'size', 'place', 'idea', 'when', 'note', 'source']
            out = []
            for r in rows:
                d = dict(zip(keys, r)); d['services'] = json.loads(d['services']); out.append(d)
            stats = dict(app.db.execute('SELECT name, value FROM counters').fetchall())
            self.send_json(200, {'requests': out, 'next_after': out[-1]['seq'] if out else after, 'stats': stats})

    return Handler


def serve(cfg=None):
    cfg = cfg or Config()
    app = App(cfg)
    srv = ThreadingHTTPServer((cfg.bind, cfg.port), make_handler(app))
    srv.daemon_threads = True
    return srv, app


def main():
    cfg = Config()
    if '--make-token' in sys.argv:
        os.makedirs(cfg.data_dir, mode=0o700, exist_ok=True)
        path = os.path.join(cfg.data_dir, 'admin.token')
        if os.path.exists(path):
            print('An admin token already exists at', path); return
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as f:
            f.write(secrets.token_urlsafe(32))
        print('Admin token written to', path, '(not shown). Open that file to copy it into the portal.'); return
    srv, app = serve(cfg)
    print('Listening on http://%s:%d' % (cfg.bind, cfg.port), '| data in', cfg.data_dir, '| origins:', ', '.join(sorted(cfg.origins)) or 'none')
    if not app.admin_token:
        print('Admin access is off. Run: python3 server.py --make-token, then restart.')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
