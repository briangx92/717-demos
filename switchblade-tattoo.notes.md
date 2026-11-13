switchblade-tattoo·z25

# Switchblade Tattoo: build notes

## My move (Typography): "The Franklin Street Window"
The hero `<h1>` is painted like shop-window sign lettering: "Switchblade" in a one-stroke brush script (Yellowtail), cream fill with a stepped red block shadow, a slight upward tilt, and an SVG turbulence filter (`#brush-edge`) that roughens the edges like enamel on glass. Under it, a tapered red brush swash with a cream highlight stroke, then "TATTOO" on a notched cream ribbon banner in Rye. Every other heading stays plain Rye; body and labels are Archivo. Lives in `.sign` (hero module only).

## Rulings applied
- **Artist names cut.** Kenny, Andy and Sarah appear only in the copy seeds, and the rulings cut any name the fact sections don't confirm.
- **Hours** print only in the Visit table, with Monday and Sunday shown as "Not published". There's no open/closed status anywhere. Request-form time buttons run 11:30 AM to 7:30 PM so no opening or closing time prints outside the table.
- **No walk-in or appointment claims.** The form says "Preferred" and "A preference only. The shop confirms by phone."
- **Services** in copy and form choices are only Custom tattooing and Body piercing. "Shop minimum" and "Small custom tattoo" appear only on the price shelf, under a "Sample prices" stamp with a "not a quote" line.
- **Rating** shows 4.6 from 99 Google reviews with a "Read reviews on Google" button (a Google search link for the shop). No quotes.
- **Message band** links to https://m.me/717digitalstudio, per this packet's ruling.
- **Head** has the case tag, meta description, and og:title, og:description, og:type.

## Calls I made
- **Photo book:** tattoos aren't on the 10-concept sheet, so I used a **flash sheet**: a cream gridded sheet with two red pins, "Flash No. 01" through 08, and "Sheet N of 8". One photo per page, Prev/Next, swipe, arrow keys, steady size, no flip or zoom.
- **Request form:** two paths (Just call me back / Build my request). The build path has tiles grouped under Tattoos and Piercing, synced with the service cards' Add buttons. The when step offers Flexible (default) plus a calendar (Tue to Sat only, 60 days out, today only if a slot remains), then time of day, then exact times. It ends in Text it (sms to +1 814 827 7202), Call instead, and Copy.
- **Hit counter:** footer element `[data-hit-counter]` carries `data-counter-key="717digitalstudio-demos/switchblade-tattoo"`, ready for wiring.

## Tokens
- `[VIDEO:hero]` in `SITE.hero.video`, with a textured fallback until swapped.
- `[PHOTO:work1]` to `[PHOTO:work8]` in `SITE.gallery`.

## To check
- **Packet encoding:** the tag arrived as `switchblade-tattooÂ·z25` and the hours as `11:00 AM â€“ 8:00 PM`. Both are mis-decoded UTF-8, so I used the real middle dot (`·`) and en dash (`–`).
- **Text it:** if (814) 827-7202 is a landline, "Text it" won't arrive. Call and Copy still work.
- **Fonts:** my test machine couldn't load Google Fonts, so I checked the sign lettering with fallback fonts only. Look at the hero in your local view before approving.

## Tested
320 / 390 / 1280 / 1600 px with no sideways scroll and no script errors. Checked the build and quick flows, validation, message text, sms link, and book paging. No em dashes and no HTML comments.

---

## SUGGESTIONS intake (Jenson, ingest 2026-11-04)

The builder returned no SUGGESTIONS block: this return arrived as a separate build-notes MD (the first KVM-relayed return), so the extractor refused it (exit 2, NOTES block missing) and the notes were filed here verbatim under the separate-notes clause. The builder's three "To check" flags are filed below as the intake, with dispositions.

1. Packet encoding garbled in transit (case tag and hours).
   Disposition: DONE. The builder used the real middle dot and en dash; verified in the returned file: the head meta reads switchblade-tattoo·z25 exactly. Root cause was Jenson's first clipboard staging (missing -Encoding UTF8); the staging script is fixed, so later packets go out clean.
2. "Text it" may not arrive if (814) 827-7202 is a landline.
   Disposition: PASS. The number is the shop's published line and the only number on record; the form also offers Call instead and Copy, so no visitor is stranded. Nothing better exists to wire.
3. Google Fonts untested on the builder's machine; check the hero lettering locally before approving.
   Disposition: DONE at ingest. The page was rendered locally at desktop and phone widths during the ingest gates and the sign lettering checked in the renders.
