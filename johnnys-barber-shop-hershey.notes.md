# Johnny's Barbershop Downunder (Hershey) — ingest notes, 2026-11-03

Return: Pi upload `~/tinker-lab-data/uploads/johnnys-barber-shop-hershey/v1.html` (72,044 bytes, md5 95bd4187b07e4669f86e0234b4c5f895, transferred intact).
Procedure: ingest_external_demo_builds skill, clerk ingest. NOT pushed, NOT staged; awaiting Jenson final verification, seeding sign-off, staging.

## Identity (matching order)
1. Case tag: NONE in the return (no case-tag meta, no sidecar in the upload). Reported as a discrepancy; identity did not depend on it.
2. Counter slug: MATCHED. `<div id="hit-counter" data-key="johnnys-barber-shop-hershey">` and `SITE.slug` both read `johnnys-barber-shop-hershey`.
3. Business name: "Johnny's Barbershop Downunder" matches the dossier name field verbatim.
4. Phone/address: (717) 533-1277 and 102 W Chocolate Ave, Hershey, PA 17033 match `dossiers/johnnys-barber-shop-hershey/profile.json` (phone verified on three sources per dossier flag 2).
Dossiers `johnnys-barbershop` (Lancaster, pitched, hands off) and `johnnys-auto-care` were NOT touched; zero Lancaster facts appear in the return (no Prince St, no (717) 826-5151, no Lancaster text).

## Facts vs dossier
- MATCH: name, phone, address, Facebook Page URL, rating 5.0 / 30 Google printable (dossier firsthand from listing of record; Yelp 3.0/6 correctly absent), own-words line verbatim from the published description (truncated second sentence correctly not completed), walk-ins model.
- Hours `null` in the return: LEFT NULL deliberately. Dossier flag 3 rules hours unprintable (listing of record vs owner-claimed Yelp disagree on every shared day; pitch-stage confirmation item). The page renders "Call for hours", which is the fleet hours-honesty treatment. This is the one case where the skill's fill-null-hours step must NOT run.
- Prices: the business publishes none (dossier price_hints). The return carries the packet's studio sample set (Haircut 25, Beard trim 15, Hot towel shave 25, Kids cut 20, Line up none) with the note "Sample prices for illustration. Call for current pricing." rendered with the prices — compliant with the 2026-10-30 sample-prices-under-SAMPLE-framing rule. The content-farm figures ($30 / $25 child) were NOT used.
- Services: typical-barber set per the dossier's own build guidance (the business publishes no list). "Hot towel shave" and "Line up / edge up" are generic trade filler, not dossier facts.
- Reviews: `reviews: []` and the dossier banks NO verbatim quotes (content-farm pools excluded by dossier flag 10e). Nothing added; the page's reviews link goes to Google Maps search (read-reviews treatment).
- Form: the return carries a guided request form (the v2 build had none; dossier conversion note says call-first, not appointment-only). Builder's design choice, not a content error; the form composes SMS to the correct Hershey number. Flagged for Jenson/Brian at review, not altered at ingest.
- The phone input placeholder is (717) 555-0123 — a placeholder only, same accepted pattern as prior ingests. The displayed/dialed number everywhere is (717) 533-1277.

## Repairs made
1. `[VIDEO:hero]` → `johnnys-barber-shop-hershey-hero.mp4` (stock bank `hero-barber.mp4` copied beside the HTML). No poster attribute existed; nothing to strip.
2. `[PHOTO:work1..4]` → the dossier's 4 banked photos inlined (max 1100px, JPEG q82), alt/caption text rewritten from the dossier's photo captions.
3. Counter wired: Abacus hit img (fleet pattern) inserted into the return's empty `#hit-counter` element, key `717digitalstudio-demos/johnnys-barber-shop-hershey`; endpoint answers HTTP 200.
4. "Message me about this site" URL corrected from `https://www.facebook.com/717DigitalStudio` to the fleet-standard `https://m.me/717digitalstudio`.
5. HTML comments: the return carried ZERO; nothing stripped, nothing to log in ingest-exceptions.

## Gates
- Tokens: 0 bracket tokens survive; `{{` count 0.
- Scripts: 1 block extracted, `node --check` PASS. Script searched for map embeds / iframe creation: none (the only Maps references are google.com/maps/search links for directions + reviews, which are links, not embeds; no iframe anywhere in markup or script).
- Rendered (Pi Playwright, file served locally): desktop 1280×900 and phone 390×844 — zero console errors, zero page errors, scrollY = 0 on open, hero video playing (1280×720, readyState 4) with no poster and no static photo, services + sample-prices note + "Call for hours" + address + phone + ★5.0·30 all present in rendered text, credit link href = m.me/717digitalstudio, no horizontal overflow at either width (scrollWidth == innerWidth).
- Gallery book: 5 pages (cover + 4 photos); photo pages start `hidden` with lazy images by design; advancing the book (ArrowRight) loads each photo in turn (loaded count 0→1→2 verified), zero errors.

## Seed-row reconcile
- Found: seed row **2026-082** ("Johnny's Barber Shop (Hershey)", built 2026-10-18, Skeleton v2) carrying `demo_deleted: "2026-11-01 clean slate"`. A second older row reference (2026-045, v5.10) exists only inside 2026-082's outcome text.
- Did: reused 2026-082 (no new seed; next_seed stays 2026-226). Cleared `demo_deleted`, appended the 2026-11-03 rebuild record to `outcome`, added `rebuilt` + `rebuild_engine`. Atomic write; verified 213 rows, only row 2026-082 changed. Dossier profile.json `seed` block gained a matching `rebuild_2026_11_03` note.
- Per the skill's lesson: with the flag cleared, a future feed rebuild will not force `pitch_text: null` for this kit. (Feed rebuild is Jenson's staging step, not done here.)

## Files written
- `~/workspace/717-demos/johnnys-barber-shop-hershey.html` (working copy, 1,018,540 bytes, NOT pushed)
- `~/workspace/717-demos/johnnys-barber-shop-hershey-hero.mp4` (stock-bank copy, 1,505,792 bytes, NOT pushed)
- `~/workspace/717-demos/johnnys-barber-shop-hershey.notes.md` (this file)
- `~/workspace/fb-prospects/seeds.json` (row 2026-082 reconciled)
- `~/workspace/fb-prospects/dossiers/johnnys-barber-shop-hershey/profile.json` (seed-block rebuild note)
