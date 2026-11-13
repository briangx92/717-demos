case: hines-auto-care-repair·z57

# Hines Auto Care & Repair — ingest notes (2026-11-03)

Ingest of the Claude return uploaded to the Pi (uploads/hines-auto-care-repair/v1.html), run per the ingest-external-demo-builds procedure. Nothing pushed, nothing sent, no pitch copy.

## Identification
- Business: Hines Auto Care & Repair, 501 4th Ave, Altoona, PA 16602, (814) 942-7101.
- Dossier of record: ~/workspace/fb-prospects/dossiers/hines-auto-care-repair/profile.json.
- Match path: the return's case-tag meta was EMPTY (packet predates the case-tag system) and the counter element was unwired, so identity rests on business name + phone + address, all exact against the dossier; SITE.slug and the counter data-key both read hines-auto-care-repair.
- Case tag stamped at ingest per Jenson's fix: `<meta name="case-tag" content="hines-auto-care-repair·z57">`, and this file's first line carries the same tag.

## Repairs made
1. Case-tag meta stamped (above).
2. `[VIDEO:hero]` → bank auto hero copied in as hines-auto-care-repair-hero.mp4 beside the HTML, referenced relatively. No poster existed; none added.
3. `[PHOTO:work1..4]` → the dossier's banked photo-1..4.jpg inlined (max 1100px, q82). Zero bracketed tokens survive.
4. Counter wired into the return's empty `#hit-counter` element (fleet Abacus img pattern, key 717digitalstudio-demos/hines-auto-care-repair). The key already exists from the 2026-10-31 build and answers (value 6 at ingest).
5. HTML comments in the return: none (0). Nothing stripped; no exceptions-log entry.

## Fact check vs the dossier
- Exact matches: name, phone (814) 942-7101 / +18149427101, address, Facebook URL, services (Auto repair, Vehicle maintenance, Diagnostics — the only three confirmed, and the only three pickable in the form), rating (5 / 14 Google, printable: true; renders "★ 5 · 14"), reviews empty (dossier banks no verbatim quotes; the page uses the read-reviews-on-Google treatment, nothing invented).
- Hours: the return renders Mon–Thu 7:30 AM–4:30 PM, Fri 7:30 AM–1:00 PM, Sat/Sun "Call for hours" — this matches dossier profile.json field for field. NOTE for Jenson: the parent brief summarized the verified hours as "Mon–Fri 7:30 AM–4:30 PM," but the dossier of record closes Friday at 1:00 PM and so does the return. The dossier was followed; flagging the summary line's difference.
- "36 years": exactly one occurrence, framed as the shop's own claim ("In the automotive repair industry for 36 years, by the shop's own count"). No owner name anywhere.
- Tires & state inspection: present ONLY in the SAMPLE price list ("Tires & Inspection" group: Tire rotation $25, State inspection $45) under the note "Sample prices for illustration. Call for current pricing." They are NOT in the services list and NOT pickable in the form (form picks verified in render: repair, maintenance, diagnostics only).
- The unbacked slogan "Fixed right, priced straight" appears nowhere.

## Gates
- Script: 1 block extracted from the finished file, `node --check` PASS. Script searched as well as markup: no iframe creation, no map embed (the only Maps string is a maps/search directions URL). `{{` = 0, em dashes = 0 (data URIs stripped for word gates).
- Rendered (VM Playwright, file://) at 1280px and 390px: scrollY 0 at open, no horizontal overflow, hero video loads video-only (readyState 4, no poster), all 7 hours rows render exactly as above, 4 book photos inlined as data URIs, form service tap exercised (repair toggles to "Added", aria-pressed true), zero page errors. Sandbox limit: Google Fonts and the Abacus hit pixel cannot load through the VM egress tunnel; the counter key itself was verified answering directly.

## Flags for Jenson's verification pass
1. STATUS PILL (report-only per instructions, not removed): the Visit module carries a live `[data-ref="status"]` pill that reads "Open now" / "Closed now" / "Call for hours today", refreshed every 60s. Its text prints NO times (no "until …" strings); the hours themselves print once, in the table it sits with.
2. The below-footer "Message me about this site" band links to facebook.com/717DigitalStudio (SITE.studioLink), not the current m.me/717digitalstudio fleet standard. Left as returned.
3. Friday hours: dossier (1:00 PM close) vs the brief's one-line summary (4:30 PM) — see Fact check.

## Seed row
- seeds.json row 2026-221 (Hines Auto Care & Repair, the 2026-10-31 Jenson draft) EXISTED and carried `demo_deleted: "2026-11-01 clean slate"`. Reconciled per the skill: row reused (no new seed; next_seed untouched at 2026-226), demo_deleted cleared, rebuild appended to its outcome with rebuilt/rebuild_engine set — atomic write, 213 rows verified, only that row changed.
- The dossier profile.json has NO seed block (empty, as briefed); the seeds.json row above is the record. No dossier edit made.

## Files written
- hines-auto-care-repair.html — repaired working copy (685,356 bytes, uncommitted)
- hines-auto-care-repair-hero.mp4 — bank auto hero beside it
- hines-auto-care-repair.notes.md — this sidecar
- ~/workspace/fb-prospects/seeds.json — seed-row reconcile only
