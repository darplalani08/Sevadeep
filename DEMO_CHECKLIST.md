# SevaDeep — demonstration checklist

One page to run the demo from. The reasoning behind every feature is in
[`SEVADEEP_TECHNICAL_DOCUMENTATION.md`](./SEVADEEP_TECHNICAL_DOCUMENTATION.md); §12 there is the
same walkthrough with a script and timings.

## Before the room

- [ ] `cd /Users/darplalani/Desktop/Sevadeep && npm run dev` — leave it running
- [ ] `http://localhost:3000` loads the normal SevaDeep home page
- [ ] Administrator account exists. If it does not, open `http://localhost:3000/admin/setup` and
      create it (12+ characters, upper + lower + digit + symbol). That screen closes permanently
      afterwards.
- [ ] Two browser windows side by side — **A** = visitor, **B** = administrator on `/admin`
- [ ] Optional but effective: `npm test` in a spare terminal, ready to run at the end

`next dev` prints `ExperimentalWarning: SQLite is an experimental feature`. That is expected — it is
Node's own notice about the built-in SQLite module.

## Routes

| | URL |
|---|---|
| Home (original) | `http://localhost:3000` |
| Student enrolment | `http://localhost:3000/enroll` |
| Track application | `http://localhost:3000/track` |
| Volunteer registration | `http://localhost:3000/volunteer-register` |
| Admin login | `http://localhost:3000/admin/login` |
| Dashboard | `http://localhost:3000/admin` |
| First-run setup | `http://localhost:3000/admin/setup` |

In the UI: header → **Students** for enrolment and tracking; footer → **Staff Login** for the
dashboard. The chatbot is the bubble at the bottom-right of every page.

## The run

1. [ ] **A** — home page. Scroll it, open **NGOs** and **NGO Needs**. *Nothing here changed.*
2. [ ] **A** — chatbot: *"What is SevaDeep?"*, then *"how do I enrol a student?"*, then
       *"do you sell second hand cars"* (it declines instead of inventing). **Clear conversation**.
       Click the **Open the enrolment form** link.
3. [ ] **A** — `/enroll`: submit empty first to show validation. Then
       `TEST Asha Patil` / `TEST Rekha Patil` / `9876543210` / age 12 / Class 6-8 / Pune /
       **After-School Tuition** / tick consent → **Submit**.
4. [ ] **A** — read out the reference (`SD-2026-000001`) and the 6-character tracking code.
       *Shown once; stored only as a salted hash.*
5. [ ] **B** — `/admin`, **do not reload**. Within ~4 s: *Total applications* 0 → 1,
       *Submitted* 0 → 1, the empty chart becomes a real one.
6. [ ] **B** — **Applications** tab: the row is there, with submitted and updated times.
7. [ ] **A** — `/track`: wrong code → refused. Correct code → **Submitted**, dates, status history.
       *No phone number or guardian name on this page, deliberately.*
8. [ ] **B** — **Open** the application → add a note → **Set Under Review**.
9. [ ] **A** — **without touching window A**: status becomes **Under Review**, the guidance text
       changes, a second history entry appears. Then **Set Approved** in B and watch A follow.
10. [ ] **A** — `/volunteer-register`: original fields intact; tick **Driving**,
        **Logistics & Sorting**, **Donation Drives**, **Weekends**. The live preview reorders as you
        tick and puts **Donation Sorting & Inventory** on top at **75%** — one of that role's two
        required skills plus its only interest tag beats **Donation Pickup & Field Visits** at 68%,
        which also wants Event Management.
11. [ ] **A** — now tick **Donation Pickup & Field Visits** under *Activities you'd particularly
        like*: the 10-point preference boost reorders the preview live. **Submit**. The top match
        shows its percentage, three component bars, the matched skills and a sentence explaining
        why, including the preference. *Registering is not acceptance; the roles are labelled
        **Demo opportunity**.*
12. [ ] **B** — **Volunteers** tab: the registration appears without a reload, with the same scores.
        **Show details** → Aadhar shows as `XXXX-XXXX-9012`; the full number is never stored.
13. [ ] **B** — **Overview** tab: *Volunteer registrations* is 1, the skill chart has bars. Open
        **View as table** under a chart to show the numbers are real database reads.
14. [ ] **B** — **Sign out**, then type `/admin` in the address bar → redirected to login.
        *The APIs return 401 on their own, independently of that redirect.*
15. [ ] Optional — `npm test` (67 unit tests). Mention `npm run test:api` (51 integration tests,
        including persistence across a server restart) and `npm run test:browser` (the two-window
        test, automated).

## If something goes wrong

| Symptom | Fix |
|---|---|
| Nothing loads | The dev server stopped. `npm run dev` again. |
| `/admin` keeps bouncing to login | The 8-hour session expired. Sign in again. |
| `/admin/setup` says setup is complete | An account already exists — use `/admin/login`. |
| You need a clean slate | Stop the server, delete `data/sevadeep.db*`, restart. The schema and the opportunity catalogue are recreated and `/admin/setup` opens again. **This deletes every record.** |
| Tests complain another dev server is running | Next 16 allows one `next dev` per directory. Stop yours, run the tests, start it again. |

## Three things worth saying out loud

- **Nothing is mocked.** Every dashboard number is a `COUNT`/`GROUP BY` over SQLite. Before this
  work, every form on the site returned a random reference and stored nothing.
- **It survives a restart** — records, status history and the reference counter. There is an
  automated test that stops the server, starts it again and checks.
- **It is polling, not push.** Four-second intervals. Up to ~4 seconds, not instant — and it is
  described that way everywhere.
