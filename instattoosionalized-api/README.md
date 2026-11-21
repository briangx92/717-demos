# Instattoosionalized request server

Small server that saves what people send through the website form, and feeds the owner portal.
Python 3.9+ standard library only. SQLite database. No packages to install.

```
python3 server.py --make-token      # once: writes data/admin.token (not shown)
cp .env.example .env                # then set the values below in your service or shell
python3 server.py
python3 -m unittest discover -s tests -t .      # 30 tests
```

## What it serves

| Route | Who | What |
|---|---|---|
| `GET /api/challenge` | the website | a signed spam-check puzzle |
| `POST /api/requests` | the website | saves a request. Answers `201 {ok, id}` only after the row is committed |
| `GET /api/requests?after=N&limit=100` | the portal (Bearer token) | requests newer than N, plus spam counters |
| `GET /api/analytics?days=28` | the portal (Bearer token) | form numbers from the database, plus Cloudflare traffic and speed |

## Settings (environment)

`PORTAL_BIND` (127.0.0.1), `PORTAL_PORT` (8787), `PORTAL_DATA_DIR` (./data), `PORTAL_ALLOWED_ORIGINS` (exact origins of the website and the portal),
`PORTAL_ARTISTS` (slugs the form may name), `PORTAL_TZ` (America/New_York, used for "per day"), `PORTAL_TRUST_PROXY` (see Cloudflare).

## Security, and what each part does

- **Captcha.** Self-hosted proof of work: the server signs a puzzle, the browser solves it in about a second, the server checks the signature,
  expiry and answer, and each answer works once. It costs a bot compute for every submission without showing people anything to click.
  It is weaker against a determined attacker than a hosted challenge. If spam gets through, swap in Cloudflare Turnstile (free): the form sends the Turnstile token and `check_captcha` verifies it with Cloudflare.
- **Hidden field.** Bots that fill every field are told "sent" and nothing is saved; the count is visible in the portal under Analytics ("Spam stopped") so a wrongly dropped person is noticeable.
- **Rate limits.** Per visitor (keyed hash of the address, never the address), per day overall, and failed admin sign-ins.
- **No SQL injection.** Every query uses placeholders. A test fails the build if any query is built by string joining.
- **No cross-site scripting.** Input is validated, length-limited, stripped of control and direction-changing characters, and stored as plain text. The API only ever answers JSON with
  `nosniff` and `default-src 'none'`. The browser pages show it with `textContent`, never as HTML. Both pages also carry a Content-Security-Policy. The public page still has inline scripts, so its policy limits where data can go and blocks plugins, `<base>` and form posts, but it is not a full script lock; the portal's policy does lock scripts to its own files.
- **Retries.** Each send carries a random key. If the answer is lost and the person retries, the server returns the original id instead of saving twice.
- **Secrets.** `data/secret.key`, `data/admin.token` and `data/cloudflare.json` are created or read with owner-only permissions, never printed, never logged, never returned by the API. `data/` is git-ignored.

## Cloudflare

**Traffic and speed.** Turn on Web Analytics for the site in Cloudflare, create an API token with *Account Analytics: Read* (add *Zone Analytics: Read* for caching numbers), then write `data/cloudflare.json`
(permissions 600):

```json
{ "api_token": "…", "account_tag": "…", "site_tag": "…", "zone_tag": "…optional" }
```

The server asks Cloudflare's GraphQL API, caches for 10 minutes, and shows each part's own error in the portal. **Not verified:** I could not run these queries (no token here).
Page views, countries, pages, referrers and devices use field names from Cloudflare's published example. The speed query (`largestContentfulPaintP75`, `interactionToNextPaintP75`, `cumulativeLayoutShiftP75`) and the caching query are best guesses at the names;
if Cloudflare rejects one, the portal shows Cloudflare's message for that part only. Fix the name in `Q_VITALS` / `Q_EDGE` in `server.py`.

**Where this server runs.** Cloudflare Pages serves the website and portal (static). This Python server cannot run on Pages or Workers. Two honest options:
1. Run it on a small always-on machine (such as the Raspberry Pi) and publish it through a Cloudflare Tunnel. Then set `PORTAL_TRUST_PROXY=1` **only if** the server is reachable through the tunnel alone, so the real visitor address comes from `CF-Connecting-IP`.
2. Port it to a Cloudflare Worker with D1 (SQLite-compatible). The schema in `schema.sql` carries over; the handlers would need rewriting in JavaScript.

After deploying, set the server's address in two places in each page: the `request-api` / `portal-api` meta tag and the `connect-src` list in the Content-Security-Policy tag. Add the website and portal origins to `PORTAL_ALLOWED_ORIGINS`.
