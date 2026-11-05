# API reference (demo)

Base URL: `http://localhost:4000/api`. JSON in and out.

**Demo session:** the `x-demo-user` header picks the acting user (`lrn-ama` by default, `tut-*` for instructors, `adm-*` for admins). This is a prototype convenience, **not authentication**.

Errors share one shape:

```json
{ "error": { "code": "slot_taken", "message": "This time has just been booked. Please choose another.", "details": {} } }
```

| Status | Typical codes |
|---|---|
| 400 | `validation_failed` (zod details included) |
| 402 | `insufficient_credits` (payment must precede paid bookings) |
| 403 | `forbidden` (wrong role) |
| 404 | `not_found` |
| 409 | `slot_taken`, `not_cancellable`, `not_reschedulable` |
| 422 | `slot_unavailable`, `quote_required` |

## Endpoints

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/health` | any | Mode, persistence and provider modes |
| GET | `/demo/snapshot` | any | Full demo state used to hydrate the UI. **Disabled when `NODE_ENV=production`** |
| POST | `/demo/reset` | any | Restores the seed. **Disabled in production** |
| GET | `/course-areas`, `/courses`, `/courses/:id`, `/lessons/:id`, `/pathways`, `/tutors`, `/memberships` | any | Catalogue |
| GET | `/me`, `/me/milestones`, `/me/vocabulary`, `/me/payments` | learner | |
| POST | `/me/vocabulary` | learner | `{ fr, en, example?, source? }`. Idempotent on `fr` |
| POST | `/me/vocabulary/:id/toggle` | learner | Toggle mastered |
| GET | `/tutors/:tutorId/availability?date=YYYY-MM-DD` | any | Slots with `available` flags |
| GET | `/bookings` | any | Learner's or instructor's bookings |
| POST | `/bookings` | learner | `{ tutorId, start: "2026-10-27T12:00:00Z", topic }`. Spends 1 credit; meeting is `simulated` |
| POST | `/bookings/:id/cancel` | learner | Returns the credit (demo rule; final policy TBC) |
| POST | `/bookings/:id/reschedule` | learner | `{ start }` |
| POST | `/payments/initialize` | learner | `{ planId, method: "mobile-money" \| "card", provider, simulateFailure? }`. Returns a `pending` payment |
| POST | `/payments/:reference/verify` | any | Server-side verification; grants plan and credits only on `success`. Idempotent |
| GET | `/speaking/scenarios` | any | |
| POST | `/speaking/scenarios/:id/sample-feedback` | any | Sample transcript and feedback, `simulated: true` |
| GET | `/notifications`, POST `/notifications/:id/read` | any | |
| GET | `/threads`, POST `/threads/:id/messages` | participant | `{ body }` |
| GET | `/admin/overview` | admin | Metrics + learners, bookings, payments |

All times are UTC, which matches Ghana local time (GMT).
