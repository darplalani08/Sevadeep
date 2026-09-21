# SevaDeep — Rebuild

A modern, animated rebuild of [sevadeep.org](https://sevadeep.org) ("Connecting Donors with NGOs"), a Pune-based
donation platform run by the Relfor Foundation. Same pages, sections and content as the original — upgraded to a
production-grade Next.js frontend.

See [`scraper/SITEMAP.md`](scraper/SITEMAP.md) for the full content audit this rebuild is based on.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme` tokens) + **shadcn/ui** (Base UI primitives)
- **Framer Motion** for component/scroll animation, **Lenis** for smooth scrolling
- **React Hook Form + Zod** for every form
- **next/image** for all photos (local, optimized, no remote hosts required)
- Typed content in `/content`, a swappable data layer in `/src/lib/api`

## Getting started

```bash
npm install
npm run dev       # http://localhost:3000
```

### Other scripts

```bash
npm run lint       # ESLint (zero errors/warnings)
npm run build      # production build (typechecks + prerenders every route)
npm run start      # serve the production build locally
```

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
    api/                  Data layer (getNgos, getNeeds, getBlogPosts, submitDonation, ...) —
                           swap the implementation here to point at Firebase/a real backend;
                           no UI component talks to `/content` directly.
    validations/          Zod schemas for every form
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

## Deploying to Vercel

1. Push this repository to GitHub/GitLab/Bitbucket.
2. Import it at [vercel.com/new](https://vercel.com/new) — Vercel auto-detects Next.js, no config needed.
3. No environment variables are required (the app ships with local mock data).
4. Every push to the default branch redeploys automatically.

Or from the CLI:

```bash
npm i -g vercel
vercel        # preview deploy
vercel --prod # production deploy
```

## QA

- `npm run lint` and `npm run build` both pass with zero errors.
- Every route in `scraper/SITEMAP.md` exists and renders (see `qa/new-screenshots` for visual
  captures at 1440px and 390px, alongside the original site's screenshots in `scraper/screenshots`
  for side-by-side comparison).
- All forms validate client-side with Zod before submitting to the mock API layer.
