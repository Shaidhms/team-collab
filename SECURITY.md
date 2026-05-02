# Security

## Reporting

Email **mail2shaid@gmail.com** with subject `team-collab security`. Please don't open public issues for vulnerabilities.

## Threat model (warm-up scope)

This is a single-instance demo with no persistence and no real auth — display name is the only identity. The threat model focuses on the surface that *is* exposed: arbitrary HTTP from the public internet to a stateful Node.js server.

| Asset | Threat | Mitigation |
|---|---|---|
| Server CPU/memory | Spam mutation requests, runaway SSE connections | Per-IP token bucket on mutations (30/min). SSE writes are bounded by `req.signal.abort` cleanup. |
| Browser DOM | XSS via task text or display name | React auto-escapes all rendered text. `dangerouslySetInnerHTML` is **lint-banned**. CSP `script-src 'self'` (no inline) in production. Display name regex rejects `<>&` and similar. |
| Cookie session | CSRF on mutation endpoints | `SameSite=Lax` + `Secure` + `httpOnly` cookies. Origin is implied by SameSite for the simple form/JSON requests in scope. |
| Network in transit | Eavesdropping, downgrade | HSTS with `preload`, `includeSubDomains`, 2-year max-age. Cloud Run terminates TLS. |
| Server input | Malformed bodies, oversized payloads | Every mutation validates with zod (length caps, character regex). JSON parse is wrapped in `try/catch` with a 400 response. |

## Controls in code

- `next.config.mjs` — Content Security Policy, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy locking down camera/mic/geolocation/FLoC, `poweredByHeader: false`.
- `src/lib/validators.ts` — zod schemas: `TaskTextSchema` (1–280 chars), `DisplayNameSchema` (1–40 chars, unicode-letter/digit/space/`_.-'` only).
- `src/lib/rate-limit.ts` — in-memory token-bucket limiter; mutations call `mutationLimiter.check(ipFromHeaders(...))` and return `429` with `Retry-After` when exhausted.
- `src/lib/session.ts` — cookie set as `httpOnly`, `secure` in prod, `sameSite: 'lax'`, `path: '/'`, 1-year max-age.
- `src/lib/logger.ts` — never logs request bodies; logs minimal fields (taskId, presenceId, name) for audit/debug.
- `.eslintrc.json` — `react/no-danger: error`, `react/jsx-no-target-blank` requires `noreferrer`, custom rule banning `dangerouslySetInnerHTML` JSX attribute.

## OWASP Top 10 (2021) mapping

| Risk | Control |
|---|---|
| **A01 Broken Access Control** | Mutations require an active session cookie. (Single-tenant warm-up — multi-tenant authz lands in the full Phase 1.) |
| **A02 Cryptographic Failures** | TLS terminates at Cloud Run. No password storage in scope. |
| **A03 Injection** | All user input parsed through zod schemas. No direct SQL — store is in-memory. React auto-escapes output. |
| **A04 Insecure Design** | This document. Limiter + validation are designed in, not bolted on. |
| **A05 Security Misconfiguration** | Security headers are explicit in `next.config.mjs`. CSP differs between dev and prod (no `unsafe-eval` in prod). `poweredByHeader: false`. |
| **A06 Vulnerable & Outdated Components** | Lockfile committed. Renovate/Dependabot can be wired on the GitHub repo. |
| **A07 Identification & Auth Failures** | Out of warm-up scope (no password auth). When auth lands, MFA for admins per the architecture plan. |
| **A08 Software & Data Integrity** | Cloud Build verifies signatures of the `gcr.io/cloud-builders/*` images it uses. Lockfile pinned. |
| **A09 Security Logging & Monitoring** | Structured JSON logs via `logger.ts` flow into Cloud Logging automatically. Cloud Monitoring captures p95 latency, 5xx rate, instance count. |
| **A10 SSRF** | No outbound user-controlled URLs in scope. |

## Out of scope for the warm-up

- Real authentication (Identity Platform / OAuth)
- Cross-instance shared state (Firestore / Redis)
- Audit log persistence
- Encrypted at-rest storage of tasks
- Penetration test report

These are addressed in the full architecture plan (`ARCHITECTURE.md` to follow in the challenge phase).
