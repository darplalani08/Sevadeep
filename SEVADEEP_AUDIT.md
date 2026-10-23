# SevaDeep — pre-migration audit

Taken 23 Oct 2026, before any Supabase work. Every finding below was verified by running
something, not inferred from reading code.

Backup: `/Users/darplalani/Desktop/Sevadeep-backups/sevadeep-20261023-212358-pre-supabase`
(full tree including `data/`, plus git HEAD and uncommitted-file list, with restore steps).

---

## 1. What the project actually is

| | |
|---|---|
| Framework | Next.js 16.3.5, App Router, Turbopack, React 19, TypeScript strict |
| Styling | Tailwind v4, shadcn/ui on Base UI, Framer Motion, Lenis |
| Backend | Next Route Handlers under `src/app/api/` — no separate server |
| Database | **SQLite via `node:sqlite`**, file at `data/sevadeep.db` |
| Auth | Application-managed: scrypt hashes + hashed session rows in SQLite |
| Repo | `github.com/darplalani08/Sevadeep`, public, `main` |
| Deployment | `https://sevadeep-two.vercel.app` — live, auto-deploying from that repo |

## 2. Root cause: why production is broken

**Confirmed by probing the live site, not guessed.** Every database-backed endpoint returns 500:

```
GET  /api/opportunities   500  {"error":"We could not load the opportunity catalogue."}
GET  /api/admin/setup     500  {"error":"Something went wrong. Please try again."}
POST /api/enrollment      500  {"error":"We could not save your application. Please try again."}
GET  /admin               307 -> /admin/login     (the proxy redirect still works)
```

The static pages render fine; only data operations fail.

**Cause.** `src/server/db/client.ts` calls `fs.mkdirSync(process.cwd() + "/data")` and opens a
SQLite file there. On Vercel the bundle filesystem is **read-only**, so the directory and file
cannot be created and the connection throws on first use. Even if it could be written, each
serverless invocation gets its own ephemeral container: a row written by one request would be
invisible to the next, and the whole database would vanish between deployments.

This is not a bug in the SQLite code — it is the wrong storage class for Vercel. SQLite on a
single always-on machine (the localhost demo) is correct and fully working; SQLite on ephemeral
serverless functions cannot work at all. **That is exactly the gap Supabase Postgres closes**, and
it is why nothing submitted on one device has ever reached the admin dashboard on another.

## 3. Correction: "remove OTP authentication"

The prompt asks to replace OTP login with username/password. There is **no OTP system to replace**.

`src/components/sections/phone-login-form.tsx`, used by both `/donor-login` and `/ngo-login`, is
a front-end mock:

- `requestOtp()` in `src/lib/api/donations.ts` is a stub that waits 600 ms and returns a random
  reference. **No SMS is sent and no code is generated.**
- The "Verify & Continue" button accepts **any** 6 digits and calls
  `toast.success("Donor login successful (demo)")`.
- **No session is created, no cookie is set, no account is looked up**, and there is no donors or
  NGOs table anywhere.

So this is not a migration from one auth mechanism to another. Donor and NGO authentication has
to be **built from nothing**: accounts, registration, credential storage, sessions, protected
pages and recovery. That is a materially larger piece of work than "swap OTP for passwords", and
it is the single biggest item in this prompt.

Administrator auth is the opposite case — it is already real (scrypt, hashed session rows,
rate limiting, three authorisation layers) and needs porting to Postgres, not rebuilding.

## 4. What already works and must be preserved

Verified today by 67 unit tests, 51 HTTP integration tests and a 19-step two-window browser test,
all passing against the local build:

- Chatbot — rule-based, local, 24 intents, no external service.
- Student enrolment, references (`SD-2026-000001`), salted-hash tracking codes.
- Tracking with status-only disclosure and 4-second polling.
- Admin dashboard: live counters, three charts, search, filters, status changes with audit trail.
- Volunteer matching: 50/30/20 weighting, explained scores, stored results.
- Opportunity catalogue, configurable weights, administrator accounts.

The matching and chatbot engines are **pure and dependency-free**, so they port to Postgres
untouched. Only the repository layer under `src/server/db/` is storage-specific.

## 5. Inventory of what must change

| Area | Change |
|---|---|
| `src/server/db/client.ts` | Replace `node:sqlite` with a Postgres client |
| `src/server/db/{applications,volunteers,opportunities,admins,analytics}.ts` | Rewrite queries for Postgres; logic unchanged |
| `src/server/db/schema.ts` | Replaced by versioned SQL migrations under `supabase/migrations/` |
| `src/server/auth/*` | Keep scrypt + sessions; move storage to Postgres; generalise from admins to accounts with roles |
| `src/app/donor-login`, `src/app/ngo-login` | Replace the mock OTP form with real username/password; add registration |
| `src/components/sections/phone-login-form.tsx` | Delete once both pages are migrated |
| `src/lib/api/donations.ts` | Drop `requestOtp` |
| Tests | Integration and browser suites need a Postgres test database instead of a temp SQLite file |

## 6. Blocked on external configuration

**Supabase MCP is configured but not authenticated.** `claude mcp list` reports:

```
supabase: https://mcp.supabase.com/mcp?project_ref=mvuhxlnvulaepxxfxmvj&... (HTTP)
          - Pending approval (run `claude` to approve)
```

No Supabase tools are available in this session, so I currently **cannot**:

- inspect the existing schema of project `mvuhxlnvulaepxxfxmvj`,
- see whether it already holds tables or production data,
- apply migrations, or
- read the project URL and API keys.

The prompt's own execution order puts "inspect the existing database" before "design compatible
migrations", and that ordering is right: designing a schema blind risks colliding with tables that
are already there. Schema work is therefore drafted but **not applied** until the connection is
live and the existing contents have been inspected.

Vercel is also not linked locally (no `.vercel/` directory), so environment variables cannot be
set from here yet.

## 7. Risk note

The SQLite build is finished and verified, and it is what currently runs the localhost demo. This
migration replaces its entire storage and authentication layer and adds a from-scratch account
system for two more user types. It is the right architecture for multi-device use and for Vercel,
but it is not a small change, and until it is finished and tested the demo should be run from the
backup or from commit `abf509a`, which is tagged working.
