# Team Collab

> A real-time shared task board. Anyone joining the same workspace sees task changes and presence updates instantly.

**Live demo:** https://team-collab-1091903405615.us-central1.run.app
**Source:** https://github.com/Shaidhms/team-collab

[![CI](https://github.com/Shaidhms/team-collab/actions/workflows/ci.yml/badge.svg)](https://github.com/Shaidhms/team-collab/actions/workflows/ci.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178c6)

---

## What it does (problem statement: team collaboration)

- **Multi-user real-time** — multiple teammates open the same URL, each picks a display name, and they see one another's task changes live (Server-Sent Events stream).
- **Presence list** — see who's currently in the workspace.
- **Shared task board** — add, check off, delete tasks; every change broadcasts to all connected clients within milliseconds.
- **Resilient** — clients reconnect automatically; server emits heartbeats; presence cleans up on disconnect.

This is a focused warm-up scope. The architecture (server-side store, pub/sub, presence, validation, rate limiting) is the same shape you'd use for a full Slack/Linear-style tool — just swap the in-memory store for Firestore or Postgres for multi-instance scale.

---

## Architecture

```
Browser  ─HTTPS─▶  Next.js 14 (App Router) on Google Cloud Run
   │                      │
   ├── /api/session       │   POST/DELETE — set/clear display name (cookie)
   ├── /api/tasks         │   GET/POST/PATCH/DELETE — CRUD with zod validation
   ├── /api/stream  ◀─SSE─┤   text/event-stream pushing snapshots + change events
   └── /api/health        │   liveness probe for Cloud Run
                          ▼
                  In-memory pub/sub store
                  (one process per Cloud Run instance)
```

**Why SSE and not WebSocket?** SSE is one-way (server → client), which is exactly what's needed for live updates. It works over plain HTTPS, runs through any proxy, reconnects automatically, and Cloud Run supports it out of the box without any sticky-session config.

**Stack:** Next.js 14 · TypeScript (strict) · React 18 · Zod · Vitest · Playwright · axe-core · Google Cloud Run · Cloud Build · Artifact Registry · Cloud Logging · **Cloud Firestore (Native)** · **Secret Manager**.

## Persistence + auth

| Concern | What's wired |
|---|---|
| **Tasks** | **Cloud Firestore (Native mode)** in `us-central1`. Server uses `firebase-admin` with Application Default Credentials — no JSON keys leave Google. The store class is split into `MemoryStore` (tests + local fallback) and `FirestoreStore` (production), behind a shared `TaskStore` interface so the swap is one env var (`STORE_BACKEND=memory`). |
| **Presence** | In-memory per Cloud Run instance. Correct semantics — presence is ephemeral and dies with the connection. |
| **Real-time** | Server-Sent Events stream. `FirestoreStore` attaches one `onSnapshot` listener per process, fans out to all connected SSE clients. Cross-instance updates work because Firestore is the bus. |
| **Sessions** | Display name in an httpOnly cookie, **signed with HMAC-SHA256** (`SESSION_SECRET` from Secret Manager). Tampered cookies are rejected. |
| **Auth (next pass)** | Google Sign-In via Firebase Auth is scaffolded for the next phase — see ["Adding Google Sign-In"](#adding-google-sign-in-next-pass) below. The current display-name flow already produces tamper-proof sessions. |
| **Firestore rules** | Deny-all from clients (`firestore.rules`). The server bypasses rules via Admin SDK; rules are defensive in case a client SDK is added later. |

---

## Mapped to the evaluation framework

| Axis | What's in the repo |
|---|---|
| **Code Quality** | TypeScript `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride`. ESLint with `next/core-web-vitals` + ban on `dangerouslySetInnerHTML`, `react/no-danger`, `react/jsx-no-target-blank`. Prettier. Clean module boundaries (`lib/`, `components/`, `app/api/`). Zero `any`. |
| **Security** | CSP, HSTS, X-Frame-Options DENY, Permissions-Policy, X-Content-Type-Options, Referrer-Policy via `next.config.mjs`. Server-side zod validation on every mutation. Per-IP token-bucket rate limiting on mutations. SameSite=Lax, httpOnly, Secure cookies. No `dangerouslySetInnerHTML` (lint-enforced). No client-side secrets. `SECURITY.md` with OWASP Top 10 mapping. |
| **Efficiency** | Server Components for the initial render (zero client JS for the shell). Streaming SSE instead of polling. Lean dependency tree (5 prod deps total). `next.config` enables compression and disables `x-powered-by`. Cloud Run container is multi-stage with a distroless-style Alpine runtime. |
| **Testing** | **Vitest** unit tests for the store, validators, and rate limiter (~25 cases). **Playwright** E2E covering join → add task → display, plus skip-link keyboard reachability and `/api/health`. **axe-core** a11y check runs inside the E2E suite. CI runs them on every PR. Cloud Build runs lint + typecheck + unit tests *before* the deploy. |
| **Accessibility** | WCAG 2.1 AA target. Semantic HTML (`<main>`, `<header>`, `<section>`, `<footer>`). Skip-to-content link. ARIA live regions on the task list and presence list. `aria-label` / `aria-describedby` / `aria-invalid` on form fields. Visible `:focus-visible` rings. ≥44px touch targets. Reduced-motion media query honored. Color contrast tokens validated for ≥4.5:1. axe-core gates CI. |
| **Problem Statement Alignment** | Real multi-user collaboration: presence list, shared state with live updates, display-name session, rate-limited mutations, conflict-free last-write-wins on toggles. Open in two browsers — both see each other. |
| **Google Services Usage** | **Cloud Run** (hosting), **Cloud Build** (CI/CD pipeline with test gate), **Artifact Registry** (container images), **Cloud Logging** (structured JSON logs via `lib/logger.ts`). All running on project `green-chalice-489806-f8` in `us-central1`. |

---

## Adding Google Sign-In (next pass)

The current build uses an HMAC-signed display-name cookie — tamper-proof, but anyone can pick any name. To add real Google identities:

1. Link the GCP project to Firebase: https://console.firebase.google.com/ → "Add project" → select `green-chalice-489806-f8`.
2. Authentication → Sign-in method → enable Google → set support email.
3. Project settings → "Your apps" → register a web app → copy `apiKey, authDomain, projectId, appId`.
4. Add the Cloud Run domain (`team-collab-*.a.run.app`) to **Authorized domains**.
5. Install the client SDK: `npm install firebase`.
6. Replace `src/components/join-prompt.tsx` with a `signInWithPopup(auth, GoogleAuthProvider)` button.
7. POST the resulting ID token to `/api/session` and replace `writeSession({ name })` with `adminAuth.createSessionCookie(idToken, ...)` in `src/app/api/session/route.ts`.
8. Replace HMAC verification in `src/lib/session.ts` with `adminAuth.verifySessionCookie(cookie, true)`.

The store, validators, rate-limiter, and SSE pipeline stay unchanged — only the identity layer swaps.

## Local development

```bash
git clone https://github.com/Shaidhms/team-collab && cd team-collab
npm install
cp .env.example .env.local
# Generate a SESSION_SECRET:
echo "SESSION_SECRET=$(openssl rand -base64 48)" >> .env.local
# Use the in-memory store for local dev (no gcloud ADC needed):
echo "STORE_BACKEND=memory" >> .env.local

npm run dev          # http://localhost:3000
```

To exercise Firestore locally, omit `STORE_BACKEND=memory` and run `gcloud auth application-default login` once. Then the Admin SDK uses your gcloud creds.

In production mode (matches the deployed container):

```bash
npm run build
npm run start
```

In Docker:

```bash
docker build -t team-collab .
docker run --rm -p 3000:3000 team-collab
```

## Tests

```bash
npm run lint            # ESLint
npm run typecheck       # tsc --noEmit
npm run test:run        # Vitest unit
npm run test:e2e        # Playwright E2E + axe a11y (auto-spawns the prod server)
```

## GCP one-time setup

After cloning, run these once against your GCP project:

```bash
PROJECT_ID=green-chalice-489806-f8
gcloud config set project "$PROJECT_ID"
gcloud services enable firestore.googleapis.com run.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com

# Firestore Native mode in us-central1
gcloud firestore databases create --location=us-central1 --type=firestore-native

# HMAC secret for signing session cookies
openssl rand -base64 48 | tr -d '\n' | gcloud secrets create session-secret \
  --replication-policy=automatic --data-file=-

# Grant the Cloud Run runtime SA access
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${SA}" --role="roles/datastore.user"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${SA}" --role="roles/secretmanager.secretAccessor"

# Deploy Firestore rules (lock client access — server uses Admin SDK)
firebase deploy --only firestore:rules    # or use Cloud Console
```

## Deploy to Cloud Run

GCP project: `green-chalice-489806-f8` · Region: `us-central1`

The repo is wired for **Cloud Build trigger on push to main**:
1. Cloud Build runs `cloudbuild.yaml`: `npm ci → lint → typecheck → test → docker build → push to Artifact Registry → gcloud run deploy`.
2. If any step fails, deploy is aborted — the live revision is unchanged.
3. On success, traffic is shifted 100% to the new revision.

Manual deploy (from Cloud Shell):

```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/green-chalice-489806-f8/team-collab/team-collab .
gcloud run deploy team-collab \
  --image=us-central1-docker.pkg.dev/green-chalice-489806-f8/team-collab/team-collab \
  --region=us-central1 --allow-unauthenticated --port=3000 \
  --min-instances=1 --max-instances=3 --concurrency=80
```

> Note: `--min-instances=1` keeps one instance warm. The in-memory store is shared across requests on a single instance — if you scale to multiple instances, swap the store implementation in `src/lib/store.ts` for Firestore (a 1-file change, types stay the same).

## Routes

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Server-rendered landing — task board if joined, else join prompt |
| `/api/session` | GET / POST / DELETE | Read / set / clear display-name cookie session |
| `/api/tasks` | GET / POST | List or create tasks (POST requires session) |
| `/api/tasks/:id` | PATCH / DELETE | Update or delete a single task |
| `/api/stream` | GET | Server-Sent Events stream of snapshots + change events + presence |
| `/api/health` | GET | JSON liveness probe (used by Cloud Run) |

## Project layout

```
src/
  app/
    layout.tsx                # root layout, metadata, skip-link
    page.tsx                  # RSC entry — server-fetches initial state
    globals.css               # design tokens, dark mode, focus rings
    api/
      health/route.ts
      session/route.ts
      stream/route.ts         # SSE endpoint
      tasks/route.ts
      tasks/[id]/route.ts
  components/
    join-prompt.tsx           # client — set display name
    task-board.tsx            # client — SSE subscribe + optimistic CRUD
    presence.tsx              # online list (server-renderable)
  lib/
    store.ts                  # in-memory pub/sub store
    validators.ts             # zod schemas
    session.ts                # cookie helpers
    rate-limit.ts             # token-bucket limiter
    logger.ts                 # Cloud Logging-shaped JSON
  types.ts                    # shared types
tests/
  unit/                       # Vitest — store, validators, rate-limit
  e2e/                        # Playwright — flow + axe-core
.github/workflows/ci.yml      # lint + typecheck + unit + E2E
cloudbuild.yaml               # build → push → deploy with test gate
Dockerfile                    # multi-stage, distroless-style runtime
next.config.mjs               # security headers + CSP + standalone output
SECURITY.md                   # threat model + OWASP map
```

## License

MIT — see [LICENSE](LICENSE).
