curiosities-coffee-and-ice-house·z34
2026-11-04 23:40 ET
first build
palette: analogous warm build from the shop's drink and ice cream tones. 60 cream (#FBF4E8), 30 latte (#F1DDBF), 10 cherry accent (#A3343F), espresso ink (#33201A). Body text 12:1+ on cream, cherry on latte 4.7:1
type: Fraunces (soft display serif) over Nunito Sans (body), 1.25 scale held in tokens, 8-point spacing tokens throughout
signature send animation: "Three-scoop cone". A waffle cone pops up and three scoops drop on it one by one in the build's colors, then the summary appears. Reduced motion: the finished cone fades in
your move (texture): "Ice House Board". The prices module is a hanging painted-wood plank sign: wood frame with nail heads, plank seams, worn latte paint, painted lettering, dotted leaders. Samples are labeled on the board
photo book: order-ticket style (food category), 6 tickets from [PHOTO:work1] to [PHOTO:work6], Prev/Next instant change, swipe and arrow keys, no flip or zoom
form: two paths per the CTA rules. "Get in touch" (name, phone, note) and "Build my order" (Order with quantity buttons, When, Contact, Review). Steps are built from SITE
form: the Takeout / Curbside / Dine-in step is built but switched off (SITE.orderModes is empty) because the packet does not confirm any of those options
form: skeleton comment says walk-in food trades drop the form; the CTA rules list a restaurant path and win on form conflicts, so the form stays. Flagged below
review quote prints word for word with no attribution line, since the author is not recorded
rating prints as 4.7 from 103 Google reviews; the 5.0 Facebook pool is not printed
service groups: Coffee & Espresso and Ice Cream match the sample price groups; Scones and Pup cups sit in a third group, Treats, which has no sample prices
hours print once, in the Visit table; form day and time choices are derived from SITE.hours in America/New_York
tested at 320, 390, 1280, 1600: no sideways scroll, no console errors from page code; both paths, every validation message, sandboxed iframe run
left unfinished: nothing in scope. External font and hit counter requests need a network connection

## Claude suggestions (intake, 2026-11-04 23:39 ET)
1. Please confirm whether the shop takes call-ahead or text orders. The form is built as "Build my order" per the CTA rules; if they're walk-up only, tell me to swap the section for the walk-in layout and I'll do it.
   Disposition: Not confirmed in the dossier either way. The "Build my order" path stands under the CTA rules (the same ruling as Drip z28), and the page still leads with Call. If the shop turns out walk-up only, swapping that section is a verdict-stage fix. Flagged for Brian in the batch report.
2. Please settle the standing rule for Food & Drink: the skeleton says walk-in trades get no form, the CTA rules give restaurants an order path. One line in the instructions would stop this coming up on every food build.
   Disposition: Settled: the CTA form document governs over the skeleton's stale walk-in comment (ruled at Drip z28, reaffirmed here). This ask has now recurred on two food builds, so it gets promoted into the master project instructions as a dated standing answer at the next master pass, and the skeleton wording gets reconciled then.
3. Please confirm which of takeout, curbside pickup, or dine-in the shop offers, so the pickup step can be switched on.
   Disposition: None of takeout, curbside, or dine-in is confirmed on record, so the pickup step stays switched off. Correct as built.
4. Please get the review author's name, or confirm the quote should keep printing with no name.
   Disposition: The author is not recorded in the dossier, so the quote prints with no name rather than an invented one. Correct as built.
5. Please tell me which of the six banked photos shows the storefront or the inside of the shop, so it can lead the ticket book instead of a close-up.
   Disposition: Photo-3 shows the shop's green door with its sign (the storefront), and photo-1 shows the inside (the Alice wall art). The ticket book now leads with photo-3, then photo-1, then the rest in dossier order. Done at ingest.
6. Please check which Facebook Page ID is the live one; the footer uses the recorded listing URL for now.
   Disposition: Only the recorded listing URL is on file (the m.facebook.com form). The footer keeps it as recorded; the pitch links the canonical facebook.com/curiositiescoffeeandicehouse address. No second Page ID exists in the dossier.
