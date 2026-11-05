# La Porte French Institute — Digital Academy Prototype

> **Learn French for real life. Build confidence. Open new doors.**

An interactive, demonstrable prototype of La Porte's online French institute: public website, learner workspace, instructor workspace and administration, with four signature experiences. It runs fully on deterministic demo data. **No real payments, meetings, messages or AI analysis happen.**

---

## Quick start

Requirements: Node.js 20+ (tested on 22) and npm 10+.

```bash
npm install          # installs all workspaces (shared, frontend, backend)
npm run dev          # runs the API (http://localhost:4000/api) and web app (http://localhost:5173)
```

Open http://localhost:5173. Choose **Start your French journey** or **Log in** (simulated), or use the role buttons at the bottom of the home page.

| Command | What it does |
|---|---|
| `npm run dev` | Backend + frontend together (via `concurrently`) |
| `npm run dev:frontend` | Frontend only. Falls back to the built-in offline demo adapter |
| `npm run dev:backend` | Backend only |
| `npm test` | Backend API tests (Vitest + Supertest) |
| `npm run typecheck` | Type-checks `shared`, `backend` and `frontend` |
| `npm run build` | Production build of the frontend (`frontend/dist`) |

### Data modes

The frontend talks to the backend through `frontend/src/services/api.ts`:

- **API connected** (default when the backend runs): actions go to the Express API. State lives **in memory** and resets when the backend restarts.
- **Offline demo adapter**: if the API is unreachable, or `VITE_DATA_MODE=demo`, the same business rules run in the browser (`services/demo/demoAdapter.ts`). State is kept in this browser's `localStorage` only.

The sidebar footer shows the current mode. **Reset demo data** restores the seed in both modes.

---

## Project structure

```text
├── shared/                 Types, demo seed, and pure business rules (content workflow, permissions, booking policy, chat safety, placement, rewards) used by both apps
├── frontend/               Vite + React 18 + TypeScript
│   └── src/
│       ├── components/     ui/ (controls, overlays, icons), layout/, animations/ (motion tokens),
│       │                   3d/ (illustrated characters, portal, depth cards, rings, tokens), charts/
│       ├── features/       showcase/ (Living Academy hero, Transforming Workspace),
│       │                   speaking-studio/, performance-passport/, courses/, bookings/
│       ├── pages/          public/, learner/, instructor/, admin/, shared/
│       ├── layouts/        PublicLayout, AppLayout (role-aware workspace shell)
│       ├── services/       http.ts, api.ts (API or demo adapter), demo/demoAdapter.ts
│       ├── state/          AppStore (demo session state, role, actions)
│       ├── i18n/           English/French dictionary + provider
│       ├── hooks/ utils/ styles/
├── backend/                Express + TypeScript (run with tsx)
│   ├── src/
│   │   ├── config/         env parsing, provider modes
│   │   ├── routes/         route table
│   │   ├── controllers/    HTTP ↔ service mapping
│   │   ├── services/       booking/credit rules, payments, speaking, messaging, notifications
│   │   ├── repositories/   in-memory demo store (swap for a database later)
│   │   ├── validators/     zod request schemas
│   │   ├── middleware/     demo session, role guard, validation, errors
│   │   └── integrations/   paystack/, google-meet/, notifications/, speech-ai/ (interface + mock)
│   └── tests/
└── docs/                   api.md, integrations.md
```

The frontend never imports backend code, and the backend holds all integration boundaries and credentials. `shared/` holds types, seed data and pure rule functions (no I/O), so the API and the offline adapter apply identical rules.

---

## Signature experiences

1. **The Living Academy** (home hero, about 4s). A real-time 3D doorway (Three.js via React Three Fiber, built procedurally in `components/3d/DoorwayScene.tsx`, with no external models) opens its lacquered burgundy leaves. Warm light is shadow-mapped through the arch, so the pool on the floor widens as the doors open. A glimpse of the learner workspace then settles in front. The CTA works from the first frame, and Skip/Replay are always offered. The scene is lazy-loaded and renders on demand only while something moves; pointer parallax is mouse-only. Reduced-motion users get the door at rest, open. Without WebGL, the illustrated SVG door is shown instead.
2. **The Transforming Workspace** (home). Learner and tutor cards glide in, then Ama's card expands into her workspace. Next comes a weekly timetable whose rows populate and move through Upcoming → In progress → Completed. Tutor feedback slides in, the progress chart draws, and the same lesson rows morph into skill chips in a CEFR progress view before looping. It is built from real components, starts when scrolled into view, and has play/pause, a step selector and live captions.
3. **French Speaking Studio** (`/app/studio`, also on home). It offers four scenarios and a word-by-word prompt reveal. The waveform plays the prompt or model answer with the browser's own French voice, only on click. The model response reveals progressively with expressions highlighted. Feedback bars and notes follow, plus retry, add-to-phrasebook and next-scenario actions. Feedback is labelled sample data, and no microphone permission is ever requested.
4. **French Performance Passport** (`/app/passport`, also on home). A gold path draws along a journey of milestone tokens that light up in sequence. Each milestone opens a drawer with can-do statements, skills, exercises and evidence. *Submit demo evidence* completes the in-progress milestone with a restrained gold celebration, and a full progress report opens in a modal.

## Workflows you can try

- **Booking**: `/app/book`. Pick a tutor, date (calendar), time and topic, then confirm. One credit is spent, the slot becomes unavailable, a simulated notification is recorded, and the lesson appears in `/app/lessons`, where you can **reschedule** or **cancel** it (cancelling returns the credit).
- **Payment before booking**: with 0 credits, booking is blocked and links to membership.
- **Checkout**: `/app/billing` → *Change membership* → choose a plan, then Mobile Money (MTN / Telecel / AT) or card → simulated processing → verification. Credits are granted only after verification succeeds. Tick *Simulate a failed payment* to see the failure path.
- **Lessons**: `/app/learn/les-b5`. Dialogue (with English toggle), key phrases → vocabulary, quiz with explanations, and a written assignment that appears in the instructor's review queue.
- **Vocabulary**: list, search, mastered toggle, add phrase, 3D flip flashcards.
- **Messaging**: portal threads with tutors and support, with a no-contact-details notice.
- **Instructor** (`/instructor`): upcoming lessons, assignment review, weekly availability grid (booked slots locked), learner profiles with notes and follow-up activities.
- **Admin** (`/admin`): KPIs and charts plus learners (filter, search, detail drawer), instructors, courses, bookings, payments, content, support and reports.
- **Language**: EN/FR switch in every header. French learning material stays in French.
- **Roles**: *Demo role* selector in the workspace top bar. This is **not** authentication.

---

## What is real, simulated, or future

| Area | Status in this prototype |
|---|---|
| UI, navigation, animation, i18n, responsive layouts | **Functional** |
| Booking, credit, reschedule and cancel rules; payment-before-booking | **Functional** against the in-memory API or the offline adapter |
| Persistence | **Demo only**: backend memory (resets on restart) or browser `localStorage`. The **content library** (lessons, media records, immersion packs, assignments, progress, placements, rewards) is saved to `backend/data/content.json` and survives restarts; uploads go to `backend/data/uploads/` (`CONTENT_STORE`, `UPLOAD_DIR`). Serverless hosts need a database and object storage instead |
| Content library | **Functional**: admins and authorised instructors create lessons from activity blocks (opening video, notes, dialogue, phrases, listening with accent tags, pronunciation, quiz, typed-only assignment, role play), upload media, and move lessons draft → review → published → archived. Learners see published lessons only; the rest show *Coming soon* |
| Opening video rule | **Enforced**: every lesson opens with a ~5-minute video (4:00–6:00). MP4/MOV duration is measured on the server; other formats use the browser-measured length |
| Recordings and videos | **Placeholders**: planned assets have no file yet; audio falls back to a labelled computer voice reading the transcript |
| Immersion toolkit, placement test, weekly goals | **Functional** against the API or offline adapter. Placement can be skipped (starts at A1) |
| Booking policy | **Enforced**: free cancel/reschedule ≥ 24 h; inside 24 h the credit is used unless an admin approves an emergency; 10-minute join grace shown; times shown in the learner’s time zone |
| Sessions | **Functional**: learners choose French-only conversation, course questions or a catch-up. The first one-on-one conversation is free; others use a credit. Catch-ups are only for a group class the learner missed (classes are not recorded) |
| Groups | **Functional**: cohorts of 5 learners maximum with one instructor, scheduled Google Meet sessions, attendance, and group assignments (the instructor sees every answer; learners see their own) |
| Community | **Functional**: follow classmates, message classmates you follow or share a group with (contact-detail filter applies), leaderboard from the reward ledger with an opt-out |
| Rewards | **Functional**: weekly quests earn points; Silver/Gold/Platinum unlock a renewal discount or a free session credit, applied at checkout or redeemed. Demo classmates have a seeded points history |
| Phrase of the day | Phrase of the day on the dashboard |
| Sign-up and level access | **Functional**: "Start your French journey" → sign-up → a separate start screen: take the entry assessment or skip to A1. The test (scored on the server, A1–C2) sets the level; learners see **only their level's content** (nothing below or above) until they buy the next level through the verified checkout (demo GH₵ 450, one level at a time; bought levels stay open). The API refuses locked lessons. Test questions are copy-protected (no selection/copy/print, hidden when the window loses focus, watermarked); browsers cannot block OS screenshots. A completed test can be retaken after 30 days |
| Le Café La Porte | **Functional**: members-only community with three tabs (Feed, Spaces, Study groups). Nine La Porte spaces, text posts and questions, clickable links with site cards, one-level comments, emoji picker and shortcuts, reactions (six quick + any emoji), saved posts, tutor weekly challenges and verified answers, French-writing quest, study groups of up to 8 with peer sessions, reports to the admin queue, tutor/admin pin/hide/lock. Contact details and messaging-app links are blocked |
| Kids picture books | 32 original French picture books, eight per age group (4–5, 6–7, 8–10, 11–15), each group deeper than the last. A child only sees books for the age on their profile: four books of the week (a new set every Monday, or the four a parent picks) and a private library of saved books. Illustrated vector scenes, 3D covers, open-book spreads with real page turns, word-by-word read-aloud, questions and glossary for older readers |
| Daily review and speech scoring | **Functional**: spaced-repetition review of the phrasebook (Leitner boxes, daily deck and streak); pronunciation and Speaking Studio answers scored from the browser's French speech recognition (word-by-word, phrases used, length, pace) |
| La Porte Kids | **Functional**: parent-managed child profiles (up to 5), daily time limit, per-game switches, PIN to leave child mode. Six learning worlds (A1) with a "Découvre les mots" audio word list and five original mini-games (*Le Grand Quiz*, Memory, Word builder, Listen & pick, *Dis-le !* speech recognition with a fallback), stars, badges and unlocking. Tutor-hosted **live class quizzes** (6-digit code, safe nicknames, speed points, podium; in-memory on the API, simulated players offline). Outside games (Kahoot!, Quizlet, Wordwall, Blooket) are **links** a tutor attaches, shown only if a parent allows them and opened with the PIN. Not built: real-time sockets, PIN hashing, children's live lessons |
| Chat safety | **Enforced** on client and server: messages with phone numbers, emails, handles or outside links are refused |
| Typed-only answers | **Enforced in the browser** (paste and drop blocked). It discourages pasting; it cannot prove who typed |
| Authentication | **Simulated**: forms just enter the demo; role selection trusts an `x-demo-user` header |
| Paystack / Mobile Money / card | **Simulated** via `integrations/paystack/mockPaystack.ts`. No money moves |
| Google Meet meetings | **Simulated**: meetings are stored with `status: "simulated"` and `joinUrl: null`. No fake links are shown |
| Email / WhatsApp reminders | **Simulated**: the mock sender logs messages with `delivered: false`. The UI marks them *Simulated* |
| Speech recognition / AI feedback | **Simulated**: labelled sample responses and feedback. Browser text-to-speech is used only for playback |
| Prices (GH₵) | **Illustrative only**, marked on every pricing surface. Not client-approved |
| Tutor names, ratings, bios; learner profiles; institute metrics | **Fictional demo content** |
| Certificates | Not issued. The Passport states it is not an official certificate or CEFR exam |

See `docs/integrations.md` for what each production integration needs, and `docs/api.md` for the endpoints.

## Dependencies added and why

| Package | Where | Why |
|---|---|---|
| `react`, `react-dom`, `react-router-dom` | frontend | UI and routing |
| `motion` | frontend | All animation: shared-layout transitions, staggered reveals, springs, path drawing, reduced-motion support via `MotionConfig` |
| `vite`, `@vitejs/plugin-react`, `typescript` | frontend | Build tooling |
| `express`, `cors`, `helmet` | backend | HTTP API, CORS for the web app, security headers |
| `zod` | backend | Request validation |
| `tsx` | backend | Runs TypeScript directly in dev and demo |
| `vitest`, `supertest` | backend | API tests |
| `concurrently` | root | One command for both apps |
| `three`, `@react-three/fiber`, `@react-three/drei` | frontend | The homepage's 3D doorway. Lazy-loaded in its own chunk; drei supplies `Environment`/`Lightformer` for procedural reflections, so no HDR files are downloaded. `@types/three` is pinned via root `overrides` to match the runtime version |

Three.js is used **only** for the homepage doorway. Everywhere else, depth (tokens, rings, flip cards) comes from CSS perspective, SVG gradients and Motion, which keeps the workspaces light. GSAP, Rive and Lottie were not added. Charts are lightweight in-house SVG components.

## Accessibility and performance notes

- `prefers-reduced-motion` is honoured: the hero and showcase rest on their final composition, and loops and decorative motion are disabled. The showcase can still be stepped through manually.
- There are skip links, visible gold focus rings, labelled controls, `aria-live` captions and chart summaries in `aria-label`.
- Dialogs trap Tab focus, close on Escape, return focus to their trigger and are labelled by their heading. Tabs follow the WAI-ARIA pattern (one tab stop, arrow keys/Home/End). The mobile menu closes on Escape.
- On every route change, focus moves to the main region and `document.title` is set from the page's `h1` (`hooks/useRouteFocus.ts`), so screen readers announce the new page.
- Headings run `h1` → `h2` → `h3` without skips; `.h3`/`.h4` classes keep the visual size independent of the level.
- Checked with axe-core (WCAG 2.1 AA + best practice) across 27 routes with zero violations, and with a scripted keyboard-only pass. A manual screen-reader session (NVDA/VoiceOver) has not been done.
- No autoplaying audio, and no permission prompts.
- Workspaces are code-split, so the public site loads only what it needs.

## Deploying to Vercel (services)

`vercel.json` deploys the repo as one Vercel project with two services:

| Service | Root | Public path | How it is built |
|---|---|---|---|
| `frontend` | `frontend/` | `/(.*)` (catch-all, last) | `npm run build` → static `dist/`. A service-level rewrite serves `index.html` for client-side routes such as `/app/passport` |
| `backend` | `backend/` | `/api/(.*)` | `npm run build` bundles `src/index.ts` (and `shared/`) with esbuild into `dist/index.js`, the function entrypoint |

- Vercel passes the **original path** to each service (`/api/health` arrives as `/api/health`), matching the Express mount at `/api`. The browser calls the same-origin `/api`, so no CORS or base URL is needed (`VITE_API_URL` defaults to `/api`).
- **No service bindings** are configured. Only the browser calls the backend; no server-side code calls another service.
- In production, `/api/demo/snapshot` and `/api/demo/reset` are off, so the hosted UI uses the **offline demo adapter** (per-browser state) while catalogue and health endpoints are served by the API. Set `ENABLE_DEMO_ROUTES=true` to have the UI use the API's in-memory store instead. On serverless that store is per-instance and resets on cold starts, so treat it as a short-lived demo.
- Test locally with `vercel dev`, which runs both services with the same routing. `npm run dev` keeps working as before.

## Known limitations / next steps

- The illustrated characters are hand-built SVGs with volumetric shading, standing in for **commissioned 3D character art** (see `frontend/public/images/README.md`). Final cinematic renders would substantially lift the hero.
- The client discovery questionnaire was not available when this was built, so prices, cancellation and credit roll-over policies, tutor rosters and brand assets are placeholders to confirm.
- There is no database, real auth, file uploads, or CMS yet. Repositories and integration adapters are the intended replacement points.
- The backend runs TypeScript via `tsx`. Add a compile step (e.g. `tsup`) for production hosting.
