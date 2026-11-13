drip-coffeehouse-kitchen·z28
2026-11-04 9:52 PM ET
first build
Palette: analogous warm brick (60), cream (30), coffee brown (10); a faint running-bond mortar pattern on the brick sections.
Type: Fraunces (soft serif) for display, Figtree (friendly sans) for body, 1.25 scale held in tokens.
Signature send animation: coffee pours into a cup, the cup fills, steam rises. Reduced motion shows the full cup fading in.
Your move, "Slow Pour": a section between Services and Prices with double breathing room, drips falling from a dripper into a cup on a slow 3.6s rhythm, steam drifting, and three short lines that arrive one at a time. Static under reduced motion.
Form: kept the restaurant "Build my order" path from muse-cta-form.md (it wins on forms) even though the skeleton comment says walk-in trades drop the form.
Form branches by family: Order (menu items with quantity buttons) and Event space (toggle). Menu only adds the How step; event space only adds the Event step; both adds both.
How step offers Takeout and Dine-in only. Curbside pickup is left out because nothing confirms it.
Cut from copy seeds (not in the fact sections): September 2023 opening, historic brick building, room for about 100 people. Muffins and cookies appear only inside the verbatim review.
Ticker right-side static reads "Order" instead of "Book": no booking on record.
Jump pair hides while the form is on screen (skeleton behavior), so it never sits over the form buttons.
Calendar runs 60 days out in America/New_York time; today drops off once no half-hour slot is left.
Recent work book loads PageFlip from jsDelivr on first open; without it the book still works one photo at a time.
Unfinished: real photos and hero video arrive at ingest through the [PHOTO:work1] to [PHOTO:work6] and [VIDEO:hero] tokens.

## Claude suggestions (intake, 2026-11-04 22:14 ET)
1. Please confirm which of takeout, curbside pickup, and dine-in Drip actually offers; the How step only shows Takeout and Dine-in until then.
   Disposition: Kept as built. The dossier confirms neither curbside nor a fuller set; takeout and dine-in stand, curbside stays out until the shop confirms it.
2. Please decide whether restaurants keep the order form: the skeleton says walk-in trades drop it, muse-cta-form.md gives restaurants a "Build my order" path. I followed the form doc.
   Disposition: Form doc governs: muse-cta-form.md's restaurant "Build my order" path stands, and the page still leads with Call. The skeleton's walk-in comment is stale next to the form doc; Jenson to reconcile the skeleton wording at the next master pass.
3. Please check that (814) 715-7863 can receive texts; if it is a landline, the "Text it to the shop" button should change to call and copy only.
   Disposition: Not verifiable from here without calling the shop, and the form also carries call and copy paths. Left as built; flagged for Brian in the 2026-11-04 batch report in case he wants text buttons dropped where a number is unverified.
4. Can the dossier confirm the event space details (about 100 guests), the September 2023 opening, and the historic brick building? They would make the page much more specific.
   Disposition: Cannot confirm. Event capacity (about 100), the September 2023 opening, and the historic brick building are not in the dossier's fact sections, so they stay out. Correctly cut.
5. Can you confirm homemade muffins and cookies as menu items? Right now they only show inside Matthew S.'s review.
   Disposition: Stays review-only. Muffins and cookies are not confirmed menu items and were not added to the menu.
6. Please OK loading PageFlip from cdn.jsdelivr.net for the photo book, or send a hosted copy to point at.
   Disposition: Shipped as built for this verdict round: PageFlip loads lazily from jsDelivr only on first book open, and the book works one photo at a time without it. Flagged for Brian in the batch report as a fleet-rule call (single-file rule vs. the nicer book).
