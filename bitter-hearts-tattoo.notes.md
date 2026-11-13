# Bitter Hearts Tattoo — Tier 2 PILOT build notes
Built 2026-11-02 (Jenson worker, expert front-end developer brief). Status: built + verified, NOT staged/committed. Staging is Jenson's step.

- Demo: `bitter-hearts-tattoo.html` (1,757,437 bytes, single file, photos inlined base64 at max 1100px q82 per fleet pattern)
- Hero video: `bitter-hearts-tattoo-hero.mp4` (1,235,399 bytes) copied from the stock bank `hero-tattoo.mp4` (8.0s, 1280x720, tattooing close work under a ring light, dark teal ambience), referenced by relative filename, no poster.
- Screenshots: `pilot-shots/` (mobile + desktop hero, full pages, visit, book cover + photo 1, form step 3, send envelope).

## Rolled variant slots (for the seed record)
- hero = full-bleed-video
- gallery = book (PageFlip, button/jump nav only)
- services = price-board (3 cards, SAMPLE prices)
- form = stepper-upload (tattoo standard, reference photos)
- ticker = standard (call block left, book block right)
- Signature element: the "In his own words" proof block (rating + the artist's own published words, attributed as his, ten-years line framed as his own description).

## Palette derivation (color theory)
- Photos are near-black fields with pale artwork. Chromatic seed sampled from the shop's signature heart artwork (photo-2): seafoam mint, about hue 155, held as `--mint #a9d8c4`.
- Bold trade rule: complementary accent at 155 + 180 = hue 335, crimson. The shop's own work confirms the family (photo-5 reds). Set `--acc #cf2233`, `--acc-deep #8f1122`.
- 60-30-10: 60 deep green-black field (`--bg #0a0d0b`, `--card #131a15`), 30 mint/sage (kickers, stars, ticker, book marks), 10 crimson (primary actions only, lit-button standard).
- Temperature: cool green dark, matching the photos.
- Type: Pirata One display (house tattoo face) + Inter body.

## Measured contrast (computed from the built CSS vars, WCAG ratios)
- ink #f2f5f1 on bg: 17.77 | ink2 #a9b8ad on bg: 9.44
- ink on card: 16.11 | ink2 on card: 8.55
- mint on bg: 12.37 | white on acc #cf2233: 5.34 | white on acc-deep: 9.25
- rose #f2b8bf on acc-soft (SAMPLE pill): 10.31
- Lowest pair is the primary button at 5.34, above the 4.5 body-text gate.

## Photo order rationale (book)
Shop/brand material leads, body canvases never lead:
1. photo-1, the shop's own walk-in sign artwork (brand-forward, says walk-ins in the shop's own hand)
2. photo-2, the Bitter Hearts heart signature artwork
3. photo-5, color piece photographed inside the shop (interior, chairs and flash wall visible)
4. photo-3, black and grey octopus upper arm (biggest canvas, mid-book by design)
5. photo-4, small abstract blackwork
6. photo-6, fine line tree with lettering (quiet closer)
Cover and back cover are styled pages (heart mark; name/address/phone on the back), no photos outside the book anywhere on the page. Every photo's alt text equals its caption; captions centered (verified computed text-align: center).

## Gate results (all rendered/measured, VM Playwright venv)
- Abacus hit img present, key 717digitalstudio-demos/bitter-hearts-tattoo: PASS (loaded live in render)
- grep "{{" = 0: PASS | em dashes in copy = 0: PASS | HTML comments = 0: PASS
- Google Maps iframe: none anywhere (directions is a query-link button): PASS
- Hours printed exactly once: "12:00 PM"/"8:00 PM" appear only in the 5 Visit table rows (Mon/Sun read Closed per the partial-schedule rule; the time was removed from the book back cover and form copy where a first draft restated it): PASS
- Review count: 539/259 appear nowhere in page content (grep hits are base64 noise only); "★ 4.7" prints in hero + proof only; zero invented reviews (dossier banks none): PASS
- Console: ZERO errors and zero pageerrors at 390px and 1280px across load, book, and full form runs: PASS
- Overflow: scrollWidth == viewport at 390 and 1280: PASS
- Wrap rects at 390px: hero headline and first section head start at L=20: PASS
- .formcard at 1280px: width 780 (builder cap), left gap 250 = right gap 250 (dead center, auto margins): PASS
- Hours card at 1280px: 640 wide (fleet cap; an early render caught the grid shrink-wrap trap at 313 and the visit grid was rebuilt with definite columns): PASS
- Book: opens to Cover, Next = Photo 1 of 6, dot jump = Photo 3 of 6, Esc and backdrop close, swipe/click-flip disabled: PASS
- Form: step gates refuse empty steps in plain words; phone auto-formats (234) 855-0892 and send blocks under 7 digits; upload adds/removes thumbnails (max 5, 25 MB, image-only checks in code); summary composes live; send plays the 2000ms envelope then hands off to sms: with the composed text, and says so honestly: PASS
- Primary phone numbers are all tel: links (6 instances of tel:+12348550892): PASS
- OG + meta description + LocalBusiness JSON-LD from the fact lock only (no rating object, no review count); favicon = inline SVG "B" in the accent: PASS

## Render environment note (for whoever re-verifies)
VM Chromium cannot use the sandbox's authenticated egress proxy directly (ERR_NO_SUPPORTED_PROXIES). QA renders ran through a tiny local CONNECT relay on 127.0.0.1:8899 that injects the proxy auth from the HTTPS_PROXY env var, plus ignore_https_errors=True because the egress proxy MITMs TLS. With that, fonts, the PageFlip CDN, and the Abacus hit all load for real and the console is honestly empty. The relay was a throwaway QA process and has been stopped; the recipe is in this note.
