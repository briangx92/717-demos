# Bucher's Lawn Care — ingest notes (Claude return v1, 2026-11-03)

Source return: Pi ~/tinker-lab-data/uploads/buchers-lawn-care/v1.html (91,799 bytes).
Working copy: ~/workspace/717-demos/buchers-lawn-care.html (386,423 bytes after repairs). NOT committed or pushed; staging is Jenson's step.

## Identification
- Case-tag meta in the return is EMPTY (content=""), so match step 1 failed.
- No Abacus/counter slug in the return (empty #hit-counter element, data-key="buchers-lawn-care").
- Matched on step 3, business name: title and SITE data name the business; corroborated by the upload folder slug, SITE.slug, and the phone/address in the data matching the dossier of record at ~/workspace/fb-prospects/dossiers/buchers-lawn-care/profile.json exactly. Dossier used: buchers-lawn-care.

## Repairs made at ingest
1. Hero token [VIDEO:hero] replaced with the hosted lawn hero: video-bank hero-lawn.mp4 copied to buchers-lawn-care-hero.mp4 beside the HTML and referenced relatively. Video carries no poster (none present in the return; none added).
2. Gallery tokens replaced with the dossier's two banked photos, inlined base64 (q82, max 1100px wide): [PHOTO:work1] -> photos/photo2.jpg (the genuine work photo, the mulched bed, leads the book) and [PHOTO:work2] -> photos/photo1.jpg (the award announcement graphic). Alt text set from the dossier captions.
3. Hit counter wired into the return's empty #hit-counter element with the fleet-standard 1x1 img: abacus.jasoncameron.dev/hit/717digitalstudio-demos/buchers-lawn-care. Key verified answering before staging (GET /get returned value 17, the count carried from the October build).
4. Display name corrected to the business's own spelling: dossier flag 4 records the listing spelling "Buchers Lawn Care" but instructs that a build's display type match the logo, "Bucher's Lawn Care". Changed in the page title, meta description, SITE.name, SITE.nameParts, and SITE.shortName. Slug, counter key, and URLs untouched.
5. HTML comments: the return carried none (0 found), so nothing was stripped and no ingest-exceptions entry was needed.

## Fact check vs the dossier (field by field)
- MATCH: phone (717) 514-2630 (data + tel/sms compose), address 138 Brooksmill Rd, East Hanover Twp, PA 17028, hours 8:00 AM to 5:00 PM all seven days, tagline "Treat your lawn to some BLC", claims (Fully Insured / Free Estimates / Commercial and Residential), award (Readers' Choice 2020, Harrisburg Magazine, Landscaping / Lawn Service), the seven named service areas, Facebook URL, services named exactly as the dossier's only two itemized services (Lawn care, Landscaping).
- RATING handled correctly by the builder: data carries 5.0 / 3 reviews with printable: false; the rendered page prints no star and uses the read-reviews-on-Google treatment. No reviews section was added: the dossier banks no verbatim review quotes.
- Ticker/stripe content checked in the render: services + claims from the page's own facts, correct as returned.

## Discrepancies and flags for Jenson (not repaired)
1. PHONE SINGLE-SOURCE (dossier flag 2, pre-existing): (717) 514-2630 rests on the Places/Google listing alone, uncorroborated; the dossier says confirm it from the Page's About in Brian's personal view before it is dialed. The build prints it (as did the October build); the flag carries to pitch time.
2. SAMPLE PRICES vs DOSSIER: the return carries a sample price board (Mowing visit $55, Seasonal cleanup $220, Mulch per yard $95, Hedge trimming $75) under full visible SAMPLE framing (heading "Sample prices", note "Sample prices for illustration. Call for current pricing.", SAMPLE stamp per group, "Sample" prefix on each price) — compliant with Brian's standing sample-price rule, but the dossier (flag 6, checked 2026-10-17) records that this business publishes no prices and "nothing is printable". Flagged so the tension is decided knowingly, not by default.
3. SERVICE DESCRIPTIONS ELABORATE: the two attested services carry generic descriptions ("Mowing, edging, and trimming on a regular schedule...", "Beds, mulch, shrubs, and plantings..."). Service names are exactly the attested two and no extra service is itemized as the business's own, but the dossier (flag 5) warns a generic lawn menu must not be presented as this business's menu. The descriptions sit on that line; Jenson's call.
4. EMAIL NOT ON THE PAGE: the dossier records brandon.m.bucher@gmail.com (from the Page, 2026-10-22), but the return's contact paths are call / SMS compose / Facebook only, consistent with the Messenger contact gate. Noted as an absence, not an error.
5. Form mechanics: quick + guided tabbed forms, both submit handlers preventDefault, send composes an sms: body to the shop number with the fleet fmtPhone (digits, leading 1 dropped, 10 cap). No native-submit reload path once the script runs (single script block, node --check clean).

## Gate results
- Script check: the return's single script block extracted and node --check PASS; re-extracted and re-checked PASS after repairs.
- Tokens: zero [VIDEO:]/[PHOTO:] tokens and zero {{ }} slots left in the file, and none in the rendered body text.
- Maps: no iframe in markup, no runtime iframe creation in the script. The only Google Maps strings build directions / read-reviews search links (buttons), which are allowed.
- Rendered check (VM Playwright, file:// working copy): desktop 1280px and phone 390px both render every section with content (services, prices board, work book, reviews treatment, visit hours Mon-Sun 8:00 AM - 5:00 PM, request form). Page opens at scrollY 0 at both widths. Hero is video only, no poster, readyState 4. Book flip verified by clicking Next: page 1 shows the bed photo (naturalWidth 326, its native size), page 2 the award graphic (naturalWidth 1100). Zero page errors at both widths.
- Could not verify in the sandbox: Google Fonts and the Abacus hit image fail with ERR_TUNNEL_CONNECTION_FAILED from VM Chromium (known sandbox egress block); the counter key itself was verified answering by direct request (value 17), and the served-page check after Jenson pushes will confirm both load live.
- Screenshots: ~/workspace/717-demos/ingest-shots/buchers-lawn-care/ (desktop/phone full + top, phone work cover/page1/page2).

## Seed-row reconcile
- Found: seeds.json row 2026-079 (Bucher's Lawn Care) carried demo_deleted: "2026-11-01 clean slate" from the clean slate; this rebuild reuses the row (no new seed; next_seed untouched at 2026-226).
- Did: cleared demo_deleted and appended the 2026-11-03 rebuild to the row's outcome in the same pass (plus rebuilt/rebuild_engine fields), atomic write, verified 213 rows after. Per the skill, a stale flag would have forced pitch_text: null at feed rebuild; that trap is now disarmed for this kit. No pitch file exists yet, and no feed rebuild was run (staging is Jenson's).
