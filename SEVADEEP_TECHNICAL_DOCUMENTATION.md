# SevaDeep Platform — Technical Documentation

A localhost-only extension of the existing SevaDeep website (a Next.js rebuild of
[sevadeep.org](https://sevadeep.org), the Relfor Foundation's donor-to-NGO donation platform)
into a working service and community-support management system.

Nothing about the original site was redesigned. Four features were added on top of it:

1. a rule-based NGO assistance chatbot,
2. student enrolment with secure application tracking,
3. a secure administration dashboard with live analytics,
4. skill-based volunteer matching.

---

## 1. Problem statement

The SevaDeep site is excellent at *telling* people what the NGO does and at collecting a form
submission. It is not able to *run* anything that follows.

Concretely, before this work:

- **Every form was a dead end.** `src/lib/api/donations.ts` was a mock layer: `submitDonation`,
  `submitVolunteerApplication` and friends waited 900 ms and returned a random reference like
  `SD-VOL-K3P9XZ`. Nothing was stored. Refreshing the page lost the submission; restarting the
  server lost it twice over.
- **There was no student-facing pathway at all**, even though the Foundation's documented work
  includes educational assistance (the home page describes handing an educational assistance fund
  to the Sevasadan Society).
- **A reference number that resolves to nothing is worse than none.** An applicant had no way to
  ask "what happened to my request?" except by telephone, and the NGO had no record to answer from.
- **Volunteer intake collected the wrong shape of data.** The original form asked *how* someone
  wanted to serve (a single category) but never *what they can actually do* or *when* — so a
  coordinator reading the list still had to ring every person to find out whether they could teach,
  drive or write.
- **Staff had no operational view.** The "Numbers Speak" counters on the home page are static
  marketing figures from the live site's content, not a read of anything.
- **A visitor's first question went unanswered.** The site has eleven content pages and a five-item
  FAQ; a visitor who wants to know "can my daughter get tuition help?" has to read it all.

An NGO running on volunteer time cannot afford a website that generates work instead of absorbing
it. The gap is not presentation — it is persistence, workflow and triage.

## 2. Proposed solution

One integrated application, in the same codebase, on the same design system, running on the same
`npm run dev`:

| Need | What was built |
|---|---|
| Answer visitors without staff time | Local rule-based assistant, bottom-right on every page, that routes to the right route |
| Capture an educational-support request properly | `/enroll` — validated form, SQLite row, gap-free reference, private tracking code |
| Let applicants self-serve on status | `/track` — reference + code, status-only disclosure, live updates |
| Give staff an operational view | `/admin` — session-protected dashboard, searchable tables, live counters and charts |
| Triage volunteers before the first phone call | Weighted matching engine, scores explained, results stored for staff |
| Keep everyone looking at the same truth | 4-second polling on every database-backed view |

Design constraints honoured throughout: no cloud service, no paid API, no deployment, no second
backend, no new runtime to install, and no change to any existing page's appearance or behaviour.

## 3. Technical architecture

### 3.1 Stack (unchanged from the original project, plus one standard-library addition)

| Layer | Technology | Note |
|---|---|---|
| Framework | Next.js 16.3.5, App Router, Turbopack | already in use |
| Language | TypeScript 5 (strict) | already in use |
| UI | React 19, Tailwind CSS v4, shadcn/ui on Base UI, Framer Motion, Lenis | already in use |
| Forms | React Hook Form + Zod 4 | already in use |
| **Database** | **SQLite via `node:sqlite`** | **added** |
| **Passwords** | **scrypt via `node:crypto`** | **added** |
| **Charts** | **hand-written SVG/HTML** | **added** |
| Tests | `node:test`, plus Playwright already vendored in `scraper/` | added |

**No new npm dependency was installed for any feature.** `node:sqlite` and `node:crypto` are part
of Node 22, which this project already requires. `@types/node` was moved from `^20` to `^22` so the
type definitions match the Node version actually in use. Charts are hand-written rather than pulling
in a charting library, because three single-series charts do not justify the weight.

> `package.json` also had an uncommitted change that deleted five dependencies the code still
> imports (`@base-ui/react`, `cn`, `shadcn`, `sonner`, `tw-animate-css`). That was reverted — the
> app would not have installed from a clean checkout otherwise.

### 3.2 Why SQLite through `node:sqlite`

- **Real persistence, zero setup.** One file at `data/sevadeep.db`. No service to start, no
  password, nothing for a demonstrator to forget.
- **No native build step.** `better-sqlite3` would have needed node-gyp or a prebuilt binary that
  matches the local Node ABI. `node:sqlite` ships with the runtime, so `git clone && npm install`
  is enough on any machine with Node 22.5+.
- **Synchronous, transactional API.** The reference counter, the application row and its first
  audit event commit together or not at all.
- It prints an `ExperimentalWarning` on start-up. That is the documented status of the API in Node
  22 and has no effect on behaviour.

### 3.3 Request flow

```
                         BROWSER
  ┌──────────────────────────────┐   ┌──────────────────────────────┐
  │ Window A — public visitor    │   │ Window B — administrator     │
  │                              │   │                              │
  │  ChatWidget ── engine.ts ────┤   │  /admin  (server-guarded)    │
  │   (all local, no network)    │   │   ├─ StatGrid                │
  │  /enroll   ── POST ──────────┤   │   ├─ charts.tsx (SVG/HTML)   │
  │  /track    ── POST (poll 4s) │   │   ├─ ApplicationsPanel       │
  │  /volunteer-register ─ POST ─┤   │   ├─ VolunteersPanel         │
  │            + local preview   │   │   ├─ OpportunitiesPanel      │
  │                              │   │   └─ SettingsPanel           │
  │     useLiveData (poll 4s) ───┤   │     useLiveData (poll 4s) ───┤
  └──────────────┬───────────────┘   └──────────────┬───────────────┘
                 │                                  │
                 │  fetch, JSON, Cache-Control: no-store
                 ▼                                  ▼
  ╔══════════════════════════════════════════════════════════════════╗
  ║                   src/proxy.ts  (307 for /admin/* with no cookie) ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║  PUBLIC ROUTE HANDLERS          │  ADMIN ROUTE HANDLERS           ║
  ║  POST /api/enrollment           │  every one starts with          ║
  ║  POST /api/track                │  requireAdmin() → 401           ║
  ║  POST /api/volunteers           │                                 ║
  ║  GET  /api/opportunities        │  /api/admin/login · logout      ║
  ║                                 │  · session · setup · overview   ║
  ║  Zod re-validation              │  · applications[/:ref]          ║
  ║  in-memory rate limiting        │  · volunteers[/:ref]            ║
  ║                                 │  · opportunities · admins       ║
  ║                                 │  · weights                      ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║  DATA ACCESS LAYER  src/server/db/                                ║
  ║  applications.ts · volunteers.ts · opportunities.ts · admins.ts    ║
  ║  analytics.ts · references.ts · client.ts (migrations + seed)      ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║  DOMAIN LOGIC  (pure, dependency-free, unit-tested)                ║
  ║  src/lib/matching/engine.ts     src/lib/chatbot/engine.ts          ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║  SQLite   data/sevadeep.db   (WAL, foreign keys on)               ║
  ╚══════════════════════════════════════════════════════════════════╝
```

The two engines sit below the data layer on purpose: they import nothing, so the same code runs in
the browser (instant chatbot replies, live match preview), on the server (the authoritative stored
scores) and under `node --test`.

### 3.4 Files added or changed

**Added — domain logic and data**

```
content/chatbot.ts              Chatbot knowledge base (intents, answers, links)
content/education.ts            Support types, classes, statuses, applicant guidance
content/volunteering.ts         Skill / interest / availability vocabularies
src/lib/chatbot/engine.ts       Intent recognition (pure)
src/lib/matching/engine.ts      Weighted volunteer matching (pure)
src/lib/hooks/use-live-data.ts  Polling hook
src/lib/validations/enrollment.ts
src/server/db/{client,schema,references,applications,volunteers,opportunities,admins,analytics}.ts
src/server/db/opportunity-seed.ts
src/server/auth/{password,session,cookie}.ts
src/server/http.ts              Route-handler helpers + rate limiter
src/proxy.ts                    Pre-render redirect for /admin
```

**Added — interface**

```
src/app/enroll/{page,enrollment-form}.tsx
src/app/track/{page,track-client}.tsx
src/app/admin/{layout,page,dashboard}.tsx
src/app/admin/{applications,volunteers,opportunities,settings}-panel.tsx
src/app/admin/login/{page,login-form}.tsx
src/app/admin/setup/{page,setup-form}.tsx
src/app/api/{enrollment,track,volunteers,opportunities}/route.ts
src/app/api/admin/{login,logout,session,setup,overview,applications,volunteers,opportunities,admins,weights}/route.ts
src/app/api/admin/{applications,volunteers}/[reference]/route.ts
src/components/chatbot/chat-widget.tsx
src/components/admin/charts.tsx
src/components/volunteer/match-results.tsx
src/components/common/chip-group.tsx
```

**Changed — existing files, minimally**

| File | Change |
|---|---|
| `src/app/layout.tsx` | one line: mount `<ChatWidget />` |
| `src/app/volunteer-register/volunteer-form.tsx` | kept every original field; added the skill/interest/availability profile, the live preview and the match results; now posts to the real API |
| `src/lib/validations/volunteer.ts` | added the profile fields to the existing schema |
| `content/site.ts` | added `studentNavGroup`, `footerLinks.students`, `staffLink` |
| `src/components/layout/{navbar,mobile-menu,footer}.tsx` | render those new links |
| `src/app/{robots,sitemap}.ts` | `/enroll` added to the sitemap; `/admin` and `/track` disallowed |
| `package.json` | restored the five wrongly-removed dependencies; `@types/node` ^22; test scripts |
| `tsconfig.json` | `allowImportingTsExtensions` so `node --test` can load app modules |
| `.gitignore` | ignore `data/*.db*` — the database holds applicant records |

No existing page's markup, copy, colours, fonts, images or animations were touched.

## 4. Technical novelty

These are standard techniques used together to close a specific gap — not inventions.

1. **One matching engine, three runtimes.** `src/lib/matching/engine.ts` imports nothing. The same
   function scores the live preview in the browser as the volunteer ticks boxes, computes the
   authoritative scores on the server, and is unit-tested under `node --test`. The preview and the
   stored result cannot disagree, because there is only one implementation.
2. **Explainable scores, not a bare percentage.** Every match carries its three component scores,
   the skills that matched, the skills the team would train, and a generated sentence. A coordinator
   can defend "85%" to the volunteer on the phone.
3. **Tracking that discloses status without disclosing the applicant.** The public endpoint needs
   the reference *and* a private code, and the response is deliberately narrow: status, dates,
   requested support, the student's first name. No phone number, email, guardian name or internal
   note exists in that payload at all. An integration test asserts the absence of each.
4. **Hashed tracking codes.** The code is hashed with a per-row salt, so the database file does not
   contain the credentials needed to read application statuses out of it.
5. **A status change propagates without a push channel.** The applicant's page and the dashboard
   poll the same database every 4 seconds and re-render only when the payload actually changed.
   Honest naming: this is polling, and it is described as such everywhere.
6. **Reference numbers that are gap-free under concurrency.** The counter bump and the row insert
   share one transaction, so a rolled-back insert returns its number instead of burning it.
7. **An administrator-owned opportunity catalogue.** The matcher's inputs are data the NGO edits,
   not constants in the source, and the seed runs only when the table is empty.
8. **An assistant that declines to answer.** The knowledge base holds only facts already published
   on the site; anything else hits a fallback that hands over the phone number. A test walks every
   suggested question and every internal link to make sure none of them dead-ends.

## 5. Comparison with existing approaches

| Approach | What it gives | Why it did not fit here |
|---|---|---|
| **The site as it was** (static content + mock submit handlers) | Fast, cheap, good SEO | Nothing is stored; no workflow; no staff view |
| **Google Forms + Sheets** | Free, instant, familiar | Leaves the site's design; no applicant-facing status; no access control beyond sheet sharing; no matching |
| **A hosted CRM / case-management SaaS** (Salesforce Nonprofit Cloud, Zoho, Bitrix24) | Mature workflow, reporting, audit | Per-seat cost, cloud account, data leaves the NGO, weeks of configuration — and the brief explicitly forbids paid APIs and deployment |
| **A WordPress plugin stack** (Gravity Forms + a volunteer-management plugin) | Low-code | Wrong framework for this project; licences; no explainable matching |
| **Volunteer-matching platforms** (VolunteerMatch, Idealist, India's iVolunteer) | Large volunteer pools | Match on interest and location, not on a weighted skill/interest/schedule model; the NGO does not own the data or the UI |
| **This build** | Persistent local records, applicant self-service, staff dashboard, explainable matching, one codebase | Single-node and localhost-only by design; polling rather than push; SQLite rather than a server database |

Sources used are the project's own artefacts: `scraper/SITEMAP.md` and `scraper/content/*.json`
(the content audit of sevadeep.org), `content/*.ts`, and the bundled Next.js 16 documentation in
`node_modules/next/dist/docs/`. No external reference is cited that was not actually consulted.

## 6. Unique selling proposition

**One application covers the whole chain, and every link is real.**

A visitor asks the assistant a question → is pointed at the enrolment form → submits it → gets a
reference and a private code → watches the status change on a page that updates itself → while a
coordinator reviews it in a dashboard whose numbers and charts are database reads. The same
application triages volunteers by skill and explains why.

What that is worth, specifically:

- **Nothing is a mock.** Every number on the dashboard is a `COUNT`/`GROUP BY`. There is no
  hardcoded statistic and no fabricated NGO activity anywhere in the feature code.
- **It survives a restart.** Stop the server, start it again: the records, the status history and
  the reference counter are all still there. An automated test asserts exactly this.
- **It discloses the minimum.** Public tracking shows status; staff data needs a session; the
  Aadhar number the original form collects is reduced to its last four digits before storage.
- **Honest labelling.** The seeded volunteering roles are marked "Demo opportunity" in the UI
  because sevadeep.org does not publish a structured role list. Polling is called polling. The
  chatbot states that it is rule-based, not generative.
- **Nothing to install and nothing to pay for.** One `npm run dev`.

## 7. Algorithms

### 7.1 Chatbot intent recognition — `src/lib/chatbot/engine.ts`

Local, deterministic retrieval. **No generative model and no external API.**

```
normalise      lowercase, strip accents and punctuation, collapse whitespace
tokenise       split, drop ~90 stopwords, light suffix stripping
               ("volunteers" / "volunteering" → "volunteer")
score          for each of the 24 intents:
                 phrase hit   +2 + 0.6 × (words in phrase − 1)
                 keyword hit  +0.55 + 0.45 × idf(keyword)
                 follow-up    +0.35 if the previous answer lists this intent
                              as a natural follow-up (and it already scored)
argmax         best intent; confidence = best / (best + runner-up)
gate           best < 1.15 → fallback (contact details, never a guess)
```

`idf(keyword) = ln((N + 1) / (dfkeyword + 0.5))` over the intent set, so a keyword used by one
intent discriminates and one used by eight ("donate") barely moves the score. The IDF table is
computed once per knowledge base and cached in a `WeakMap`.

The follow-up bonus is what makes a pronoun work: "how do I track it?" after an enrolment answer
resolves to application tracking rather than donation tracking.

### 7.2 Application reference generation — `src/server/db/references.ts`

```
SD-2026-000001          applications
SD-VOL-2026-000001      volunteers
```

`ref_counters(kind, year, next_val)` is read and incremented **inside the same transaction as the
row insert**, and `applications.reference` carries a `UNIQUE` index as the final guarantee. A
failed insert rolls the counter back with it, so numbers are gap-free and never reused.

The tracking code is six characters from a 31-symbol alphabet with `O`, `0`, `I`, `1` and `L`
removed so it can be read out over the phone — about 10⁹ combinations, stored as
`salt$sha256(salt:reference:code)` and compared in constant time. It is bound to its own reference,
so a code cannot be replayed against another application.

**Duplicate suppression.** `dedupe_hash` is a SHA-256 of the identifying fields plus a 10-minute
time bucket, with a `UNIQUE` index. A double-click or a browser retry inside that window collapses
onto the existing row and returns HTTP 409 with the original reference; a genuine re-application
later falls in a different bucket and succeeds. Two different children of the same guardian hash
differently. Three simultaneous identical submissions produce exactly one row — tested.

### 7.3 Volunteer matching — `src/lib/matching/engine.ts`

```
score = 100-clamped(
          w_skill        × skillScore
        + w_interest     × interestScore
        + w_availability × availabilityScore
        + (preferenceBoost if the volunteer named this activity)
        )

defaults: w_skill 0.50 · w_interest 0.30 · w_availability 0.20 · boost 10
```

Each component is normalised to 0–100:

- **skillScore** — *requirement coverage*: `100 × |volunteerSkills ∩ requiredSkills| / |requiredSkills|`.
  "What share of what this role asks for does this person bring?"
- **interestScore** — the same coverage measure over the role's interest tags.
- **availabilityScore** — a **gate, not a proportion**: `100` if any slot overlaps, else `0`.
  One matching slot is enough to actually turn up; `"Flexible"` on either side clears it
  automatically. This is why the schedule is worth a flat 20 points.

Missing and hostile inputs are defined rather than undefined: a role that asks for nothing scores
100 (anyone satisfies it); a person who listed nothing scores 0; comparison is case- and
whitespace-insensitive and de-duplicated, so repeating a skill cannot inflate a score; a non-array
input is treated as empty instead of throwing. Ranking is deterministic — score, then skill score,
then title — so the browser preview and the stored server result are byte-identical.

Weights are read **environment → `settings` table → defaults**, so an installation can pin them in
`.env.local` and the dashboard's Settings tab reports the effective values. The preference boost is
deliberately *outside* the weighted sum so the documented 50/30/20 split stays exactly that.

### 7.4 Data synchronisation — `src/lib/hooks/use-live-data.ts`

Short-interval polling, 4 seconds. Not push. The hook guarantees:

| Concern | Mechanism |
|---|---|
| No overlapping requests | an `inFlight` latch; the next poll is scheduled in `finally` |
| No work for a hidden tab | skips the request when `document.hidden`, refetches immediately on return |
| No leak on unmount | `cancelled` flag, `clearTimeout`, `AbortController.abort()` |
| No pointless re-render | compares `JSON.stringify` of the payload; only `setState` on a change |
| Recovers from a dropped server | interval × 2ⁿ, capped at ×8, reset on the first success |
| Expired session | a 401 raises `UnauthorizedError`, which stops the loop and redirects to login |

The admin overview additionally returns a `version` string — `max(updated_at) | counts` — so a
quiet dashboard does no render work at all.

### 7.5 Dashboard aggregation — `src/server/db/analytics.ts`

- counts by status: `GROUP BY status`, zero-filled from the status list so an absent status shows
  `0` rather than disappearing;
- 14-day trend: `GROUP BY substr(created_at, 1, 10)`, then zero-filled day by day so a quiet
  Tuesday is a gap in the line and not a missing point;
- skill distribution: skills are a JSON array per volunteer, so the histogram is tallied in JS over
  the stored rows and sorted by frequency.

### 7.6 Charts — `src/components/admin/charts.tsx`

Hand-written, no dependency, and three decisions are worth recording:

- **Each chart plots one series**, so there is no categorical palette and no legend — the title
  names what is plotted. The single mark hue is the project's existing `--chart-1` token, which
  clears 3:1 against the card surface in both light (8.1:1) and dark (3.8:1) mode.
- **Status colour is deliberately not used in the bars.** Approved-green and Rejected-red are
  nearly indistinguishable under deuteranopia (ΔE 5.3 — measured, not guessed). Status is carried
  by the written label on every row and by labelled badges in the tables.
- **Every chart has a "View as table" disclosure**, so no value is gated behind colour, hover or
  pixel-reading. Bars are capped in thickness with a rounded data-end; the trend line is 2 px with
  a 10% area wash, an end marker ringed in the surface colour, a crosshair tooltip, and only its
  endpoint directly labelled.

## 8. Database design

`data/sevadeep.db` — SQLite, WAL journal, foreign keys enabled. Migrations are ordered SQL
statements recorded in `_migrations`; the schema is created on first use and never dropped.

```
admins ───────────┐
 id PK            │ 1
 email UNIQUE     │
 name             │
 password_hash    │        admin_sessions
 created_at       └──────< token_hash PK   (sha256 of the cookie value)
 last_login_at             admin_id FK CASCADE
                           created_at, expires_at

login_attempts             ref_counters              settings
 id PK                      (kind, year) PK           key PK
 scope_key    idx           next_val                  value
 created_at                                           ('match_weights')

applications                              application_events
 id PK                                     id PK
 reference        UNIQUE  ───────────────< application_id FK CASCADE  idx
 track_code_hash          1            n  from_status
 student_name                             to_status
 guardian_name                            note
 contact_number                           actor      ('applicant' | admin email)
 email                                    created_at
 student_age
 student_class
 city
 support_needed   JSON array
 notes
 status           CHECK IN ('Submitted','Under Review','Approved','Rejected')   idx
 dedupe_hash      UNIQUE
 created_at  idx
 updated_at  idx

volunteers                                volunteer_matches
 id PK                                     id PK
 reference        UNIQUE  ───────────────< volunteer_id FK CASCADE
 full_name                1            n  opportunity_id FK ──────┐
 email                                    score                   │
 mobile                                   skill_score             │
 date_of_birth                            interest_score          │
 blood_group                              availability_score      │
 id_proof_masked  last 4 digits only       matched_skills JSON     │
 category                                 rationale               │
 area_of_interest                         created_at              │
 skills           JSON array               UNIQUE(volunteer_id,    │
 interests        JSON array                      opportunity_id)  │
 availability     JSON array               idx(volunteer_id, score)│
 preferred_activities JSON array                                   │
 hours_per_week                           opportunities            │
 status  CHECK IN ('Pending','Contacted',  id PK (slug) <──────────┘
         'Active','Declined')   idx        title
 dedupe_hash      UNIQUE                   summary
 created_at  idx                           required_skills    JSON array
 updated_at                                interest_tags      JSON array
                                           availability_needs JSON array
                                           location
                                           is_demo
                                           active
                                           created_at
```

Design notes:

- **`UNIQUE` is the real guarantee, not the application check.** `reference` and `dedupe_hash` carry
  unique indexes, so a race that slips past the pre-check is still caught; the handler catches the
  constraint error, re-reads the winning row and reports a duplicate.
- **`CHECK` constraints on both status columns** mean an invalid status cannot be written even if a
  future caller forgets to validate.
- **`application_events` is append-only** and records the acting administrator's email, so a status
  change has provenance. It is what both the dashboard and the applicant's tracking page render as
  "status history".
- **Match results are stored, not recomputed.** Staff see exactly the scores and explanation the
  volunteer saw, even after an administrator later edits or deactivates the role. The
  `volunteer_matches` → `opportunities` join is a `LEFT JOIN` for the same reason.
- **Small vocabularies live as JSON arrays** rather than join tables. With a fixed 18-skill
  vocabulary and a single-node deployment, a `LIKE` filter plus a JS tally is simpler and fast
  enough; a junction table would be the right call at a different scale.
- **No plaintext secret is stored anywhere**: passwords are scrypt hashes, session cookies are
  stored as SHA-256 digests, tracking codes as salted SHA-256, and the Aadhar number is reduced to
  `XXXX-XXXX-1234` before it ever reaches the database.

## 9. Security

### Authentication

- **scrypt** (`N=16384, r=8, p=1`, 64-byte key, 16-byte random salt) from `node:crypto`. Stored as
  `scrypt$N$r$p$salt$hash`; verification is `timingSafeEqual`. A malformed stored hash returns
  false rather than throwing.
- **Password policy**: ≥ 12 characters with upper case, lower case, a digit and a symbol, enforced
  server-side at creation.
- **No credential is hardcoded, committed or typed into a chat.** The first administrator is created
  once at `/admin/setup`, which closes permanently as soon as an account exists (`GET` reports
  `needsSetup: false`, `POST` returns 409). Later administrators are added from the dashboard's
  Settings tab by someone already signed in.
- **Login responses do not distinguish an unknown email from a wrong password**, and an unknown
  email still pays the full scrypt cost so response timing does not leak which addresses exist.

### Sessions

- 32 random bytes, base64url, in an **httpOnly, SameSite=Lax, path=/** cookie. `secure` is set
  automatically when `NODE_ENV=production` (the localhost demo runs over plain HTTP).
- Only the **SHA-256 of the token** is stored, so the database file does not contain usable session
  tokens. Lookup compares in constant time.
- **8-hour expiry**, checked on every request; expired rows are deleted on access and pruned on each
  new sign-in. Logout deletes the row server-side, so replaying a captured cookie value fails.

### Authorisation

Three independent layers, in this order:

1. `src/proxy.ts` — issues a real 307 to `/admin/login` when no session cookie is present. This is
   a **redirect, not a check**: it never validates the cookie, because the proxy must stay free of
   database dependencies.
2. `src/app/admin/page.tsx` — resolves the session against the database **before rendering
   anything**, and redirects if it is missing, forged or expired.
3. Every `/api/admin/*` handler begins with `requireAdmin()` and returns 401 before touching data.

A forged cookie therefore gets past layer 1 and is rejected at layers 2 and 3. Both are tested.

### Input validation

- **The same Zod schema runs in the browser and in the route handler.** Client-side validation is
  never the only gate; a crafted `curl` hits identical rules. Enum fields (support types, classes,
  skills, statuses) only accept values from the shared vocabularies.
- Field-level errors come back as `{ fieldErrors: { field: message } }` and are mapped onto the
  matching inputs, so server-side rejections are as legible as client-side ones.
- All SQL uses **prepared statements with bound parameters** — including the `LIKE` search terms.
  No query is built by string concatenation.

### Rate limiting

| Endpoint | Limit | Where counted |
|---|---|---|
| `POST /api/admin/login` | 8 failures per email+client / 10 min | **SQLite** — survives a restart |
| `POST /api/enrollment` | 10 / 10 min per client | in-memory |
| `POST /api/volunteers` | 10 / 10 min per client | in-memory |
| `POST /api/track` | 90 / min per client | in-memory (generous enough for a 4 s poll, tight enough that guessing a 10⁹-space code is hopeless) |
| `POST /api/admin/setup` | 5 / 10 min per client | in-memory |

Login attempts go to the database deliberately: a brute-force counter that a restart clears is not
a counter. The others are in-process, which is the right trade for a single-node deployment.

### Privacy

- **Public tracking returns status, dates, requested support and the student's first name — nothing
  else.** No contact number, email, guardian name, city or internal note appears in that payload.
  An integration test asserts the absence of each specific value.
- **An unknown reference and a wrong code return the identical 404 message**, so the endpoint cannot
  be used to discover which references exist.
- **The Aadhar number is never stored in full.** `maskIdProof` keeps the last four digits; no API
  returns more. A test asserts the full number appears nowhere in any response.
- **`/admin` and `/track` are disallowed in `robots.txt`** and carry `noindex, nofollow`; neither is
  in the sitemap.
- Every API response carries `Cache-Control: no-store`.
- **`data/*.db` is git-ignored** — the database holds real applicant records once the NGO uses it.
- Server-side errors are logged to the console and answered with a generic message; stack traces and
  SQL text never reach the browser.

### Known limits

- No CSRF token. The admin APIs are state-changing and rely on `SameSite=Lax` plus the fact that
  they only accept JSON bodies — which blocks a cross-site HTML form post, but a token would be the
  correct addition before this was ever exposed beyond localhost.
- No HTTPS on localhost, so the session cookie is not `secure` during a demo.
- No audit log for administrator actions other than application status changes.
- Passwords cannot be reset without an administrator (or direct `sqlite3` access to the file).

## 10. Testing

Three suites, all runnable from the project root.

```bash
npm test            # 67 unit tests        — node:test, no server needed
npm run test:api    # 51 integration tests — real HTTP, real SQLite
npm run test:browser# 15 browser steps     — Playwright, two windows
npm run test:all    # all three in order
```

`npm run test:api` and `npm run test:browser` each start **their own** Next dev server on port 3177
with `SEVADEEP_DB_PATH=data/test-integration.db`, so they never read or write the demo database, and
they delete it afterwards. Next 16 allows only one `next dev` per project directory, so **stop your
own dev server before running them** — the harness says so explicitly if it finds one.

| Suite | File | Covers |
|---|---|---|
| Unit | `tests/matching.test.ts` | the 50/30/20 weighting, availability as a gate, the wildcard, the preference boost and its clamp, missing/hostile inputs, normalisation, de-duplication, ranking, determinism, reconfigured weights |
| Unit | `tests/chatbot.test.ts` | normalisation and stemming; 24 real questions routed against the **real** knowledge base; case and punctuation insensitivity; follow-up context; fallback on unknown, empty, whitespace-only and non-string input; the 500-character cut-off; and knowledge-base integrity — unique ids, every follow-up resolves, every internal link is a route this app serves, every suggested question resolves to an intent |
| Unit | `tests/security.test.ts` | password policy, salting, verification, malformed hashes; reference format and pattern; tracking-code alphabet, hashing, reference binding and user-typed input; the dedupe fingerprint |
| Integration | `tests/integration.test.mjs` | 13 groups — see below |
| Browser | `tests/browser-sync.mjs` | the two-window synchronisation test, the chatbot, mobile layout, and a regression sweep of the original pages |

The integration groups: the public catalogue and setup state · authorisation on seven protected
endpoints and the `/admin` redirect · first-administrator bootstrap and the permanent closing of the
setup endpoint · enrolment validation, sequential references, duplicate collapse and three
simultaneous submissions · secure tracking including the non-disclosure assertions · dashboard
aggregates, search and filters · status propagation to the applicant view, no-op handling, counter
movement and the end states · volunteer registration, ranked and explained matches, Aadhar masking,
filters, the skill chart and the follow-up workflow · the administrator-owned catalogue, including
that deactivating a role removes it from new recommendations but leaves stored matches intact ·
configurable weights · administrator accounts · login, logout, session invalidation and rate
limiting · **and persistence across a real server restart.**

The browser test records a load id on first paint in each window and asserts it never changes, so
"no manual refresh" is checked rather than assumed. Screenshots land in `qa/platform-screenshots/`.

## 11. Running it

```bash
cd /Users/darplalani/Desktop/Sevadeep
npm install          # first time only
npm run dev          # http://localhost:3000
```

| What | Where |
|---|---|
| Original site | `http://localhost:3000` |
| Chatbot | bottom-right on every page |
| Student enrolment | `/enroll` — header → **Students** → Student Enrolment |
| Application tracking | `/track` — header → **Students** → Track Application |
| Volunteer registration | `/volunteer-register` (the original page, extended) |
| Admin login | `/admin/login` — footer → **Staff Login** |
| First-run admin setup | `/admin/setup` (only while no account exists) |
| Dashboard | `/admin` |
| Database | `data/sevadeep.db` |

**First run:** open `/admin/setup`, create the administrator account, and you land on the dashboard
signed in. The database and the opportunity catalogue are created automatically on first use.
`next dev` prints `ExperimentalWarning: SQLite is an experimental feature` — that is expected.

This is a localhost application. Everything above works only while `npm run dev` is running; close
it and the site stops responding. Nothing is deployed and nothing needs to be.

To start over with an empty database, stop the server, delete `data/sevadeep.db*`, and restart —
the schema and catalogue are recreated, and `/admin/setup` opens again.

## 12. Demonstration script (5–7 minutes)

Before you start: `npm run dev`, two browser windows side by side, and the administrator account
already created. Use the clearly-labelled `TEST …` records.

**0:00 — The original site is untouched (30 s)**
Window A on `http://localhost:3000`. Scroll the home page — hero, "Numbers Speak", testimonials,
awards, FAQ. Open **NGOs** and **NGO Needs**. Point out that nothing here changed; the new work is
the **Students** item in the header and the floating assistant.

**0:30 — The assistant (1 min)**
Open the bubble, bottom-right. Say it is rule-based and local — no AI service, no API key.
Ask *"What is SevaDeep?"* → the Relfor Foundation answer. Ask *"how do I enrol a student?"* → the
answer plus a link. Ask *"do you sell second hand cars"* → it declines and gives the phone number
rather than inventing something. Click **Clear conversation**, then the **Open the enrolment form**
link — it navigates.

**1:30 — Enrolment (1 min)**
On `/enroll`, press **Submit Application** empty first to show validation. Then fill it in:
student `TEST Asha Patil`, guardian `TEST Rekha Patil`, `9876543210`, age 12, Class 6-8, Pune,
support **After-School Tuition**, tick the consent box. Submit.
Read out the reference (`SD-2026-000001`) and the 6-character code. Say the code is shown once and
stored only as a salted hash.

**2:30 — The dashboard receives it by itself (1 min)**
Window B on `/admin` (sign in if needed). **Do not reload it.** Within about four seconds
*Total applications* goes 0 → 1, *Submitted* goes 0 → 1, and the empty chart becomes a real one.
Open the **Applications** tab — the row is there. Open the **Settings** tab briefly to show the
matching weights are configurable, not constants.

**3:30 — Tracking, and a status change crossing windows (1 min)**
Window A → `/track`. Enter the reference with a wrong code → refused. Enter the real code → status
**Submitted**, with dates and a status history. Point out there is no phone number or guardian name
on this page, by design.
Window B → **Open** the application → add a note → **Set Under Review**.
Back to Window A **without touching it**: the status becomes **Under Review**, the guidance text
changes, and a second history entry appears. Then set **Approved** in B and watch A follow.

**4:30 — Volunteer matching (1 min)**
Window A → `/volunteer-register`. The original fields are all still there. Scroll to the new
profile section: tick **Driving** and **Logistics & Sorting**, **Donation Drives**, **Weekends**.
The live preview reorders as you tick — that is the same engine the server uses, running in the
browser. It puts **Donation Sorting & Inventory** on top at **75%**: this volunteer brings one of
that role's two required skills and its only interest tag, which beats **Donation Pickup & Field
Visits** at 68%, because the pickup role also wants Event Management. Now tick **Donation Pickup &
Field Visits** under "Activities you'd particularly like" — the preference boost of 10 points
reorders the preview live. Submit. The top match shows its percentage, three component bars, the
matched skills and a sentence explaining why, including the preference. Note that registering is not
acceptance, and the roles are labelled **Demo opportunity** because the live site publishes no
structured role list.

**5:30 — Volunteers reach the dashboard, and the security story (1 min)**
Window B → **Volunteers** tab: the registration is there without a reload, with the same scores and
explanation the volunteer saw. **Show details** → the Aadhar number appears as `XXXX-XXXX-9012`;
the full number is never stored. **Overview** tab: *Volunteer registrations* is 1 and the skill
chart has bars; open **View as table** under a chart to show the numbers are real reads.
Finally: **Sign out**, then type `/admin` in the address bar → redirected to the login page. Mention
that the APIs return 401 on their own, independently of that redirect.

**Optional closer** — `npm test` in a terminal: 67 unit tests, including the restart-persistence and
two-window suites described in §10.

## 13. Individual contributions — template

> Fill this in yourselves. Nothing is pre-filled because the actual split of work is not something
> this document can know. Delete the rows that do not apply.

| Member | Roll no. | Area owned | Specific contribution | Files / evidence |
|---|---|---|---|---|
|  |  | Chatbot — knowledge base and intent engine |  | `content/chatbot.ts`, `src/lib/chatbot/engine.ts`, `src/components/chatbot/chat-widget.tsx` |
|  |  | Enrolment and tracking |  | `src/app/enroll/*`, `src/app/track/*`, `src/app/api/{enrollment,track}/route.ts` |
|  |  | Database schema and data access |  | `src/server/db/*` |
|  |  | Authentication and security |  | `src/server/auth/*`, `src/proxy.ts`, `src/app/api/admin/{login,logout,setup}/route.ts` |
|  |  | Admin dashboard and analytics |  | `src/app/admin/*`, `src/server/db/analytics.ts`, `src/components/admin/charts.tsx` |
|  |  | Volunteer matching |  | `src/lib/matching/engine.ts`, `src/server/db/volunteers.ts`, `src/components/volunteer/match-results.tsx` |
|  |  | Real-time synchronisation |  | `src/lib/hooks/use-live-data.ts` |
|  |  | Testing and QA |  | `tests/*` |
|  |  | Documentation |  | `SEVADEEP_TECHNICAL_DOCUMENTATION.md` |

## 14. Limitations

**By design — consequences of the brief**

- **Localhost only.** Nothing is deployed; the site works only while `npm run dev` runs.
- **Polling, not push.** 4-second intervals, so a change can take up to ~4 seconds to appear. It is
  never described as instantaneous. Server-Sent Events would reduce that but would add
  infrastructure the brief asked to avoid.
- **SQLite, single node.** Correct for one machine; a multi-instance deployment would need a server
  database, and the in-memory rate limiters would need to move into it.
- **Volunteering roles are demonstration data.** sevadeep.org publishes no structured role list (the
  live form loads its categories dynamically and returned none during the content audit — see
  `scraper/content/volunteer-register.json`), so the nine seeded roles are flagged `is_demo` and
  labelled in the UI. The NGO replaces them from the Opportunities tab.
- **The home page's "Numbers Speak" counters are still the original site's static content.** They
  were left exactly as they were because changing them would alter the original design; the real,
  database-backed counts live on the dashboard.

**Not implemented**

- No CSRF token (see §9). No password reset or "forgot password" flow. No email or SMS
  notifications — status changes are visible on the tracking page, not pushed to the applicant.
- No file uploads (the original volunteer form's "Profile Image" field was never wired up, and
  still is not). No pagination controls in the dashboard UI, though the APIs accept
  `limit`/`offset`. No CSV export. No per-administrator roles — every administrator can do
  everything. No soft delete; records can only be removed with `sqlite3`.
- The chatbot has no spell correction, so a badly misspelled question falls through to the
  fallback rather than guessing.

**Verified vs. not verified**

Everything in §10 was executed, and the results are reported in the completion summary rather than
asserted here. Not verified: behaviour on browsers other than the bundled Chromium; screen-reader
testing with an actual screen reader (semantics, labels, focus order and contrast were built in and
reviewed, but no assistive-technology pass was run); and load or concurrency behaviour beyond the
three-simultaneous-submission test.
