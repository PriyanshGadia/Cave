# Deploy the /about portfolio

Use the standalone deploy directory as the project root for Vercel or Render. Its runtime contains the portfolio and text dossier. It excludes Cave, the vault, and local secret files.

## Scheduling backend

Deploy calendar-backend as a separate Cloudflare Worker with a D1 database bound as WORKSHOP_DB. Install the dependencies in calendar-backend, copy wrangler.example.toml to wrangler.toml, and set the ID of the new database. The worker creates its booking and quota tables on first use. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, CALENDAR_ID, and PORTFOLIO_BOOKING_HASH_KEY in the Worker secret store. Use a cryptographically random hash key of at least 32 characters. The owner refresh token needs offline authorization for Calendar availability and event creation. Use a dedicated booking calendar and keep the owner's OAuth credentials in the Worker. [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/) · [Google offline authorization](https://developers.google.com/identity/protocols/oauth2/web-server)

You can use a separate Google Web OAuth client for visitors by setting GOOGLE_BOOKING_CLIENT_ID on the Worker. Add each public site's HTTPS origin to the authorized JavaScript origins of that client. The public client ID identifies the application. The worker verifies the Google token signature, issuer, expiry, and audience. Google Calendar sends the invitation to the signed-in account. The app limits each Google account and browser identifier to eight 30-minute blocks per UTC day. Cancelling a meeting does not replenish the limit. The browser identifier can be reset by clearing browser storage, while the account quota remains. [Google sign-in setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) · [Google token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)

## Vercel and Render

- **Vercel** uses vercel.json and api/portfolio-calendar.js. Set PUBLIC_ORIGIN to your Vercel HTTPS origin and CALENDAR_ENDPOINT to the Worker's HTTPS /api/portfolio-calendar URL. Enable the project firewall's rate limits on that API route. [Vercel rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- **Render** uses a Node web service with start command node hosting/serve.mjs. Set the same variables using the Render HTTPS origin for PUBLIC_ORIGIN. A free web service can sleep after inactivity, so expect a slower first request after it wakes. [Render free service limits](https://render.com/docs/free)

Use the provider dashboard or CLI secret prompts for credentials. After both sites are deployed and authorized, verify one booking and cancellation with a designated test account and calendar.

## Cave LS3 Shared Backend Adapter

Cave's 3D workstation (LS3) interfaces with calendar services via two legacy routes:
- `GET /api/calendar/freebusy`: Returns `{ configured: boolean, busy: [{ start, end }], events: [{ id, summary, start, end, ... }] }`.
- `POST /api/calendar/request`: Accepts `{ name, email, location, description, startIso, endIso }` and returns `{ ok: true, id, event }`.

In contrast, `/about` interfaces with the dedicated Cloudflare Worker (`/api/portfolio-calendar`):
- `GET /api/portfolio-calendar?month=YYYY-MM&timezone=TZ`: Returns `{ status: "ready", slots: [...], busy: [...], bookingClientId }`.
- `POST /api/portfolio-calendar`: Requires `{ action: "book" | "cancel", start, end, note, consent: true }`, with Google Sign-In `Authorization: Bearer <ID_TOKEN>`, `Idempotency-Key`, and `X-Booking-Device` headers.

To connect Cave LS3 to the shared `portfolio-calendar` Cloudflare Worker without exposing owner credentials or modifying LS3's frontend contract:
1. **Server-Side Reverse Gateway**: In Cave's deployment backend or hosting functions, implement server-side route adapters for `/api/calendar/freebusy` and `/api/calendar/request` that forward internally to `https://portfolio-calendar.gadiapriyansh.workers.dev/api/portfolio-calendar`.
2. **Contract Translation**:
   - For `GET /api/calendar/freebusy`: The adapter queries the Worker's `GET /api/portfolio-calendar` for the active month, extracting `data.busy` and mapping it to `{ configured: data.status === 'ready', busy: data.busy, events: [] }`. This protects calendar event summaries and visitor privacy while providing LS3 with real-time busy intervals.
   - For `POST /api/calendar/request`: The adapter synthesizes an idempotency key and converts `{ startIso, endIso, name, email, location, description }` into the Worker's booking format. If visitor Google ID token validation is bypassed for LS3 terminal submissions, the adapter signs an internal server assertion or uses a privileged shared secret header (`X-Internal-Caller: ls3`) authorized in the Worker to book directly on the shared `Portfolio Bookings` calendar.
3. **Unified D1 Safeguards**:
   - All bookings—whether initiated from `/about` or LS3—pass through the same D1 `portfolio_calendar_slots` and `portfolio_booking_quota` triggers.
   - Prevents overlapping reservations across interfaces (`calendar_overlap` SQL trigger).
   - Enforces the universal quota of 8 half-hour blocks (4 hours) per day.
