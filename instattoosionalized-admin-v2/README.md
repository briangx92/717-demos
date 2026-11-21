# Instattoosionalized owner portal, v2 (demo)

A redesign of the shop's owner portal, built to be used day to day rather than to show settings.
This folder is a **demo**. It runs in the browser with sample data and changes nothing on the real site.

Live demo: https://briangx92.github.io/717-demos/instattoosionalized-admin-v2/
The earlier demo portal (`../instattoosionalized-admin/`) is untouched.

## What each screen is for

| Address | Job |
|---|---|
| `#/today` | What needs you now (unanswered requests, unpaid deposits, reminders, healed-tattoo check-ins, waitlist) plus each chair's day |
| `#/requests`, `#/requests/:id` | Pipeline from inquiry to booked. Each stage shows its one next step |
| `#/calendar`, `#/calendar/YYYY-MM-DD` | Week and per-chair day view, double-booking check, time off |
| `#/clients`, `#/clients/:id` | Contact, consent and ID checkboxes, visit history |
| `#/artists`, `#/artists/:slug/profile`, `.../portfolio` | Bio, books open or closed, photo upload, order, captions, before and after |
| `#/site/hours|banner|prices|services|policies|reviews|publish` | Public-site content, edited as a draft and published in one batch |
| `#/settings/messages|people|data` | Text templates, roles, backup and restore |

Roles ("Preview as"): owner sees everything; front desk has no Site or Settings; an artist sees only their own chair, clients and portfolio.

## How it behaves

- Edits to the public site go to a **draft**. Nothing is live until Publish. The Publish screen lists every change in plain words and blocks on problems (shown photo with no caption, closing before opening, sample prices still in place).
- The portal never texts or emails. "Open in messages" fills the phone's messaging app. The history says the text was *opened*, because the portal cannot see whether it was sent.
- Every failure says what happened and what to do. If the browser refuses to save, a red bar says so.
- Data lives in `localStorage` (`oa2:state:v1`); uploaded photos live in IndexedDB (`oa2-images`), shrunk to 1600px JPEG. The old portal's `oa-state-v3` key is not touched.

## Not built yet (needs a backend)

All writes go through `OA.act.*` and `OA.store.commit()`. Replacing those with calls to a service is the only change the screens need.

Suggested shape: Cloudflare Worker + D1 (data) + R2 (photos) behind Cloudflare Access one-time-PIN.
Existing endpoints this maps onto: `GET/POST /requests`, `GET/POST /bookings` with statuses New, Contacted, Consultation Scheduled, Awaiting Deposit, Booked, Closed.
New endpoints needed: `/appointments`, `/clients`, `/timeoff`, `/site` (draft + publish), `/photos` (signed uploads), `/people`.
Publish should write one JSON snapshot the public site reads at build time, so many edits trigger one rebuild.
Also needed for real use: server-side validation of every field, an audit log of who changed what, and the website request form writing into `/requests`.

## Google Calendar (placeholder)

`js/gcal.js` and Settings, Google Calendar hold the placeholder. Nothing connects to Google, and the Connect button fails with a plain message.
What exists: a per-chair calendar ID field (saved, unused), a choice of how much goes in each event, and `OA.gcal.toEvent(appt)`, which builds the Google event resource (time zone America/New_York, shop address as location, the portal appointment ID in `extendedProperties.private.portalApptId`).
What a real version needs: OAuth on the server with the `calendar.events` scope and tokens stored server-side only; one-way push on create, change and cancel using the stored event ID so retries update instead of duplicating; a visible "not on Google Calendar" flag on any appointment whose push failed; no phone numbers, notes or deposit status in events. Reading Google back into the portal (to block double-booking against personal calendars) is a second step.

Wiring already in place so the real version is a small change: `OA.gcal.onChange(appt)` runs on every add, change, cancel and status change (a no-op while disconnected); an appointment whose push fails carries `sync: {state:'failed', error}`, which shows a red "Not on Google Calendar" chip, a Retry button in the appointment dialog, and an item in Today's "Needs you" list; the shop time zone is a setting (default America/New_York). Backups and restores carry the calendar IDs and time zone along with the rest of the settings.

## Website requests and analytics (new)

- **Check for new requests** (Requests screen) pulls what the website form saved on the shop server. Every request keeps the server's id, so pulling twice, or after a failed pull, never makes a copy. The portal also checks every 90 seconds while open. A failed check shows a red chip on the Requests screen, not just a toast.
- **Settings, Website connection:** paste the access token. It lives in this tab only (session storage), is never written to the computer or shown on the page, and is forgotten when the tab closes.
- **Analytics** (owner only): page views, top pages, referrers, devices, countries, Core Web Vitals (loading, response to taps, layout jumping, rated with Google's thresholds), Cloudflare caching, requests from the form and requests per 100 views, and spam stopped.
  Cloudflare numbers come through the shop server (see `../instattoosionalized-api/README.md`). With no server set, the screen says so; "Show sample numbers" draws made-up numbers under a banner, for judging the layout only.
- The portal address of the server is the `portal-api` meta tag in `index.html` and must also be added to `connect-src` in the Content-Security-Policy tag. Scripts are locked to this folder.

## Phone numbers and when a client wants to come in (new)

- Every phone box (Add a request, request details, client, appointment, shop phone) uses one input: digits only, formats as you type, stops at ten digits, cleans a pasted `+1 (610) 555-0100`, and lets you delete over the dashes. Area codes cannot start with 0 or 1. Saving needs ten digits. A number saved earlier that you did not touch is not blocked.
- "Best days or times" is data, not a sentence: Flexible, Certain days (Mon to Sun chips), or A specific date and time, plus a time of day or a length. The sentence in lists is built from the data.
- A specific slot is checked against the calendar as you pick it. It is blocked, with the reason and nearby free times, if the date or time has passed, the shop is closed or outside its hours, or the artist is busy (booked or time off). With "No preference" it is blocked only when every chair for that kind of work is busy. Another request for the same slot is a warning, not a block.
- New appointments also refuse a date in the past, and a client who is already booked with another chair at the same time.
- Google Calendar format: exact slots and wishes become `freebusy.query` windows (`timeMin`/`timeMax` as RFC 3339 with the shop zone's offset, DST-correct). Open "How this goes to Google Calendar" under the field to see the exact body. Nothing is sent until the Google connection exists.

## Scan to call or text (new)

On a computer, the portal can't dial or text. So the text dialog and the client page show a QR code. The person scans it with a phone camera and finishes there.

- **Text dialog:** "Scan to text from your phone". Messages opens with the number and the typed message filled in. You press send.
- **Client page:** the "Scan to call or text" button shows two codes, one to call and one to text. It only appears when the client has a valid phone number.
- **When no code can be made:** a blank left in the message, an empty message, a message too long for a code, or no valid number. The panel says why instead of showing a bad code.
- **Nothing is sent from the portal.** The phone does the sending.
- The code is drawn with DOM calls only, no HTML strings. The generator is `js/vendor/qrcode.js` (qrcode-generator 2.0.4, MIT).
- Tested by decoding the rendered codes and checking the number and the message come back exactly. Not yet tested on a real phone.

## Announcements and the public content format (new)

**Site, Announcements** holds short notices for the top of the home page: a closure, a guest artist, a flash day.

- Each has a kind (News, Closure, Special), a title (80 characters), a message (400, plain text), an optional https link, a start date, an optional end date, and a pin.
- The website shows the ones that are active today, up to 3, pinned first and then newest start. They sit above the hero image so a closure is not missed.
- Dates are judged in the shop's time zone (America/New_York), not UTC. A banner that ends Friday stays up until Friday midnight, shop time.
- A blank title, an end before the start, a link that is not https, or more than 20 announcements blocks publishing, with the reason on the Publish tab.

**One content format.** Publishing builds `{ v: 1, at, banner, announcements }` (`js/content.js`, `OA.publicContent`). The website reads that and nothing else. The real site will be served the same shape by the API, so only the source changes.

- **Demo:** the published copy is the key `oa2:published:v1` in this browser. The public demo page reads it. It is written, read back and compared before the portal says "Published". If the write fails, nothing is published and the history is not touched.
- **Public page:** checks everything again (version, lengths, kinds, dates, https links) and draws text only. An invalid item is skipped and named in the browser console. Unreadable or unknown-version content is ignored, also with a console message.
- **Only the banner and announcements reach the public demo page so far.** Hours, prices, services, artists and photos join as they get a real publish path.
- **Fixed:** the portal banner dates were saved as start/end but the old public code read from/to, and compared against the UTC date. The old v1 portal still uses its own key; the new content takes over whenever it exists.
- **Reset demo data** removes the published copy.

## Open times in the booking dialog (new)

The booking dialog (Set up a consultation, Book the session, New appointment, and changing an appointment) now lists the free start times, so nobody has to guess and leave for the calendar.

- **What it shows:** the next two weeks of open days for the chosen artist, with each free start time as a button. Only starts where the whole appointment fits are listed. Shop hours, closed days, time off, bookings, and times already past today are all respected.
- **Length:** from the kind of appointment, or from the Ends field if you set it by hand. Changing the kind, the artist or the length redraws the list.
- **Client's picks:** if the request asked for certain days or a time of day, matching times are marked and the first few appear at the top as "{first name} asked for weekends, afternoons". If nothing open matches, it says so and shows everything.
- **A specific time asked for:** the dialog opens on that date and time.
- **One tap** fills the date, start and end. The typed fields stay below for odd cases, and the clash warning still runs as a backstop.
- **First five days show; "Show more days"** adds five at a time.
- **Limit:** it only knows what is in the portal's calendar. Anything the artist books only in their own Google Calendar is not seen as busy.
