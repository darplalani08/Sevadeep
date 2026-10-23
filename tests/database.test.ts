// Data-layer tests against a real Postgres.
//
// PGlite is Postgres 18 compiled to WebAssembly, so the schema, the constraints, the arrays, the
// transactions and every query here are exercised by the real engine — not a mock and not SQLite.
// The same migration files run against Supabase.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

process.env.DATABASE_URL = "pglite://memory";

const { getSql, resetSql } = await import("../src/server/db/sql.ts");
const { applyMigrations } = await import("../src/server/db/migrate.ts");
const accounts = await import("../src/server/db/accounts.ts");
const applications = await import("../src/server/db/applications.ts");
const volunteers = await import("../src/server/db/volunteers.ts");
const opportunities = await import("../src/server/db/opportunities.ts");
const analytics = await import("../src/server/db/analytics.ts");

before(async () => {
  await applyMigrations(await getSql());
});

after(async () => {
  await resetSql();
});

const ADMIN_PASSWORD = "SevaDeep-Demo-2026!";

const applicant = (over: Partial<Parameters<typeof applications.createApplication>[0]> = {}) => ({
  studentName: "TEST Asha Patil",
  guardianName: "TEST Rekha Patil",
  contactNumber: "9876543210",
  email: "asha.test@example.com",
  studentAge: 12,
  studentClass: "Class 6-8",
  city: "Pune",
  supportNeeded: ["After-School Tuition", "Study Material & Books"],
  notes: "Demonstration record.",
  ...over,
});

describe("migrations and seed", () => {
  it("creates every table and seeds the demo opportunity catalogue", async () => {
    const sql = await getSql();
    const tables = await sql.query<{ tablename: string }>(
      `select tablename from pg_tables where schemaname = 'public' order by 1`
    );
    const names = tables.map((t) => t.tablename);
    for (const expected of [
      "accounts", "applications", "application_events", "login_attempts",
      "opportunities", "ref_counters", "sessions", "settings",
      "volunteer_matches", "volunteers",
    ]) {
      assert.ok(names.includes(expected), `missing table ${expected}`);
    }

    const list = await opportunities.listOpportunities();
    assert.equal(list.length, 9);
    assert.ok(list.every((o) => o.isDemo), "seeded roles must be flagged as demonstrations");
  });

  it("enables row level security on every table", async () => {
    const sql = await getSql();
    const rows = await sql.query<{ relname: string }>(
      `select relname from pg_class
        where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`
    );
    assert.deepEqual(rows.map((r) => r.relname).filter((n) => n !== "_migrations"), []);
  });

  it("is idempotent", async () => {
    assert.deepEqual(await applyMigrations(await getSql()), []);
  });
});

describe("accounts", () => {
  it("rejects a weak password and a malformed username", async () => {
    const weak = await accounts.createAccount({
      username: "admin", password: "password", role: "admin", displayName: "A",
    });
    assert.equal(weak.ok, false);

    const bad = await accounts.createAccount({
      username: "no", password: ADMIN_PASSWORD, role: "admin", displayName: "Admin",
    });
    assert.equal(bad.ok, false);
  });

  it("creates accounts and enforces unique usernames across roles", async () => {
    const admin = await accounts.createAccount({
      username: "SevaAdmin", password: ADMIN_PASSWORD, role: "admin", displayName: "Demo Administrator",
    });
    assert.equal(admin.ok, true);
    if (admin.ok) assert.equal(admin.account.username, "sevaadmin", "usernames are stored lowercase");

    const clash = await accounts.createAccount({
      username: "sevaadmin", password: ADMIN_PASSWORD, role: "donor", displayName: "Someone Else",
    });
    assert.equal(clash.ok, false);
    if (!clash.ok) assert.match(clash.reason, /already taken/i);

    const donor = await accounts.createAccount({
      username: "donor.one", password: "Donor-Pass-2026!", role: "donor", displayName: "TEST Donor",
    });
    assert.equal(donor.ok, true);
  });

  it("authenticates case-insensitively and rejects everything else", async () => {
    assert.ok(await accounts.authenticate("SEVAADMIN", ADMIN_PASSWORD));
    assert.equal(await accounts.authenticate("sevaadmin", "wrong-password"), null);
    assert.equal(await accounts.authenticate("nobody", ADMIN_PASSWORD), null);
  });

  it("refuses an account whose role does not match the login surface", async () => {
    // A donor must not be able to sign in at the administrator login.
    assert.equal(await accounts.authenticate("donor.one", "Donor-Pass-2026!", "admin"), null);
    assert.ok(await accounts.authenticate("donor.one", "Donor-Pass-2026!", "donor"));
  });

  it("issues sessions that resolve, expire and can be destroyed", async () => {
    const account = await accounts.findAccountByUsername("sevaadmin");
    assert.ok(account);
    const session = await accounts.createSession(account.id);

    const resolved = await accounts.resolveSession(session.token);
    assert.equal(resolved?.username, "sevaadmin");
    assert.equal(await accounts.resolveSession("not-a-real-token"), null);

    await accounts.destroySession(session.token);
    assert.equal(await accounts.resolveSession(session.token), null, "a destroyed session is dead");
  });

  it("rate limits after repeated failures and clears on success", async () => {
    const scope = "test-scope";
    for (let i = 0; i < 8; i += 1) await accounts.recordLoginFailure(scope);
    assert.equal(await accounts.isRateLimited(scope), true);
    await accounts.clearLoginFailures(scope);
    assert.equal(await accounts.isRateLimited(scope), false);
  });
});

describe("applications", () => {
  const state = { reference: "", code: "" };

  it("stores an application with a sequential reference and a tracking code", async () => {
    const result = await applications.createApplication(applicant());
    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.match(result.reference, /^SD-\d{4}-000001$/);
    assert.match(result.trackingCode, /^[A-HJ-NP-Z2-9]{6}$/);
    assert.equal(result.status, "Submitted");
    state.reference = result.reference;
    state.code = result.trackingCode;

    const second = await applications.createApplication(
      applicant({ studentName: "TEST Rohit Patil", contactNumber: "9811111111" })
    );
    assert.equal(second.ok, true);
    if (second.ok) assert.match(second.reference, /^SD-\d{4}-000002$/);
  });

  it("rejects a row the check constraints forbid", async () => {
    await assert.rejects(
      () => applications.createApplication(applicant({ contactNumber: "1234567890" })),
      /check constraint/i,
      "the database must refuse an invalid phone number even if a caller skips validation"
    );
  });

  it("collapses an accidental duplicate", async () => {
    const again = await applications.createApplication(applicant());
    assert.equal(again.ok, false);
    if (!again.ok) assert.equal(again.reference, state.reference);
  });

  it("survives three concurrent identical submissions without duplicating", async () => {
    const payload = applicant({ studentName: "TEST Concurrent", contactNumber: "9822222222" });
    const results = await Promise.all([
      applications.createApplication(payload),
      applications.createApplication(payload),
      applications.createApplication(payload),
    ]);
    assert.equal(results.filter((r) => r.ok).length, 1, "exactly one wins");
    assert.equal(results.filter((r) => !r.ok).length, 2);
  });

  it("discloses status and dates — and nothing identifying — to a correct reference and code", async () => {
    const status = await applications.getPublicStatus(state.reference, state.code);
    assert.ok(status);
    assert.equal(status.status, "Submitted");
    assert.equal(status.studentFirstName, "TEST");
    assert.equal(status.history.length, 1);

    const serialised = JSON.stringify(status);
    for (const secret of ["9876543210", "asha.test@example.com", "Rekha Patil", "Demonstration record"]) {
      assert.ok(!serialised.includes(secret), `public tracking leaked: ${secret}`);
    }
  });

  it("refuses a wrong code, a wrong reference and a code replayed from another application", async () => {
    assert.equal(await applications.getPublicStatus(state.reference, "ZZZZZZ"), null);
    assert.equal(await applications.getPublicStatus("SD-2026-999999", state.code), null);
    assert.equal(await applications.getPublicStatus("SD-2026-000002", state.code), null);
  });

  it("records a status change with its actor and shows it on the tracking view", async () => {
    const updated = await applications.updateApplicationStatus(
      state.reference, "Under Review", "sevaadmin", "Checking with partner NGO."
    );
    assert.equal(updated.ok, true);

    const events = await applications.getApplicationEvents(
      updated.ok ? updated.application.id : 0
    );
    assert.equal(events.at(-1)?.status, "Under Review");
    assert.equal(events.at(-1)?.note, "Checking with partner NGO.");

    const tracked = await applications.getPublicStatus(state.reference, state.code);
    assert.equal(tracked?.status, "Under Review");
    assert.equal(tracked?.history.length, 2);
  });

  it("reports a no-op rather than writing a duplicate history entry", async () => {
    const repeat = await applications.updateApplicationStatus(
      state.reference, "Under Review", "sevaadmin"
    );
    assert.equal(repeat.ok, false);
    if (!repeat.ok) assert.equal(repeat.code, "unchanged");

    const tracked = await applications.getPublicStatus(state.reference, state.code);
    assert.equal(tracked?.history.length, 2);
  });

  it("404s an unknown reference and refuses an invalid status", async () => {
    const missing = await applications.updateApplicationStatus("SD-2026-999999", "Approved", "sevaadmin");
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.code, "not_found");

    const bad = await applications.updateApplicationStatus(
      state.reference, "Deleted" as never, "sevaadmin"
    );
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.equal(bad.code, "invalid_status");
  });

  it("searches and filters", async () => {
    const byReference = await applications.listApplications({ search: state.reference });
    assert.equal(byReference.total, 1);

    const byName = await applications.listApplications({ search: "rohit" });
    assert.equal(byName.total, 1);

    const byStatus = await applications.listApplications({ status: "Under Review" });
    assert.equal(byStatus.total, 1);

    const none = await applications.listApplications({ search: "zzzzzzzz" });
    assert.equal(none.total, 0);
    assert.deepEqual(none.items, []);
  });
});

describe("volunteers and matching", () => {
  const state = { reference: "" };

  it("stores a registration together with its ranked, explained matches", async () => {
    const result = await volunteers.createVolunteer({
      fullName: "TEST Nikhil Joshi",
      email: "nikhil.test@example.com",
      mobile: "9123456780",
      dateOfBirth: "1996-04-12",
      bloodGroup: "O+",
      aadhar: "123456789012",
      category: "Field Visits & Pickups",
      areaOfInterest: "Kothrud",
      skills: ["Driving", "Logistics & Sorting"],
      interests: ["Donation Drives"],
      availability: ["Weekends"],
      preferredActivities: ["Donation Pickup & Field Visits"],
      hoursPerWeek: 6,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.reference, /^SD-VOL-\d{4}-000001$/);
    state.reference = result.reference;

    assert.equal(result.matches[0].opportunityId, "donation-pickup");
    for (const match of result.matches) {
      assert.ok(match.score >= 0 && match.score <= 100);
      assert.ok(match.rationale.length > 0);
    }
  });

  it("never stores the full Aadhar number", async () => {
    const { items } = await volunteers.listVolunteers();
    assert.equal(items[0].idProofMasked, "XXXX-XXXX-9012");
    assert.ok(!JSON.stringify(items).includes("123456789012"));

    const sql = await getSql();
    const raw = await sql.query(`select * from public.volunteers`);
    assert.ok(!JSON.stringify(raw).includes("123456789012"), "not even in the raw row");
  });

  it("persists the scores the volunteer was shown", async () => {
    const { items } = await volunteers.listVolunteers();
    assert.ok(items[0].matches.length > 0);
    assert.equal(items[0].matches[0].opportunityId, "donation-pickup");
    assert.ok(items[0].matches[0].rationale.length > 0);
  });

  it("filters by skill, availability and search term", async () => {
    assert.equal((await volunteers.listVolunteers({ skill: "Driving" })).total, 1);
    assert.equal((await volunteers.listVolunteers({ skill: "Accounting" })).total, 0);
    assert.equal((await volunteers.listVolunteers({ availability: "Weekends" })).total, 1);
    assert.equal((await volunteers.listVolunteers({ availability: "Weekday Mornings" })).total, 0);
    assert.equal((await volunteers.listVolunteers({ search: "nikhil" })).total, 1);
  });

  it("moves a volunteer through the review workflow", async () => {
    const updated = await volunteers.updateVolunteerStatus(state.reference, "Under Review");
    assert.equal(updated?.status, "Under Review");
    const approved = await volunteers.updateVolunteerStatus(state.reference, "Approved");
    assert.equal(approved?.status, "Approved");
    assert.equal(await volunteers.updateVolunteerStatus("SD-VOL-2026-999999", "Approved"), null);
  });

  it("collapses a duplicate registration", async () => {
    const payload = {
      fullName: "TEST Dup", email: "dup@example.com", mobile: "9123456789",
      skills: ["Driving"], interests: ["Donation Drives"], availability: ["Weekends"],
    };
    assert.equal((await volunteers.createVolunteer(payload)).ok, true);
    const again = await volunteers.createVolunteer(payload);
    assert.equal(again.ok, false);
  });

  it("reads and writes configurable weights", async () => {
    await volunteers.setMatchWeights({ skill: 1, interest: 0, availability: 0, preferenceBoost: 0 });
    assert.deepEqual(await volunteers.getMatchWeights(), {
      skill: 1, interest: 0, availability: 0, preferenceBoost: 0,
    });
    await volunteers.setMatchWeights({ skill: 0.5, interest: 0.3, availability: 0.2, preferenceBoost: 10 });
  });
});

describe("opportunity catalogue", () => {
  it("creates, updates and deactivates", async () => {
    const created = await opportunities.upsertOpportunity({
      id: "library-setup",
      title: "TEST Library Setup",
      summary: "Catalogue and shelve donated books.",
      requiredSkills: ["Data Entry", "Logistics & Sorting"],
      interestTags: ["Child Education"],
      availabilityNeeds: ["Weekends"],
      location: "Pune",
      isDemo: false,
    });
    assert.equal(created?.isDemo, false);

    const renamed = await opportunities.upsertOpportunity({
      ...created!, title: "TEST Library Setup v2", requiredSkills: ["Data Entry"],
    });
    assert.equal(renamed?.title, "TEST Library Setup v2");

    assert.equal(await opportunities.setOpportunityActive("library-setup", false), true);
    const active = await opportunities.listOpportunities();
    assert.ok(!active.some((o) => o.id === "library-setup"));
    assert.ok(
      (await opportunities.listOpportunities({ includeInactive: true }))
        .some((o) => o.id === "library-setup")
    );
    assert.equal(await opportunities.setOpportunityActive("does-not-exist", false), false);
  });
});

describe("dashboard analytics", () => {
  it("counts from the real tables and zero-fills the trend", async () => {
    const overview = await analytics.getOverview();

    const { total } = await applications.listApplications({ limit: 200 });
    assert.equal(overview.applications.total, total);
    assert.equal(
      Object.values(overview.applications.byStatus).reduce((a, b) => a + b, 0),
      total,
      "status counts must add up to the real total"
    );

    const vols = await volunteers.listVolunteers({ limit: 200 });
    assert.equal(overview.volunteers.total, vols.total);

    assert.equal(overview.charts.applicationTrend.length, 14);
    assert.equal(
      overview.charts.applicationTrend.reduce((sum, p) => sum + p.value, 0),
      total,
      "the trend must add up to the real total"
    );

    const driving = overview.charts.volunteerSkills.find((s) => s.label === "Driving");
    assert.ok(driving && driving.value >= 1, "skill histogram comes from the array column");

    assert.ok(overview.opportunities.total >= 9);
    assert.ok(overview.opportunities.active < overview.opportunities.total, "one was deactivated");
    assert.ok(overview.version.length > 0);
  });
});
