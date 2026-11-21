import hashlib, json, os, sqlite3, sys, tempfile, threading, time, unittest, urllib.request, urllib.error
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import server

ORIGIN = 'http://localhost:8765'
ADMIN = 'test-admin-token-123'


def solve(c):
    for n in range(c['maxnumber'] + 1):
        if hashlib.sha256((c['salt'] + str(n)).encode()).hexdigest() == c['challenge']:
            return {'challenge': c['challenge'], 'salt': c['salt'], 'iat': c['iat'], 'expires': c['expires'], 'number': n, 'signature': c['signature']}
    raise AssertionError('unsolvable')


class Base(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        with open(os.path.join(cls.tmp.name, 'admin.token'), 'w') as f:
            f.write(ADMIN)
        cfg = server.Config({'PORTAL_DATA_DIR': cls.tmp.name, 'PORTAL_PORT': '0', 'PORTAL_ALLOWED_ORIGINS': ORIGIN, 'PORTAL_ARTISTS': 'lex,liv'})
        server.MIN_FILL_MS = 400          # keep the suite fast; the rule itself is still tested
        cls.srv, cls.app = server.serve(cfg)
        cls.port = cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown(); cls.srv.server_close(); cls.app.db.close(); cls.tmp.cleanup()

    def setUp(self):
        self.app.db.execute('DELETE FROM requests'); self.app.db.execute('DELETE FROM attempts'); self.app.db.execute('DELETE FROM used_challenges')

    def call(self, method, path, body=None, headers=None, raw=None):
        h = {'Origin': ORIGIN}
        if body is not None or raw is not None:
            h['Content-Type'] = 'application/json'
        h.update(headers or {})
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        req = urllib.request.Request(f'http://127.0.0.1:{self.port}{path}', data=data, method=method, headers=h)
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.loads(r.read() or b'null'), r.headers
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read() or b'null'), e.headers

    def captcha(self, wait=True):
        s, c, _ = self.call('GET', '/api/challenge')
        self.assertEqual(s, 200)
        if wait:
            time.sleep(max(0, (c['iat'] + server.MIN_FILL_MS) / 1000 - time.time() + 0.05))
        return solve(c)

    def good(self, **over):
        b = {'name': 'Sam Rivera', 'phone': '(610) 555-0123', 'kind': 'tattoo', 'artist': 'lex', 'services': ['Small flash tattoo'],
             'size': 'Small', 'place': 'forearm', 'idea': 'a moth', 'when': 'Flexible', 'note': '', 'source': 'guided', 'client_key': os.urandom(8).hex()}
        b.update(over)
        if 'captcha' not in b:
            b['captcha'] = self.captcha()
        return b

    def rows(self):
        return self.app.db.execute('SELECT name, note, idea FROM requests').fetchall()


class Submit(Base):
    def test_happy_path_stores_and_echoes_nothing(self):
        s, j, h = self.call('POST', '/api/requests', self.good())
        self.assertEqual(s, 201); self.assertTrue(j['ok']); self.assertEqual(set(j), {'ok', 'id'})
        self.assertEqual(len(self.rows()), 1)
        self.assertEqual(h['X-Content-Type-Options'], 'nosniff'); self.assertTrue(h['Content-Type'].startswith('application/json'))

    def test_no_captcha_rejected(self):
        b = self.good(); del b['captcha']
        s, j, _ = self.call('POST', '/api/requests', b)
        self.assertEqual(s, 400); self.assertEqual(self.rows(), [])

    def test_captcha_replay_rejected(self):
        c = self.captcha()
        self.assertEqual(self.call('POST', '/api/requests', self.good(captcha=c))[0], 201)
        s, j, _ = self.call('POST', '/api/requests', self.good(captcha=c))
        self.assertEqual(s, 400); self.assertIn('already used', j['error']); self.assertEqual(len(self.rows()), 1)

    def test_captcha_tamper_rejected(self):
        c = self.captcha(); c['number'] = (c['number'] + 1) % server.POW_MAX
        self.assertEqual(self.call('POST', '/api/requests', self.good(captcha=c))[0], 400)
        c = self.captcha(); c['expires'] += 1000
        self.assertEqual(self.call('POST', '/api/requests', self.good(captcha=c))[0], 400)
        c = self.captcha(); c['challenge'] = 'a' * 64
        self.assertEqual(self.call('POST', '/api/requests', self.good(captcha=c))[0], 400)
        self.assertEqual(self.rows(), [])

    def test_captcha_forged_without_secret(self):
        salt = 'ab' * 12; ch = hashlib.sha256((salt + '5').encode()).hexdigest(); now = int(time.time() * 1000) - 5000
        c = {'challenge': ch, 'salt': salt, 'iat': now, 'expires': now + 600000, 'number': 5, 'signature': '0' * 64}
        self.assertEqual(self.call('POST', '/api/requests', self.good(captcha=c))[0], 400)

    def test_too_fast_rejected(self):
        s, j, _ = self.call('POST', '/api/requests', self.good(captcha=self.captcha(wait=False)))
        self.assertEqual(s, 400); self.assertIn('too fast', j['error'])

    def test_expired_rejected(self):
        c = self.captcha()
        orig = server.CHALLENGE_TTL_MS
        ok, reason = self.app.check_captcha(c, c['expires'] + 1)
        self.assertFalse(ok); self.assertIn('expired', reason)

    def test_honeypot_looks_ok_stores_nothing(self):
        s, j, _ = self.call('POST', '/api/requests', self.good(hp='http://spam.example'))
        self.assertEqual(s, 201); self.assertEqual(self.rows(), [])

    def test_validation(self):
        self.app.cfg.limits['submit_hour'] = 1000; self.app.cfg.limits['submit_day'] = 1000
        self.addCleanup(lambda: self.app.cfg.limits.update(submit_hour=server.LIMITS['submit_hour'], submit_day=server.LIMITS['submit_day']))
        bad = [dict(name=''), dict(name='<b>x</b>'), dict(phone='abc'), dict(phone='12'), dict(kind='tattoo; DROP'), dict(client_key='nothex'), dict(client_key=None), dict(artist='nobody'),
               dict(artist='../x'), dict(size='Huge'), dict(source='x'), dict(note='x' * 601), dict(services=['a'] * 11), dict(services='x'), dict(name=5)]
        for o in bad:
            s, j, _ = self.call('POST', '/api/requests', self.good(**o))
            self.assertEqual(s, 400, o)
        self.assertEqual(self.rows(), [])

    def test_retry_with_same_key_saves_once(self):
        key = os.urandom(8).hex()
        s1, j1, _ = self.call('POST', '/api/requests', self.good(client_key=key))
        s2, j2, _ = self.call('POST', '/api/requests', self.good(client_key=key))   # fresh captcha, same key: the first answer was "lost"
        self.assertEqual((s1, s2), (201, 201)); self.assertEqual(j1['id'], j2['id']); self.assertEqual(len(self.rows()), 1)

    def test_unknown_field_rejected(self):
        self.assertEqual(self.call('POST', '/api/requests', self.good(is_admin=True))[0], 400)

    def test_content_type_size_and_json(self):
        self.assertEqual(self.call('POST', '/api/requests', raw=b'name=x', headers={'Content-Type': 'text/plain'})[0], 415)
        self.assertEqual(self.call('POST', '/api/requests', raw=b'{' + b'a' * 9000 + b'}')[0], 413)
        self.assertEqual(self.call('POST', '/api/requests', raw=b'{not json')[0], 400)
        self.assertEqual(self.call('POST', '/api/requests', raw=b'[1,2]')[0], 400)
        self.assertEqual(self.call('POST', '/api/requests', raw=b'\xff\xfe')[0], 400)
        self.assertEqual(self.call('POST', '/api/requests', raw=b'[' * 3000 + b']' * 3000)[0], 400)

    def test_origin_allow_list(self):
        s, _, _ = self.call('POST', '/api/requests', self.good(), headers={'Origin': 'https://evil.example'})
        self.assertEqual(s, 403); self.assertEqual(self.rows(), [])
        s, _, h = self.call('GET', '/api/challenge', headers={'Origin': 'https://evil.example'})
        self.assertEqual(s, 403); self.assertIsNone(h.get('Access-Control-Allow-Origin'))
        s, _, h = self.call('GET', '/api/challenge')
        self.assertEqual(h['Access-Control-Allow-Origin'], ORIGIN)

    def test_rate_limit(self):
        self.app.cfg.limits['submit_hour'] = 3
        try:
            codes = [self.call('POST', '/api/requests', {'name': 'x'})[0] for _ in range(5)]
        finally:
            self.app.cfg.limits['submit_hour'] = server.LIMITS['submit_hour']
        self.assertEqual(codes, [400, 400, 400, 429, 429])


class Injection(Base):
    PAYLOADS = ["Robert'); DROP TABLE requests;--", "' OR '1'='1", '"; DELETE FROM requests; --', '‮txt.exe', 'a\x00b\x07c']

    def test_sql_payloads_are_stored_as_text(self):
        for p in self.PAYLOADS:
            s, j, _ = self.call('POST', '/api/requests', self.good(note=p, idea=p, captcha=self.captcha()))
            self.assertEqual(s, 201, p)
        n = self.app.db.execute('SELECT COUNT(*) FROM requests').fetchone()[0]
        self.assertEqual(n, len(self.PAYLOADS))
        notes = [r[0] for r in self.app.db.execute('SELECT note FROM requests ORDER BY seq')]
        self.assertEqual(notes[0], self.PAYLOADS[0]); self.assertEqual(notes[4], 'abc'); self.assertNotIn('‮', notes[3])

    def test_script_payloads_stored_inert_and_returned_as_json_only(self):
        xss = '<img src=x onerror=alert(1)><script>alert(2)</script>'
        s, _, _ = self.call('POST', '/api/requests', self.good(note=xss, captcha=self.captcha()))
        self.assertEqual(s, 201)
        s, j, h = self.call('GET', '/api/requests', headers={'Authorization': 'Bearer ' + ADMIN})
        self.assertEqual(s, 200); self.assertEqual(j['requests'][0]['note'], xss); self.assertIn('stats', j)
        self.assertTrue(h['Content-Type'].startswith('application/json')); self.assertEqual(h['X-Content-Type-Options'], 'nosniff')
        self.assertIn("default-src 'none'", h['Content-Security-Policy'])

    def test_names_cannot_hold_angle_brackets(self):
        self.assertEqual(self.call('POST', '/api/requests', self.good(name='<script>alert(1)</script>'))[0], 400)

    def test_no_string_formatting_in_sql(self):
        with open(os.path.join(os.path.dirname(__file__), '..', 'server.py')) as f:
            src = f.read()
        import re
        for m in re.finditer(r'\.execute\(\s*(f|["\'].*["\']\s*%|["\'].*["\']\s*\.format|["\'].*["\']\s*\+)', src):
            self.fail('string-built SQL: ' + m.group(0))


class Admin(Base):
    def test_requires_token(self):
        self.assertEqual(self.call('GET', '/api/requests')[0], 401)
        self.assertEqual(self.call('GET', '/api/requests', headers={'Authorization': 'Bearer nope'})[0], 401)
        self.assertEqual(self.call('GET', '/api/requests', headers={'Authorization': ADMIN})[0], 401)

    def test_lockout_after_failures(self):
        for _ in range(10):
            self.call('GET', '/api/requests', headers={'Authorization': 'Bearer bad'})
        self.assertEqual(self.call('GET', '/api/requests', headers={'Authorization': 'Bearer ' + ADMIN})[0], 429)

    def test_list_and_cursor(self):
        for i in range(3):
            self.call('POST', '/api/requests', self.good(name=f'P{i}', captcha=self.captcha()))
        s, j, _ = self.call('GET', '/api/requests?limit=2', headers={'Authorization': 'Bearer ' + ADMIN})
        self.assertEqual([r['name'] for r in j['requests']], ['P0', 'P1'])
        s, j2, _ = self.call('GET', f"/api/requests?after={j['next_after']}", headers={'Authorization': 'Bearer ' + ADMIN})
        self.assertEqual([r['name'] for r in j2['requests']], ['P2'])
        for r in j['requests'] + j2['requests']:
            self.assertNotIn('ip_hash', r)
        self.assertEqual(self.call('GET', '/api/requests?limit=abc', headers={'Authorization': 'Bearer ' + ADMIN})[0], 400)

    def test_admin_off_without_token(self):
        tok = self.app.admin_token; self.app.admin_token = ''
        try:
            self.assertEqual(self.call('GET', '/api/requests', headers={'Authorization': 'Bearer x'})[0], 503)
        finally:
            self.app.admin_token = tok

    def test_files_are_private_and_ip_not_stored(self):
        self.call('POST', '/api/requests', self.good())
        ip = self.app.db.execute('SELECT ip_hash FROM requests').fetchone()[0]
        self.assertNotIn('127.0.0.1', ip)
        mode = os.stat(os.path.join(self.tmp.name, 'secret.key')).st_mode & 0o777
        self.assertEqual(mode, 0o600)


class Analytics(Base):
    def setUp(self):
        super().setUp()
        self.cfpath = os.path.join(self.tmp.name, 'cloudflare.json')
        self.app._cf_cache = {}
        self.calls = []
        self.orig = server.cf_post

    def tearDown(self):
        server.cf_post = self.orig
        if os.path.exists(self.cfpath): os.remove(self.cfpath)

    def get(self, days=28):
        return self.call('GET', f'/api/analytics?days={days}', headers={'Authorization': 'Bearer ' + ADMIN})

    def conf(self, **extra):
        d = {'api_token': 'SECRET-CF-TOKEN', 'account_tag': 'a' * 32, 'site_tag': 'b' * 32}; d.update(extra)
        with open(self.cfpath, 'w') as f: f.write(json.dumps(d))

    def fake(self, token, query, variables):
        self.calls.append(query[:40])
        if 'rumPageload' in query:
            d = variables['dates'][-1]
            row = lambda dim, val, n: {'count': n, 'dimensions': {dim: val}}
            return {'data': {'viewer': {'accounts': [{'daily': [row('date', d, 40)], 'pages': [row('requestPath', '/', 30)], 'countries': [row('countryName', 'US', 38)],
                    'referrers': [row('refererHost', None, 20)], 'devices': [row('deviceType', 'mobile', 25)]}]}}}
        if 'rumWebVitals' in query:
            return {'data': {'viewer': {'accounts': [{'vitals': [{'count': 12, 'quantiles': {'largestContentfulPaintP75': 2100, 'interactionToNextPaintP75': 180, 'cumulativeLayoutShiftP75': 0.04}}]}]}}}
        return {'data': {'viewer': {'zones': [{'edge': [{'dimensions': {'date': 'x'}, 'sum': {'requests': 100, 'cachedRequests': 80, 'bytes': 5, 'cachedBytes': 4}}]}]}}}

    def test_requires_token_and_valid_days(self):
        self.assertEqual(self.call('GET', '/api/analytics')[0], 401)
        self.assertEqual(self.get(3)[0], 400); self.assertEqual(self.get(500)[0], 400)
        self.assertEqual(self.call('GET', '/api/analytics?days=x', headers={'Authorization': 'Bearer ' + ADMIN})[0], 400)

    def test_not_configured_still_returns_form_numbers(self):
        self.call('POST', '/api/requests', self.good())
        s, j, _ = self.get()
        self.assertEqual(s, 200); self.assertEqual(j['cloudflare']['state'], 'not_configured')
        self.assertEqual(j['form']['total'], 1); self.assertEqual(len(j['form']['daily']), 28); self.assertEqual(sum(x['count'] for x in j['form']['daily']), 1)
        self.assertEqual(j['form']['by_source'][0], {'label': 'guided', 'count': 1})

    def test_configured_happy_path_and_cache(self):
        self.conf(zone_tag='c' * 32); server.cf_post = self.fake
        s, j, _ = self.get(); cf = j['cloudflare']
        self.assertEqual(cf['state'], 'ok'); self.assertEqual(cf['traffic']['total'], 40); self.assertEqual(len(cf['traffic']['daily']), 28)
        self.assertEqual(cf['traffic']['referrers'][0]['label'], '(none)'); self.assertEqual(cf['vitals']['lcp_ms'], 2100)
        self.assertAlmostEqual(cf['edge']['cache_ratio'], 0.8)
        n = len(self.calls); self.get(); self.assertEqual(len(self.calls), n)   # cached
        self.assertNotIn('SECRET-CF-TOKEN', json.dumps(j))

    def test_section_errors_are_visible_not_hidden(self):
        self.conf()
        def bad(token, query, variables):
            if 'rumWebVitals' in query: return {'errors': [{'message': 'unknown field "largestContentfulPaintP75"'}], 'data': None}
            return self.fake(token, query, variables)
        server.cf_post = bad
        s, j, _ = self.get(); cf = j['cloudflare']
        self.assertEqual(cf['traffic']['state'], 'ok'); self.assertEqual(cf['vitals']['state'], 'error'); self.assertIn('unknown field', cf['vitals']['error'])

    def test_total_failure_and_bad_token(self):
        self.conf()
        def down(token, query, variables): raise RuntimeError('Cloudflare answered 403. The API token was refused. Check it has Account Analytics: Read.')
        server.cf_post = down
        s, j, _ = self.get()
        self.assertEqual(j['cloudflare']['state'], 'error'); self.assertIn('token was refused', j['cloudflare']['traffic']['error']); self.assertNotIn('SECRET', json.dumps(j))

    def test_malformed_config_reported(self):
        with open(self.cfpath, 'w') as f: f.write('{not json')
        s, j, _ = self.get()
        self.assertEqual(j['cloudflare']['state'], 'error'); self.assertIn('valid JSON', j['cloudflare']['error'])
        with open(self.cfpath, 'w') as f: f.write(json.dumps({'api_token': 'x'}))
        s, j, _ = self.get()
        self.assertIn('missing', j['cloudflare']['error'])
        self.conf(site_tag='b" } } evil'); s, j, _ = self.get()
        self.assertIn('does not look like', j['cloudflare']['error'])

    def test_daily_buckets_use_shop_time_zone(self):
        import datetime as dt
        from zoneinfo import ZoneInfo
        now = int(time.time() * 1000)
        ny = dt.datetime.fromtimestamp(now / 1000, ZoneInfo('America/New_York'))
        late = int(ny.replace(hour=23, minute=30).timestamp() * 1000)    # 11:30 pm shop time is already tomorrow in UTC
        self.call('POST', '/api/requests', self.good())
        self.app.db.execute('UPDATE requests SET created_at=?', (late,))
        j = self.get()[1]
        self.assertEqual(j['form']['daily'][-1]['date'], ny.date().isoformat()); self.assertEqual(j['form']['daily'][-1]['count'], 1)


if __name__ == '__main__':
    unittest.main(verbosity=1)
