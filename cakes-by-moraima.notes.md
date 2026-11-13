cakes-by-moraima·z26
2026-11-04 21:40 ET
first build
palette: analogous teal, cream, sage from the logo; deep teal #0f4256 holds the 60 (header, services, visit, footer), cream the 30, sage the 10 (ticker band, buttons on teal); espresso brown for display type on cream
type: Caveat (hand-lettered script, chalkboard feel) for display, Figtree for body, scale 1.25 through tokens
Your move (Texture): "The Chalk Menu Board", the price section is a wood-framed chalkboard with chalk lettering, doodled cupcake and coffee cup, squiggle underlines, chalk tray and stick
signature send animation: "Box It Up", a bakery box lid drops on, the ribbon ties itself and a bow pops; reduced motion shows the boxed result with a fade
photo book: order-ticket style per the food category rule (Ticket #01 to #10, no prices), one photo per page, Prev and Next, arrow keys and swipe
form: Get in touch plus Build my order (Order, When, Contact, Review); order choices are the 4 confirmed services only, because the ruling bars menu items as form choices, so the restaurant quantity step and Takeout/Curbside/Dine-in step were not built
price section prints the shop's published DoorDash prices as real, labeled as from the DoorDash menu; custom cakes and party trays say call for a quote
copy seed lines on ordering cakes by phone or Facebook message, and the Puerto Rican-leaning description, were cut as unconfirmed; menu item names stay on the price board only
ticker right-hand link reads Order, not Book, since appointments are not confirmed
pick groups (Cafe, Cakes and trays) cannot match the price groups exactly because the menu prices cover breakfast, sandwiches, bakery and coffee, not the 4 services
form time buttons start at the opening hour because they are derived from the hours, as the CTA spec asks
unfinished: at 320 px the calendar day cells are about 38 px wide, under the 44 px target; 390 px and up are fine
token images and the hero video show as missing until ingest, which is expected

## Claude suggestions (intake, 2026-11-04 21:25 ET)
1. Please confirm the DoorDash link: the packet's URL uses the en-AU locale; a US link (no locale or /en-US/) would suit a Lebanon, PA shop better.
   Disposition: Done at ingest: the DoorDash link now uses the plain US store URL (locale stripped) in the staged build.
2. Please confirm logo-reference.jpg will be hosted at that same relative path at ingest, or send the hosted path for SITE.logo.
   Disposition: Hosted beside the demo at ingest under the name cakes-by-moraima-logo.jpg (the dossier's banked logo-reference.jpg, renamed so demos never share a generic filename at the host root); SITE.logo in the staged build points at it.
3. Please send the shop's Google Maps place link for reviews; the build uses a Google search link for "read the reviews" until then.
   Disposition: No Google Maps place link is on file in the dossier. The build's Google search link for reviews stands, same treatment as other demos without a place link.
4. Please confirm whether custom cakes and party trays are ordered by phone or Facebook message, so the copy can say how ordering works.
   Disposition: Confirmed from the packet: the shop's own description says custom cakes and party trays are ordered through the shop directly, by phone or Facebook message. The cut line stays out of this build; the call button and the custom order form cover both paths on the page. Flagged to Brian in the batch report; restoring the line is a one-line copy update if he wants it.
5. Please rule on the customer model (takeout, pickup, dine-in) and on whether published menu items may be form choices, so the restaurant Order step can be built if you want it.
   Disposition: Ruled by Brian's standing restaurant rule: walk-in restaurants do not get an order form with quantities; the conversion is the call, and custom orders (cakes, trays) get the inquiry form, which is what the build does. The customer model (takeout, pickup, dine-in) is unconfirmed in the record, so the page claims none of them. No Order quantity step unless Brian rules otherwise; flagged to him in the batch report.
