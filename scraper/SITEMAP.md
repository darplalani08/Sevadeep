# SevaDeep.org — Crawl Sitemap (Phase 1 output)

Crawled live on 2026-09-11 with headless Chromium (Playwright), rendering the Angular SPA before extraction. Source: `/scraper/content/*.json` (structured text), `/scraper/screenshots/*_1440.png` + `*_390.png` (visual reference), `/public/images/<page>/*` (100 downloaded assets), `/scraper/design-tokens.json` (computed styles).

**⚠️ Important finding — brand color mismatch.** The brief assumes the primary brand color is Material blue `#1976d2`. The live site does **not** use blue anywhere. Computed styles + the rendered logo show a warm palette instead:
- Logo: an orange→red gradient diya (oil lamp) flame mark, "SEVADEEP" wordmark in dark maroon (`rgb(165,42,42)` / `rgb(139,69,19)` tones), tagline "Connecting Donors with NGOs" in red.
- Primary CTA buttons ("Get OTP", "Confirm Donation", phone pill): dark red/maroon (`rgb(184,32,41)`–`rgb(211,9,2)` range), pill-shaped (`border-radius: 50px`).
- Secondary accents: orange `rgb(255,152,0)` (stat numbers, highlighted meal tier), a stray purple `rgb(156,39,176)` on nav links (likely an un-themed Bootstrap/Material default rather than an intentional brand color).
- Body text: `rgb(60,72,88)` on `rgb(238,238,238)` background. Body font `Roboto`; headings use `"Gothic A1", sans-serif` (H1 40px/700).
- **Decision needed before Phase 2:** design around the real observed maroon/orange "diya flame" identity (recommended — it's what's actually live and matches the "deep" = lamp meaning called out in the brief), or keep `#1976d2` blue as the brief specifies. I'd lean toward the real palette since it's the actual current brand, refined into a proper design system (deep maroon primary, warm orange/saffron accent, neutrals) rather than the purple nav-link artifact.

Full computed-style dump: `/scraper/design-tokens.json`.

---

## Route inventory

21 routes rendered. Sitemap.xml listed 10 top-level + 10 blog routes; crawling discovered one additional route (`/gallery`) via in-page navigation not present in sitemap.xml.

| Route | Slug | Title | Sections | Images | Forms |
|---|---|---|---|---|---|
| `/` | home | Connecting Donors with NGOs | 9 (+1 stray hidden modal, excluded below) | 27 | 0 native `<form>` (custom Angular controls) |
| `/ngos` | ngos | NGO List | 1 listing block (10 NGO cards/page × 27 pages) | 10 | search input |
| `/ngo-needs` | ngo-needs | (needs board) | 1 listing block (12 need cards/page × 37 pages) | 15 | search + 2 filters |
| `/donation-bucket` | donation-bucket | (donation form) | 1 form | 1 | Donation Form |
| `/blog` | blog | (blog index) | 10 post previews + pagination | 11 | none |
| `/blog/title/*` (×10) | blog_title_* | individual posts | title/meta/body/comments (4) | 1–2 each | comment form |
| `/ngo-login` | ngo-login | NGO Login | 2 | 2 | phone+OTP |
| `/donor-login` | donor-login | Donor Login | 3 | 4 | phone+OTP / Google |
| `/ngo-registration` | ngo-registration | NGO Registration | 4 | 1 | multi-field registration |
| `/volunteer-register` | volunteer-register | Volunteer Registration | 3 | 2 | multi-field registration |
| `/narayan-seva` | narayan-seva | Narayan Seva (Sponsor a Meal) | 2 | 2 | meal-tier picker |
| `/gallery` | gallery | Gallery | 3 tabs | 7 | none |

Two blog posts render **empty on the live production site itself** (not a scraper issue — confirmed via screenshot, title/date/author blank, no body): `/blog/title/donate-items-this-chrismas` and `/blog/title/best-things-to-donate-to-orphanage`. Their preview text still exists on the `/blog` listing card, so a short summary can be reconstructed from there if you want these pages non-empty in the rebuild; otherwise they should be flagged/excluded.

NGO/need "Read More" cards open as in-place modals via Angular click handlers, not distinct URLs — there is no crawlable `/ngodetails/pune-city/all-...` route to fetch individually (270 NGOs across 27 pages, 440+ needs across 37 pages, all loaded from Firestore). We have 10 full representative NGO cards and 12 full representative need cards with real names/descriptions/photos — enough to model the card + detail-modal components faithfully; the rest is treated as backend-driven mock data per Phase 2's data-layer requirement.

---

## `/` — Home ("Connecting Donors with NGOs")

In DOM order:

1. **Header/Nav** — Logo (`sevadeep-r-logo.png`), phone pill `+91-9175099256`, links: About Us, How It Works, Blog, NGO ▾ (NGO Login, NGO SignUp), Login (donor), **Sponsor A Meal** CTA.
2. **Hero (`gridbanner`)** — Image carousel + 3 quick-action buttons: **Search NGO**, **View NGO Needs**, **Donate**.
3. **Intro (`intro row`)** — Two paragraphs: what Sevadeep is/does (donor↔NGO matching, physical goods only, doorstep pickup in Pune, verified NGOs), and the org's origin (Relfor Foundation, Relfor Labs, Deepak Nathani, Narayanseva).
4. **"Sevadeep In Action"** — Two live-feed style columns: *Narayanseva (Food Distribution)* thank-you shoutouts, *Inkind Donations* thank-you shoutouts, each with "See More".
5. **"Numbers Speak!" stats** — 3 animated counters: NGOs Onboarded (1230), Total Donations (6546), Current Needs (1851).
6. **"Reviews that Inspire Us!" testimonials** — Google-review-style cards (reviewer name, city, time-ago, quote), e.g. Swati Deshpande (Pune), Sangita Desai (Goa).
7. **"Sevadeep In News" / Awards** — Masonry-style cards: *Sevasadan NGO Visit* (Relfor CSR + Rajya Sabha MP Medhatai Kulkarni), *Maha-Awas Abhiyan Puraskar 2020-21* (Govt. of Maharashtra, tribal housing, Ajit Pawar), *Heartwarming moments with Shri Anna Hazare* (Ralegan Siddhi, water conservation), *Act of Compassion award 2024*.
8. **"How Sevadeep Works" (Easy 4 Steps)** — Authenticate → Donate → Co-ordinate → Acknowledge & Spread Smiles (full copy captured).
9. **"The Mission Man: Deepak Nathani"** — Founder bio: Founder & CEO Relfor Labs, co-founder/former COO Cybage Software; bio paragraph + Relfor Foundation CSR project list (lake desilting, tribal housing, old-age-home/orphanage upgrades, rural school toilets).
10. **Footer** — "Let's Make A Difference" / Get In Touch links (About Us, How Sevadeep Works, Leadership, Sevadeep Brochure, FAQs), office address (14th floor, Sky One, Kalyani Nagar, Pune 411006), phone, email `contact@sevadeep.com`, social icons, copyright.

*(A hidden "Your NGO has registered successfully…" confirmation modal exists in the DOM globally but isn't part of the page content — it's a shared post-submit toast, not a home-page section.)*

Images: 27 (hero carousel frames, testimonial/award photos, founder photo, icons). See `/public/images/home/`.

---

## `/ngos` — NGO List

- Search bar (by name) + City dropdown (defaults "Pune") + Area dropdown + Category dropdown + Clear Search.
- Paginated grid, 10 NGOs/page × 27 pages. Each card: photo (or default lamp icon), name, area/city, description excerpt, "Read More" (opens modal).
- Full text captured for the 10 NGOs on page 1: Lift For Upliftment, Bhagyashali Bhavishya, Paalvia Foundation, Matimand Nivasi Vidyalay, Bharat Vikas Parishad, Dr Sams Health Assistant and Research Foundation, Bodhisattva, Good Luck Charitable Trust, Tejaswini Samajik Sanstha, Badlaav Social Reform Foundation.
- Full city list (400+ Indian cities) and Pune-area list (400+ localities) captured for the filter dropdowns — see `content/ngos.json`.
- Category list (17 values): All, Art & Culture, Animal Care, CSR, Childcare, Differently-Abled, Education, Environment, Healthcare, Hospitals & Blood Banks, Old Age, Rural, Skill Development, Tribal Development, Volunteer Org, Women Empowerment, Youth-Dev, Others.
- A "Select City And Category" modal gate can appear on load in some sessions.

Images: 10 (sample NGO photos + default icons).

---

## `/ngo-needs` — NGO Needs board

- Search bar ("Search By NGO Needs") + location filter + need-category filter (icon-labeled dropdowns).
- Paginated grid, 12 needs/page × 37 pages. Each card: NGO avatar icon, NGO name, description excerpt + "…Read More", **Need** (item type) + **Qty**, plus a second excerpt ("why they need it") + "…See All".
- 12 full sample cards captured: Compassion Charitable Trust (Electronics/Laptop, qty 4), Bidkar Foundation (Electronics/Laptop, qty 5), Sulabh Jivan Foundation (Vehicles, qty 1), Rising Star Foundation (Electronics/Laptop, qty 3), Solomon Memorial Trust (Educational Bags, qty 100), Welcare India Social Welfare (Oxygen cylinder, qty 5), Adivasi Adim Samajik Sanstha (Construction, qty 1), ReLife Foundation (Ambulance, qty 1), Sagar Seva Trust (Educational Notebooks, qty 250), Akshar Paaul (Water Purifier, qty 3), Arise Vishwa Society (Tree Guard, qty 10), Sarva Seva Sangh (Refrigerator, qty 1).

Images: 15.

---

## `/donation-bucket` — Donation Form

Single-screen form (not yet a multi-step cart on the live site): Mobile, Full Name, Location/City, Donation Category (dropdown), Donation Item Quantity, Donation Details (textarea), "Want to Donate to Specific NGO" checkbox, Upload Donation Item Image, **Confirm Donation** button.

*(The brief asks for a cart-like bucket with quantities/pickup-vs-dropoff/address/confirmation — the live site's current implementation is a single flat form. Rebuild should upgrade this into the richer multi-step flow described in Phase 4 while keeping the same underlying fields.)*

---

## `/blog` — Blog index

10 post preview cards (title, "By {author} | {date} | {category}", excerpt) + pagination (page 1 of 2 — a "What is Clutter?" post from Aug 2022 appears on page 1 too, outside the 10 sitemap.xml URLs; treat as a bonus/older post if you want full blog parity, otherwise the 10 sitemap posts are the required set).

Sitemap-listed posts (all crawled):
1. `donate-items-this-chrismas` — *(live page is empty — see note above; listing shows title "It's Time To Donate a Merry Christmas!", Dec 8 2020, category "Original")*
2. `donate-food` — "Join the SevaDeep Sponsor a Meal Program", Nov 19 2020, Original — full body captured.
3. `donate-your-old-stuff-this-diwali` — "Five Ways To Make Diwali Really Special", Nov 10 2020, Original — full body captured.
4. `donate-food-money-old-items` — "SevaDeep Monthly NGO Review | October 2020", Oct 22 2020, Original — full body captured.
5. `how-to-donate-old-items-to-charity` — "How I Donated to the NGO Near Me" by Maria J, Oct 5 2020, Original — full body captured.
6. `ngo-needs-in-pune` — "SevaDeep Monthly NGO Review | September 2020 | Current NGO Needs in Pune City", Sep 25 2020, Donations — full body captured.
7. `support-donate-to-old-age-homes` — "Supporting Old Age Homes", Sep 18 2020, Donations — full body captured.
8. `best-things-to-donate-to-orphanage` — *(live page is empty — see note above; listing shows title "What Are The Best Things To Donate To An Orphanage?", Sep 15 2020, Childcare & Education)*
9. `donate-to-people-in-need` — "Want to Donate to Individuals? SevaDeep is here for you!" by ADMIN, Aug 27 2020, Donations — full body captured.
10. `help-the-ngos-in-pune` — full body captured (see `content/blog_title_help-the-ngos-in-pune.json`).

Each post page template: Title → "BY {author} | {date} | {category}" → body copy → "Recent Comments (0 Comments)" → comment form (email not published notice, Comment textarea, Submit Comment).

---

## `/ngo-login`
Logo + tagline → "NGO Login" heading → 10-digit phone number input → reCAPTCHA ("I'm not a robot") → **Get OTP** → "Not registered yet?" → **NGO SIGNUP** / **ABOUT US** buttons.

## `/donor-login`
"Connecting Donors with NGO's / Know more about us" → quick actions (Search NGO / View NGO Needs / Donate) → sign-in options: **Google**, **Phone** → "By continuing you agree to our terms and conditions".

## `/ngo-registration`
Multi-field form: Name*, Email*, Mobile (Login Id)*, Alternate Mobile, State (dropdown), City (dropdown), City-Area (dropdown, "if area not available click here"), Address, Awards & Recognition, Description, Drop Locations (add multiple), Images upload, Gallery upload, Submit.

## `/volunteer-register`
"Join Our Sevadeep Family" — "We are looking for volunteers to help us expand our outreach across India" — How would you like to serve? (category dropdown), Area of Interest, Full Name*, Email Address*, Mobile (WhatsApp)*, Date of Birth*, Blood Group* (dropdown), Aadhar Card (+ more fields below fold).

## `/narayan-seva` — Sponsor a Meal
Banner graphic "Feed The Hungry, in their most desperate hour" (Narayan Seva / Sassoon Hospital khichadi program). Body copy: mission statement, 250 people fed daily at Sassoon Hospital, COVID laborer-camp distribution history. **Sponsor a meal for people** calculator: ₹100→4 meals, ₹500→20, ₹1000→40, ₹2000→80, ₹3000→120, ₹4000→160, "Other Amount" custom field, **Contribute** button.

## `/gallery`
3 tabs: **Narayanseva** (7 photos of food distribution), **Covid Initiative**, **Inkind Donations**. Masonry photo grid, no captions beyond tab grouping.

---

## Footer / global (all pages)
- Phone: `+91-9175099256` (tel: link, always visible pill in header).
- Email: `contact@sevadeep.com`.
- Office: 14th floor, Sky One, Kalyani Nagar, Pune 411006, MH, India.
- Social: Facebook `facebook.com/Sevadeep-2299903280247561`, LinkedIn `linkedin.com/company/sevadeep-non-profit`, Instagram `instagram.com/sevadeep.nonprofit`, X/Twitter `twitter.com/SevadeepNgos`.
- Nav: About Us (anchor), How It Works (anchor), Blog, NGO ▾ (Login/SignUp), Login (donor), Sponsor A Meal.

---

## Data files for Phase 2
- `/scraper/content/*.json` — per-page `{route, meta, sections[], forms[], links[], images[]}`.
- `/scraper/design-tokens.json` — computed fonts/colors/button styles for 6 key pages.
- `/scraper/screenshots/*_{1440,390}.png` — visual reference, 21 pages × 2 widths.
- `/public/images/<page>/*` — 100 downloaded images, zero missing (no `missing-images.md` needed).
- `/scraper/sitemap-data.json` — flat route/title/section-count index.
- `/scraper/all-links-discovered.json` — internal links seen during crawl (all resolved to already-visited routes; no orphan routes left uncrawled).

---

**Please review and confirm before I proceed to Phase 2 (tech stack scaffold) and Phase 3 (design system).** In particular:
1. OK to design around the real maroon/orange "diya flame" palette instead of `#1976d2` blue?
2. OK to treat the 2 empty-on-production blog posts as short pages reconstructed from their listing excerpt (rather than leaving them blank or dropping them)?
3. OK to upgrade `/donation-bucket` from its current single flat form into the richer multi-step cart flow the brief describes, while keeping the same field set?
