# SevaDeep — Rebuild

A modern, animated rebuild of [sevadeep.org](https://sevadeep.org) ("Connecting Donors with NGOs"), a Pune-based
donation platform run by the Relfor Foundation. Same pages, sections and content as the original — upgraded to a
production-grade Next.js frontend.

See [`scraper/SITEMAP.md`](scraper/SITEMAP.md) for the full content audit this rebuild is based on.

**The site is now also a working platform**, with a local database behind four features: an NGO assistance chatbot,
student enrolment with secure application tracking, a session-protected admin dashboard with live analytics, and
skill-based volunteer matching. It runs entirely on localhost — nothing is deployed and no paid service is used.
Full write-up: [`SEVADEEP_TECHNICAL_DOCUMENTATION.md`](SEVADEEP_TECHNICAL_DOCUMENTATION.md).
Demo walkthrough: [`DEMO_CHECKLIST.md`](DEMO_CHECKLIST.md).

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme` tokens) + **shadcn/ui** (Base UI primitives)
- **Framer Motion** for component/scroll animation, **Lenis** for smooth scrolling
- **React Hook Form + Zod** for every form
- **next/image** for all photos (local, optimized, no remote hosts required)
- Typed content in `/content`, a swappable data layer in `/src/lib/api`
- **SQLite via `node:sqlite`** and **scrypt via `node:crypto`** for the platform features — both
  from Node's standard library, so no new dependency and no native build step

## Getting started

```bash
npm install
npm run dev       # http://localhost:3000
```

On first run, open `http://localhost:3000/admin/setup` to create the administrator account. The
database (`data/sevadeep.db`) and the volunteering opportunity catalogue are created automatically;
`next dev` prints `ExperimentalWarning: SQLite is an experimental feature`, which is Node's own
notice about its built-in SQLite module.

### Other scripts

```bash
npm run lint         # ESLint (zero errors/warnings)
npm run build        # production build (typechecks + prerenders every route)
npm run start        # serve the production build locally

npm test             # unit tests (matching engine, chatbot engine, security primitives)
npm run test:api     # HTTP integration tests against a real server and a real SQLite file
npm run test:browser # two-window Playwright test (public window + admin window)
npm run test:all     # all three, in order
```

`test:api` and `test:browser` start their own server on port 3177 with a throwaway database, so
they never touch `data/sevadeep.db`. Next 16 allows only one `next dev` per project directory —
stop your own dev server before running them.

## Project structure

```
content/                 Typed content data (site config, home copy, NGOs, needs, blog posts)
src/
  app/                   Routes (App Router) — one folder per page in SITEMAP.md
  components/
    ui/                  shadcn/ui primitives (button, dialog, form, select, ...)
    layout/              Navbar, MobileMenu, Footer, theme + smooth-scroll providers
    common/               SectionHeading, StatCounter, Breadcrumbs, Pagination, skeletons, ...
    cards/                NgoCard, NeedCard, BlogCard, CategoryCard
    sections/             Home page sections (hero, stats, testimonials, awards, how-it-works, founder, ...)
  lib/
    api/                  Read-side data layer (getNgos, getNeeds, getBlogPosts, ...) plus the
                           remaining mock submit handlers (donations, NGO registration, OTP,
                           meal sponsorship). No UI component talks to `/content` directly.
    chatbot/engine.ts     Rule-based intent recognition (pure, dependency-free)
    matching/engine.ts    Weighted volunteer matching (pure, dependency-free)
    hooks/use-live-data.ts  Polling hook behind every live view
    validations/          Zod schemas for every form
  server/
    db/                   SQLite client, migrations, repositories, analytics
    auth/                 scrypt password hashing and cookie sessions
  proxy.ts                Pre-render redirect for /admin
  app/api/                Route handlers (public + /api/admin/*, all session-protected)
data/                     SQLite database (git-ignored — it holds applicant records)
tests/                    Unit, HTTP integration and two-window browser tests
public/images/            All images downloaded from the live site during the content audit
scraper/                  The Playwright crawler used to audit sevadeep.org (not part of the app)
qa/                       Before/after screenshots used for visual QA
```

## Design system

- Brand palette follows what's actually live on sevadeep.org today (a maroon/crimson primary and
  saffron/orange accent, evoking the diya-flame logo) rather than the `#1976d2` blue sometimes
  associated with the brand — see the note at the top of `scraper/SITEMAP.md` for the reasoning.
- Fonts: **Fraunces** (display/headings) + **Plus Jakarta Sans** (body), loaded via `next/font/google`.
- Light and dark mode are both fully themed (`next-themes`, class strategy).
- `prefers-reduced-motion` disables Lenis smooth scrolling and count-up/entrance animations.

## Data layer

Everything under `/content` is real content captured from the live site (see the crawl in
`/scraper`). `/src/lib/api` wraps it behind async functions shaped like a real backend call
(`getNgos(filters)`, `getBlogPost(slug)`, `submitDonation(values)`, ...), so swapping in Firebase
or a REST API later means editing the functions in `src/lib/api/*.ts` only — no component changes.

## Deployment

This build is **localhost-only and is not deployed**. The platform features write to a local
SQLite file and the admin area has no HTTPS or CSRF protection, so it is not ready to be exposed
publicly — see the Security section of
[`SEVADEEP_TECHNICAL_DOCUMENTATION.md`](SEVADEEP_TECHNICAL_DOCUMENTATION.md) for exactly what would
need to change first.

The original content site has no such constraint; if only that were deployed, Vercel would
auto-detect Next.js and need no configuration.

## QA

- `npm run lint`, `npx tsc --noEmit` and `npm run build` all pass with zero errors and warnings.
- Every route in `scraper/SITEMAP.md` exists and renders (see `qa/new-screenshots` for visual
  captures at 1440px and 390px, alongside the original site's screenshots in `scraper/screenshots`
  for side-by-side comparison). `qa/platform-screenshots/regression/` holds the same captures taken
  after the platform work, for before/after comparison.
- Every form validates with Zod **twice** — in the browser and again in the route handler, so
  client-side validation is never the only gate.
- `npm run test:all` runs 67 unit tests, 51 HTTP integration tests and a 19-step two-window browser
  test. The integration suite includes a server restart to prove the data persists.
