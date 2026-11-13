ink-excess-tattoo-studio·z61
2026-11-05, 5:05 PM ET
first build, filled from demo-skeleton.html; section ids and data-module names unchanged
palette: warm bone light as the 60 (#f2eee6 bg, #fbf9f4 surface, #e7e0d3 sand), ink black #15120f as the 30 (hero, ticker, proof, band), one cobalt accent #2b3fc0 as the 10, kept to the primary actions; every text pair checked at 6.6:1 or better
type: Anton (display, tall condensed signage) against Source Serif 4 (body), 1.25 scale held in tokens; corners kept nearly square for a studio feel
Your move, named "Wall Letters": oversized Anton words (INK, WORK, the town from SITE, TALK) set between sections as studio wall signage in ink black; each starts as an ink outline and fills solid left to right when it scrolls into view (solid at once under reduced motion); a small numbered sign line rides above each
signature send animation, named "Ink Drop": a drop of ink falls to the center, spreads into a round stamp, and a check is drawn through it in bone; reduced motion shows the stamp and check with a short fade
photo book, named "Flash Sheet": tattoo is not on the category sheet, so I used a flash-sheet page (cream sheet, numbered "No. 01 of 06", thin ink rule frame); one photo per page, Prev and Next change instantly, steady size, no flip or zoom, swipe and arrow keys; built without PageFlip so no page-turn effect
form: two paths per muse-cta-form.md; guided path is Service, then Tattoo and/or Piercing detail steps built only from the families picked, then When, Contact, Review; unpicked family steps are never rendered and never reach the message
hours: Monday and Sunday are not published, so they read "Closed" in the Visit table per the master rule and can't be picked in the calendar
ticker right-side link reads "Request", not the skeleton's "Book", since appointments are not confirmed
the services intro quotes the studio's own description as theirs; the 60+ years is framed as the team combined
hero rating line and proof block print 4.9 from 115 Google reviews (marked printable); no quotes banked, so proof links to the reviews on Google
photo tokens [PHOTO:work1] to [PHOTO:work6] sit in SITE.photos; until ingest the book shows a numbered blank sheet instead of a broken image
tested at 320, 390, 1280, 1600 px: no sideways scroll; both form paths run end to end inside a sandboxed iframe; the only console errors are the unreplaced [VIDEO:hero] token and the offline hit counter, both of which resolve at ingest
nothing left unfinished

## Claude suggestions (intake, 2026-11-05 18:10 ET)
1. Please send the studio's logo or a signage photo so I can sample the real seed color; the cobalt accent and bone light are my read of "clean studio light with black ink" with no swatch to work from.
   Disposition: Sampled at ingest from the studio's own banked logo: the brand gold averages #cfa63e on black. The cobalt and bone are a clean read but they are not the shop's colors; the true sample is on record here, and a gold-and-black reskin is a verdict call for Brian rather than an ingest change.
2. Please confirm photo work1 is a studio or signage shot, or tell me the order to use, so the book never opens on a body close-up.
   Disposition: Done at ingest. The book opens on the crew outside the studio (the place and the team), then the gold sign poster, three finished pieces (zebra, tiger and rose, Pennywise), and the logo medallion as the closer. No body close-up leads the book.
3. Please confirm whether the studio takes walk-ins, appointments, or both; until then the page claims neither and the ticker says "Request".
   Disposition: Not on record anywhere in the dossier. Claim-neither stands, as built; the ticker already reads Request.
4. Please confirm whether Monday and Sunday are truly closed or just unlisted; the table prints "Closed" per the master rule.
   Disposition: Both are unpublished on the listing (hours run Tuesday to Saturday). The table prints Closed per the master rule; Brian ruled on this exact pattern on 2026-11-05 and said hold as built.
5. Please decide whether the piercing path should ask anything beyond "Which piercing?" (for example jewelry questions); I kept it to one field since the packet lists no piercing details.
   Disposition: Kept at the one field. The packet lists no piercing details to ask about and nothing in the dossier supports more questions; if the studio publishes jewelry or intake details later, the step can grow then.
