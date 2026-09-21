# QA Checklist

## Pages (vs. `/scraper/SITEMAP.md`)

| Page | Route | Status |
|---|---|---|
| Home | `/` | ✅ all 9 sections present, in order (hero, intro+categories, activity feed, stats, testimonials, news/awards, how-it-works, founder, FAQ), plus footer |
| NGO List | `/ngos` | ✅ search + city/area/category filters, animated grid, pagination, detail modal |
| NGO Needs | `/ngo-needs` | ✅ search + category filter, animated grid, pagination, "Donate This" wired to bucket |
| Donation Bucket | `/donation-bucket` | ✅ upgraded to 3-step flow (review → details → confirmation) per brief |
| Blog index | `/blog` | ✅ search + category filter, all 10 sitemap posts |
| Blog posts | `/blog/[slug]` ×10 | ✅ reading time, share buttons, comment form, related posts |
| NGO Login | `/ngo-login` | ✅ phone + OTP + reCAPTCHA-style checkbox |
| Donor Login | `/donor-login` | ✅ phone + OTP, Google option noted, quick actions |
| NGO Registration | `/ngo-registration` | ✅ all core fields from original form |
| Volunteer Register | `/volunteer-register` | ✅ all fields from original form |
| Narayan Seva | `/narayan-seva` | ✅ mission copy + meal-tier sponsor calculator |
| Gallery | `/gallery` | ✅ 3 tabs, lightbox; linked from footer + home "See More" |
| 404 | any unknown path | ✅ custom not-found page |
| Error boundary | — | ✅ `src/app/error.tsx` |
| Sitemap / robots | `/sitemap.xml`, `/robots.txt` | ✅ generated dynamically from content |

## Images

- 100/100 images downloaded from the live site, zero missing (`scraper/missing-images.md` not needed).
- NGOs/blog posts without a confirmed real photo render a branded icon placeholder instead of a
  stretched logo (fixed during QA — see below).

## Links

- Crawled every internal link reachable from all 12 primary routes in the production build: **0 broken links** (all 200, see QA run in session log).

## Forms (all React Hook Form + Zod)

- [x] Donation Bucket — item validation, phone/name/address, pickup vs. drop-off
- [x] NGO Registration — name/email/mobile/address/description required, mobile+email format validated
- [x] Volunteer Registration — category/blood group enums, Aadhar format, mobile format
- [x] NGO/Donor Login — phone format, "not a robot" checkbox required
- [x] Blog comment form — name/email/comment required

## Build health

- `npm run lint` → 0 errors, 0 warnings
- `npx tsc --noEmit` → 0 errors
- `npm run build` → succeeds, all 12 top-level routes + 10 blog posts prerendered as static HTML

## Bugs found & fixed during this QA pass

1. **Navbar active-link bug**: `/#about` and `/#how-it-works` anchor links were matching `pathname.startsWith("/")`, which is true for every route — they lit up as "active" on every page. Fixed in `src/components/layout/navbar.tsx`.
2. **NGO/blog fallback image**: NGOs and one blog post without a real photo fell back to the full rectangular wordmark logo, cropped awkwardly by `object-cover`. Replaced with a branded icon-on-gradient placeholder.
3. **Narayan Seva double heading**: the source photo already has "Feed The Hungry" baked in as a graphic; an additional `<h1>` was overlaid on top of it, duplicating the text. Moved the heading above the image instead.
4. **Stale Turbopack dev cache**: three new routes 404'd until the dev server was restarted — not a code bug, but worth knowing if routes seem to disappear mid-session.
5. **Orphan `/gallery` page**: not linked from any nav — added to the footer and to the "See More" buttons on the home page's activity feed.

## Known limitations (by design, not oversights)

- NGO/Needs listings show 10/12 representative real records each (the live site has ~270 NGOs / ~440 needs loaded from Firestore at runtime); the data layer in `/src/lib/api` is shaped so a real backend can be swapped in without touching any component.
- Two blog posts (`donate-items-this-chrismas`, `best-things-to-donate-to-orphanage`) are empty on the live production site itself — this rebuild reconstructed their full body text from the `/blog` listing page, where the complete (CSS-truncated) text was still present.
- No backend is wired up: all form submissions and logins are mocked in `src/lib/api/donations.ts` with realistic latency and reference IDs.
