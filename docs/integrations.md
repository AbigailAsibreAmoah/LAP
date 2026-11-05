# Integrations: current state and production checklist

Every external service sits behind an interface in `backend/src/integrations/<service>/types.ts`, with a mock adapter beside it. `backend/src/services/integrations.ts` is the only place adapters are chosen. Setting a provider to `live` in `backend/.env` currently **fails fast at startup** with a clear message, because no live adapter has been written yet. That is deliberate: nothing can silently pretend to be connected.

To go live with a service, implement the interface (e.g. `paystack/livePaystack.ts`), return it from the factory in that folder's `index.ts`, add tests, and fill in the variables in `backend/.env` (names in `backend/.env.example`). Services, controllers and the UI do not need to change.

## Paystack (Mobile Money + card)

- Interface: `PaymentGateway.initialize()` / `verify()`.
- Live adapter: call `POST https://api.paystack.co/transaction/initialize` (amount in pesewas, currency `GHS`, `reference`, `callback_url`, `channels: ["mobile_money", "card"]`). Redirect to `authorization_url`. Verify server-side with `GET /transaction/verify/:reference`, and add a **webhook** route that checks the `x-paystack-signature` HMAC before marking payments successful.
- Keep `PAYSTACK_SECRET_KEY` server-side only. Credits and plan changes must only be granted in `verifyPayment` (already the case).
- Receipts: send via the notification sender once email is live.

## Google Meet (Google Calendar API)

- Interface: `MeetingProvider.createMeeting()` / `cancelMeeting()` in `backend/src/integrations/google-meet/`.
- Live adapter: a Google Workspace service account with domain-wide delegation (scope `https://www.googleapis.com/auth/calendar.events`) acting as the organiser. Create a Calendar event with `conferenceData.createRequest` (`conferenceSolutionKey.type: "hangoutsMeet"`) and `conferenceDataVersion=1`; store the returned `hangoutLink` in `booking.meeting.joinUrl` and set `status: "created"`. Delete the event on cancellation.
- Environment: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY`, `GOOGLE_WORKSPACE_DOMAIN`, `GOOGLE_MEET_ORGANIZER_EMAIL`.
- The UI shows *Join on Google Meet* as disabled while `status` is `simulated`, so no fake links appear.
- Optional: sync tutor availability from Google Calendar free/busy.

## Google Calendar (tutor availability)

- Interface: `CalendarProvider.busy(tutorId, date)` in `backend/src/integrations/google-calendar/`; select with `CALENDAR_PROVIDER=live`.
- Bookable times = teaching hours set in the portal − portal bookings − busy blocks from the tutor's Google Calendar (`freebusy.query`). The portal stays the source of truth for bookings, credits and cancellation rules; Google Calendar only says when a tutor is unavailable and receives the lesson event (with its Meet link) once booked.
- Keep it fresh with `events.watch` push notifications and a short cache; always re-check free/busy inside the booking request before confirming, so two people cannot take the same slot.
- Demo mode simulates one busy block (Sophie, 28 Oct 12:00) so the UI shows a slot blocked by the tutor's calendar.

## Email and WhatsApp

- Interface: `NotificationSender.send()` with templates `booking-confirmed`, `booking-reminder`, `booking-cancelled` and `payment-receipt`.
- Email: any transactional provider (e.g. Postmark, SendGrid, Amazon SES).
- WhatsApp: WhatsApp Business Platform (Cloud API) or an approved BSP. Pre-approved message templates are required for reminders. Collect explicit learner opt-in.
- Reminders need a scheduler (e.g. a queue or cron) that runs before each booking.

## Speech / conversational AI

- Interface: `SpeechAnalyser.analyse({ scenarioId, audio })`.
- Requires adding recording in the Studio (ask for microphone permission **only** when the learner presses Record), uploading audio to the backend, and calling a speech-to-text plus pronunciation-assessment provider.
- Keep the *simulated* label until real analysis runs. Store consent and retention settings.

## Persistence and authentication

- Replace `backend/src/repositories/*` (backed by `demoStore.ts`) with database-backed repositories (e.g. PostgreSQL via Prisma or Drizzle). Services already depend only on repository functions.
- Replace `middleware/demoSession` with real authentication (sessions or JWT with an identity provider), and keep `requireRole` for authorisation.
- Remove or keep disabled the `/demo/*` routes (already off when `NODE_ENV=production`).
