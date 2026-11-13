# Inferno Studios Tattooing — ingest notes (2026-11-03)

Source return: Pi upload `~/tinker-lab-data/uploads/inferno-studios/v1.html` (86,636 bytes), a Claude Project build from `~/workspace/your_files/inferno-studios-packet.md`. Ingested per the ingest_external_demo_builds skill. Not pushed; staging is Jenson's step.

## Identity (procedure matching order)
- Case tag: the return's `<meta name="case-tag">` is EMPTY, and the packet issued no z-tag — nothing to match, nothing invented.
- Counter slug: the return's empty counter element carried `data-key="inferno-studios-tattooing"` (the known drift slug) — not the recorded counter key.
- Business name: MATCHED. Title/meta name "Inferno Studios Tattooing" = dossier `name` exactly.
- Phone/address: corroborated — (716) 790-1110 and 8 Field St, Kane, PA 16735, both exact vs the dossier.
- Filed under demo slug `inferno-studios`; dossier used: `~/workspace/fb-prospects/dossiers/inferno-studios/profile.json`.

## Repairs made
- `[VIDEO:hero]` → `inferno-studios-hero.mp4` (the kit's hosted hero, copied from `~/workspace/your_files/inferno-studios-pitch/` beside the HTML). No poster attribute present; none added.
- `[PHOTO:work1..6]` → the dossier's curated best six, in dossier order, inlined as JPEG data URIs: work1=photo2-in-progress, work2=photo3-world-map, work3=photo4-back-piece, work4=photo5-tree-spine, work5=photo6-script-thigh, work6=photo7-script-rib.
- Hit counter wired into the empty `#hit-counter` element with the canonical key `717digitalstudio-demos/inferno-studios` (fleet img pattern); the drifted data-key was dropped. Key answers: value 45 after the one verification hit.
- No HTML comments were present in the return (0), so nothing was stripped and no ingest-exceptions log entry was needed.

## Fact check vs dossier (field by field)
All exact: name, phone (mirror number 701-6230 absent), address (mirror 6789 US-6 absent), hours Mon–Sat 12:00 PM–9:00 PM + Sun 9:00 AM–5:00 PM in the data object and the rendered table (the "Call for hours" strings in the code are fallbacks for unpublished days and never render here), rating ★ 4.7 · 643 Google reviews, services (Tattooing; Body piercing category-level with a hedged "ask what the shop is offering" line, per the packet), sample prices exactly as the packet specified ($80 small piece / $200 per session / $40 earlobe pair / $50 helix) each labeled Sample under "Sample prices for illustration. Call for current pricing.", reviews array empty (no invented quotes; rated band points to Google), no staff names, no walk-ins claim, no est. 2006 claim, zero em dashes.

## Gates
- Script: 1 block; `node --check` PASS on the raw return and on the final file. No iframe creation, no runtime map embed (the maps URL is the directions button's href).
- Tokens: none survive (`[VIDEO:hero]`, `[PHOTO:workN]`, `{{` all 0).
- Rendered (VM Playwright, file://): desktop 1280px and phone 390px — scrollY 0 at open, no horizontal overflow, hero video loads (readyState 4) with no poster, services/prices/hours/rated sections populate with content, book flips through cover + all 6 plates with every photo loading, form exercised end to end (steps advance, phone auto-formats to (716) 790-1110, send enables at 7+ digits, done panel composes an SMS to +17167901110 carrying the request), zero page errors.
- Not verifiable inside the VM sandbox: Google Fonts and the Abacus hit fail through the sandbox egress tunnel (ERR_TUNNEL_CONNECTION_FAILED); the same Abacus URL answered via shell curl (value above). Served-copy verification after push remains Jenson's step.

## Seed row reconcile
Row 2026-073 (`inferno-studios`) carried `demo_deleted: "2026-11-01 clean slate"`. Cleared; rebuild appended to outcome; `rebuilt` + `rebuild_engine` set per the 100% Lawn Care precedent. Atomic write verified: 213 rows, only this row changed. Backup: `~/workspace/fb-prospects/seeds.json.bak-20261103-inferno-reconcile`.

## Flags for Jenson
- The "Message me about this site" band (below the footer, as required) links to https://www.facebook.com/717DigitalStudio — the packet's specified URL. The current house standard is https://m.me/717digitalstudio (one-tap Messenger thread). Left as the packet specified; your call.
- No Open Graph tags in the return's head (title/description/theme-color only); the five small standards from the pilot were not in this packet.
- The hero and Visit both render a live open/closed status line derived from the same hours data; the hours table itself prints once, in Visit.
- `SITE.slug` in the data object still reads "inferno-studios-tattooing"; it is defined once and never used by the script (inert).
- The packet asked Claude for a SUGGESTIONS section after the HTML; the uploaded file contains none (it may exist in Brian's Claude chat; not in the return).
- Dossier pitch-stage flags unchanged: Sunday hours conflict (listing governs in the demo), squatted-domain pitch hook, piercing is category-only.
