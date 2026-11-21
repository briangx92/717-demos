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
