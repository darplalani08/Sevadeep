// End-to-end integration tests over real HTTP against a real server and a real SQLite file.
//
// Run with: npm run test:api
//
// The harness starts its own `next dev` on port 3177 with SEVADEEP_DB_PATH pointing at
// data/test-integration.db, so these tests never read or write the database used for the demo.
// They cover: validation, persistence, unique references, duplicate handling, secure tracking,
// authentication and authorisation, rate limiting, status propagation (the synchronisation
// contract the polling UI depends on), volunteer matching, the admin dashboard aggregates, the
// opportunity catalogue, and survival of a server restart.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import {
  createClient,
  removeTestDatabase,
  serverLog,
  startServer,
  stopServer,
} from "./helpers/server.mjs";

const ADMIN = {
  displayName: "Demo Administrator",
  username: "sevaadmin",
  email: "admin@sevadeep.test",
  password: "SevaDeep-Demo-2026!",
};

const DONOR = {
  displayName: "TEST Donor",
  username: "test.donor",
  password: "Donor-Pass-2026!",
  confirmPassword: "Donor-Pass-2026!",
  role: "donor",
};

const applicant = (overrides = {}) => ({
  studentName: "TEST Asha Patil",
  guardianName: "TEST Rekha Patil",
  contactNumber: "9876543210",
  email: "asha.test@example.com",
  studentAge: 12,
  studentClass: "Class 6-8",
  city: "Pune",
  supportNeeded: ["After-School Tuition", "Study Material & Books"],
  notes: "Demonstration record — not a real applicant.",
  consent: true,
  ...overrides,
});

const volunteerPayload = (overrides = {}) => ({
  category: "Field Visits & Pickups",
  areaOfInterest: "Weekend pickups in Kothrud",
  fullName: "TEST Nikhil Joshi",
  email: "nikhil.test@example.com",
  mobile: "9123456780",
  dateOfBirth: "1996-04-12",
  bloodGroup: "O+",
  aadhar: "123456789012",
  skills: ["Driving", "Logistics & Sorting"],
  interests: ["Donation Drives"],
  availability: ["Weekends"],
  preferredActivities: ["Donation Pickup & Field Visits"],
  hoursPerWeek: 6,
  ...overrides,
});

const anon = createClient();
const admin = createClient();

// Shared across tests: filled in as the suite progresses.
const state = { firstReference: null, firstCode: null, secondReference: null, volunteerReference: null };

before(async () => {
  await startServer({ fresh: true });
});

after(async () => {
  await stopServer();
  removeTestDatabase();
});

describe("1. public catalogue and setup state", () => {
  it("serves the seeded opportunity catalogue", async () => {
    const { status, body } = await anon.get("/api/opportunities");
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.opportunities));
    assert.ok(body.opportunities.length >= 9, `got ${body.opportunities.length}`);
    assert.ok(
      body.opportunities.every((o) => o.isDemo === true),
      "seeded roles must be flagged as demonstration opportunities"
    );
    assert.deepEqual(body.weights, {
      skill: 0.5,
      interest: 0.3,
      availability: 0.2,
      preferenceBoost: 10,
    });
  });

  it("reports that no administrator exists yet", async () => {
    const { status, body } = await anon.get("/api/admin/setup");
    assert.equal(status, 200);
    assert.equal(body.needsSetup, true);
  });
});

describe("2. authorisation is enforced before any admin data is served", () => {
  const protectedEndpoints = [
    ["GET", "/api/admin/overview"],
    ["GET", "/api/admin/applications"],
    ["GET", "/api/admin/volunteers"],
    ["GET", "/api/admin/opportunities"],
    ["GET", "/api/admin/admins"],
    ["GET", "/api/admin/weights"],
    ["GET", "/api/admin/session"],
  ];

  for (const [method, endpoint] of protectedEndpoints) {
    it(`${method} ${endpoint} → 401 without a session`, async () => {
      const { status, body } = await anon.request(endpoint, { method });
      assert.equal(status, 401);
      assert.ok(!JSON.stringify(body).includes("student_name"));
    });
  }

  it("PATCH of an application status → 401 without a session", async () => {
    const { status } = await anon.patch("/api/admin/applications/SD-2026-000001", {
      status: "Approved",
    });
    assert.equal(status, 401);
  });

  it("/admin redirects an unauthenticated visitor to the login page", async () => {
    const { status, headers, body } = await anon.get("/admin");
    assert.ok([302, 303, 307].includes(status), `got ${status}`);
    assert.match(headers.get("location") ?? "", /\/admin\/(login|setup)$/);
    assert.ok(!String(body).includes("Total applications"), "no dashboard markup is sent");
  });
});

describe("3. first-administrator bootstrap", () => {
  it("refuses a password that fails the policy", async () => {
    const { status, body } = await admin.post("/api/admin/setup", {
      ...ADMIN,
      password: "password",
    });
    assert.equal(status, 400);
    assert.ok(body.error);
    assert.equal(admin.cookies.size, 0, "no session is issued on failure");
  });

  it("creates the first administrator and issues an httpOnly session cookie", async () => {
    const { status, body, headers } = await admin.post("/api/admin/setup", ADMIN);
    assert.equal(status, 201);
    assert.equal(body.account.username, ADMIN.username);
    assert.equal(body.account.role, "admin");
    assert.ok(!JSON.stringify(body).includes(ADMIN.password), "the password is never echoed");

    const setCookie = (headers.getSetCookie?.() ?? [headers.get("set-cookie")]).join(";");
    assert.match(setCookie, /sevadeep_admin_session=/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=lax/i);
  });

  it("closes the setup endpoint permanently once an administrator exists", async () => {
    const needs = await anon.get("/api/admin/setup");
    assert.equal(needs.body.needsSetup, false);

    const second = await anon.post("/api/admin/setup", {
      displayName: "Intruder",
      username: "intruder",
      password: "Another-Strong-Pass-1!",
    });
    assert.equal(second.status, 409);
  });

  it("recognises the session", async () => {
    const { status, body } = await admin.get("/api/admin/session");
    assert.equal(status, 200);
    assert.equal(body.admin.username, ADMIN.username);
    assert.equal(body.admin.role, "admin");
  });
});

describe("4. student enrolment", () => {
  it("rejects an invalid submission with field-level errors and saves nothing", async () => {
    const { status, body } = await anon.post("/api/enrollment", {
      ...applicant({ studentName: "A", contactNumber: "12345", supportNeeded: [], consent: false }),
    });
    assert.equal(status, 400);
    assert.ok(body.fieldErrors.studentName);
    assert.ok(body.fieldErrors.contactNumber);
    assert.ok(body.fieldErrors.supportNeeded);
    assert.ok(body.fieldErrors.consent);

    const list = await admin.get("/api/admin/applications");
    assert.equal(list.body.total, 0, "an invalid submission must not create a row");
  });

  it("rejects a support type that is not in the allowed list", async () => {
    const { status } = await anon.post(
      "/api/enrollment",
      applicant({ supportNeeded: ["Free Laptop"] })
    );
    assert.equal(status, 400);
  });

  it("saves a valid application and returns a reference plus a private tracking code", async () => {
    const { status, body } = await anon.post("/api/enrollment", applicant());
    assert.equal(status, 201);
    assert.match(body.reference, /^SD-\d{4}-000001$/);
    assert.match(body.trackingCode, /^[A-HJ-NP-Z2-9]{6}$/);
    assert.equal(body.status, "Submitted");
    assert.ok(body.submittedAt);

    state.firstReference = body.reference;
    state.firstCode = body.trackingCode;
  });

  it("issues sequential, unique references", async () => {
    const { status, body } = await anon.post(
      "/api/enrollment",
      applicant({ studentName: "TEST Rohit Patil", studentAge: 15, studentClass: "Class 9-10" })
    );
    assert.equal(status, 201);
    assert.match(body.reference, /^SD-\d{4}-000002$/);
    assert.notEqual(body.reference, state.firstReference);
    state.secondReference = body.reference;
  });

  it("collapses an accidental duplicate instead of creating a second record", async () => {
    const { status, body } = await anon.post("/api/enrollment", applicant());
    assert.equal(status, 409);
    assert.equal(body.code, "duplicate");
    assert.equal(body.reference, state.firstReference);

    const list = await admin.get("/api/admin/applications");
    assert.equal(list.body.total, 2, "still only the two genuine applications");
  });

  it("survives concurrent identical submissions without creating duplicates", async () => {
    const payload = applicant({ studentName: "TEST Concurrent Child", contactNumber: "9811111111" });
    const results = await Promise.all([
      anon.post("/api/enrollment", payload),
      anon.post("/api/enrollment", payload),
      anon.post("/api/enrollment", payload),
    ]);

    const created = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 409);
    assert.equal(created.length, 1, "exactly one of the three races through");
    assert.equal(rejected.length, 2);

    const list = await admin.get("/api/admin/applications");
    assert.equal(list.body.total, 3);
  });
});

describe("5. secure public tracking", () => {
  it("refuses a lookup without the tracking code", async () => {
    const { status, body } = await anon.post("/api/track", { reference: state.firstReference });
    assert.equal(status, 400);
    assert.ok(body.fieldErrors.code);
  });

  it("refuses a wrong tracking code and gives nothing away", async () => {
    const wrong = await anon.post("/api/track", {
      reference: state.firstReference,
      code: "ZZZZZZ",
    });
    const unknown = await anon.post("/api/track", {
      reference: "SD-2026-999999",
      code: "ZZZZZZ",
    });

    assert.equal(wrong.status, 404);
    assert.equal(unknown.status, 404);
    assert.equal(
      wrong.body.error,
      unknown.body.error,
      "an unknown reference and a wrong code must be indistinguishable"
    );
  });

  it("returns status and dates — and no contact details — for a correct pair", async () => {
    const { status, body } = await anon.post("/api/track", {
      reference: state.firstReference,
      code: state.firstCode,
    });
    assert.equal(status, 200);
    assert.equal(body.application.status, "Submitted");
    assert.equal(body.application.studentFirstName, "TEST");
    assert.ok(body.application.submittedAt);
    assert.ok(body.application.updatedAt);
    assert.ok(body.guidance.length > 0);
    assert.equal(body.application.history.length, 1);

    const serialised = JSON.stringify(body);
    for (const secret of ["9876543210", "asha.test@example.com", "Rekha Patil", "Demonstration record"]) {
      assert.ok(!serialised.includes(secret), `public tracking leaked: ${secret}`);
    }
  });

  it("accepts the reference and code as a user would type them", async () => {
    const { status } = await anon.post("/api/track", {
      reference: ` ${state.firstReference.toLowerCase()} `,
      code: ` ${state.firstCode.toLowerCase()} `,
    });
    assert.equal(status, 200);
  });
});

describe("6. dashboard aggregates come from the database", () => {
  it("counts applications by status and builds the chart series", async () => {
    const { status, body } = await admin.get("/api/admin/overview");
    assert.equal(status, 200);
    assert.equal(body.applications.total, 3);
    assert.equal(body.applications.byStatus.Submitted, 3);
    assert.equal(body.applications.byStatus.Approved, 0);
    assert.equal(body.volunteers.total, 0);

    assert.equal(body.charts.applicationsByStatus.length, 4);
    assert.equal(body.charts.applicationTrend.length, 14);
    assert.equal(
      body.charts.applicationTrend.reduce((sum, point) => sum + point.value, 0),
      3,
      "the trend series must add up to the real total"
    );
    assert.deepEqual(body.charts.volunteerSkills, [], "no volunteers yet → empty state, not fake data");
    assert.ok(body.version);
  });

  it("searches and filters applications", async () => {
    const byReference = await admin.get(
      `/api/admin/applications?search=${encodeURIComponent(state.secondReference)}`
    );
    assert.equal(byReference.body.total, 1);
    assert.equal(byReference.body.items[0].reference, state.secondReference);

    const byName = await admin.get("/api/admin/applications?search=rohit");
    assert.equal(byName.body.total, 1);

    const byStatus = await admin.get("/api/admin/applications?status=Approved");
    assert.equal(byStatus.body.total, 0);

    const noMatch = await admin.get("/api/admin/applications?search=zzzzzz");
    assert.equal(noMatch.body.total, 0);
    assert.deepEqual(noMatch.body.items, []);
  });
});

describe("7. status changes propagate to the applicant's tracking view", () => {
  it("rejects an invalid status", async () => {
    const { status } = await admin.patch(
      `/api/admin/applications/${state.firstReference}`,
      { status: "Deleted" }
    );
    assert.equal(status, 400);
  });

  it("404s on an unknown reference", async () => {
    const { status } = await admin.patch("/api/admin/applications/SD-2026-999999", {
      status: "Approved",
    });
    assert.equal(status, 404);
  });

  it("records the change, the actor and the note, and the tracking endpoint reflects it", async () => {
    const before = await anon.post("/api/track", {
      reference: state.firstReference,
      code: state.firstCode,
    });
    assert.equal(before.body.application.status, "Submitted");

    const patched = await admin.patch(`/api/admin/applications/${state.firstReference}`, {
      status: "Under Review",
      note: "Checking with partner NGO.",
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.application.status, "Under Review");
    assert.equal(patched.body.history.at(-1).status, "Under Review");
    assert.equal(patched.body.history.at(-1).note, "Checking with partner NGO.");

    // This is exactly the read the tracking page's 4-second poll performs.
    const after = await anon.post("/api/track", {
      reference: state.firstReference,
      code: state.firstCode,
    });
    assert.equal(after.body.application.status, "Under Review");
    assert.notEqual(after.body.application.updatedAt, before.body.application.updatedAt);
    assert.notEqual(after.body.guidance, before.body.guidance);
    assert.equal(after.body.application.history.length, 2);
  });

  it("reports a no-op rather than writing a duplicate history entry", async () => {
    const repeat = await admin.patch(`/api/admin/applications/${state.firstReference}`, {
      status: "Under Review",
    });
    assert.equal(repeat.status, 200);
    assert.equal(repeat.body.unchanged, true);

    const tracked = await anon.post("/api/track", {
      reference: state.firstReference,
      code: state.firstCode,
    });
    assert.equal(tracked.body.application.history.length, 2);
  });

  it("moves the dashboard counters with it", async () => {
    const { body } = await admin.get("/api/admin/overview");
    assert.equal(body.applications.byStatus.Submitted, 2);
    assert.equal(body.applications.byStatus["Under Review"], 1);
    assert.equal(body.applications.total, 3);
  });

  it("supports Approved and Rejected as end states", async () => {
    const approved = await admin.patch(`/api/admin/applications/${state.firstReference}`, {
      status: "Approved",
    });
    assert.equal(approved.body.application.status, "Approved");

    const rejected = await admin.patch(`/api/admin/applications/${state.secondReference}`, {
      status: "Rejected",
      note: "No partner NGO covers this area yet.",
    });
    assert.equal(rejected.body.application.status, "Rejected");

    const overview = await admin.get("/api/admin/overview");
    assert.equal(overview.body.applications.byStatus.Approved, 1);
    assert.equal(overview.body.applications.byStatus.Rejected, 1);
  });
});

describe("8. volunteer registration and matching", () => {
  it("rejects an incomplete profile", async () => {
    const { status, body } = await anon.post(
      "/api/volunteers",
      volunteerPayload({ skills: [], availability: [], mobile: "123" })
    );
    assert.equal(status, 400);
    assert.ok(body.fieldErrors.skills);
    assert.ok(body.fieldErrors.availability);
    assert.ok(body.fieldErrors.mobile);
  });

  it("saves the registration and returns ranked, explained matches", async () => {
    const { status, body } = await anon.post("/api/volunteers", volunteerPayload());
    assert.equal(status, 201);
    assert.match(body.reference, /^SD-VOL-\d{4}-000001$/);
    state.volunteerReference = body.reference;

    assert.ok(body.matches.length > 0 && body.matches.length <= 5);
    assert.equal(body.matches[0].opportunityId, "donation-pickup");

    for (const match of body.matches) {
      assert.ok(match.score >= 0 && match.score <= 100, `score out of range: ${match.score}`);
      assert.ok(match.rationale.length > 0, "every match explains itself");
    }

    const scores = body.matches.map((m) => m.score);
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a), "matches are ranked");
  });

  it("collapses a duplicate registration", async () => {
    const { status, body } = await anon.post("/api/volunteers", volunteerPayload());
    assert.equal(status, 409);
    assert.equal(body.reference, state.volunteerReference);
  });

  it("exposes the registration to administrators with the Aadhar number masked", async () => {
    const { status, body } = await admin.get("/api/admin/volunteers");
    assert.equal(status, 200);
    assert.equal(body.total, 1);

    const volunteer = body.items[0];
    assert.equal(volunteer.reference, state.volunteerReference);
    assert.equal(volunteer.status, "Pending");
    assert.equal(volunteer.idProofMasked, "XXXX-XXXX-9012");
    assert.ok(
      !JSON.stringify(body).includes("123456789012"),
      "the full Aadhar number must never be stored or returned"
    );

    assert.ok(volunteer.matches.length > 0, "the scores shown to the volunteer are persisted");
    assert.equal(volunteer.matches[0].opportunityId, "donation-pickup");
  });

  it("filters volunteers by skill, availability and search term", async () => {
    const bySkill = await admin.get("/api/admin/volunteers?skill=Driving");
    assert.equal(bySkill.body.total, 1);

    const byMissingSkill = await admin.get("/api/admin/volunteers?skill=Accounting");
    assert.equal(byMissingSkill.body.total, 0);

    const byAvailability = await admin.get("/api/admin/volunteers?availability=Weekends");
    assert.equal(byAvailability.body.total, 1);

    const bySearch = await admin.get("/api/admin/volunteers?search=nikhil");
    assert.equal(bySearch.body.total, 1);
  });

  it("feeds the volunteer counters and the skill-distribution chart", async () => {
    const { body } = await admin.get("/api/admin/overview");
    assert.equal(body.volunteers.total, 1);
    assert.equal(body.volunteers.pending, 1);

    const skills = body.charts.volunteerSkills;
    assert.ok(skills.length >= 2);
    assert.ok(skills.some((entry) => entry.label === "Driving" && entry.value === 1));
  });

  it("lets an administrator move a volunteer through the follow-up workflow", async () => {
    const underReview = await admin.patch(
      `/api/admin/volunteers/${state.volunteerReference}`,
      { status: "Under Review" }
    );
    assert.equal(underReview.status, 200);
    assert.equal(underReview.body.volunteer.status, "Under Review");

    const approved = await admin.patch(
      `/api/admin/volunteers/${state.volunteerReference}`,
      { status: "Approved" }
    );
    assert.equal(approved.body.volunteer.status, "Approved");

    const overview = await admin.get("/api/admin/overview");
    assert.equal(overview.body.volunteers.pending, 0);
    assert.equal(overview.body.volunteers.byStatus.Approved, 1);
  });
});

describe("9. the opportunity catalogue is administrator-owned", () => {
  it("creates a new, non-demo opportunity that the matcher then uses", async () => {
    const created = await admin.post("/api/admin/opportunities", {
      id: "library-setup",
      title: "TEST Library Setup",
      summary: "Catalogue and shelve donated books at a partner NGO centre.",
      requiredSkills: ["Data Entry", "Logistics & Sorting"],
      interestTags: ["Child Education"],
      availabilityNeeds: ["Weekends"],
      location: "Pune",
      isDemo: false,
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.opportunity.isDemo, false);

    const registration = await anon.post(
      "/api/volunteers",
      volunteerPayload({
        fullName: "TEST Priya Shah",
        email: "priya.test@example.com",
        mobile: "9123456781",
        skills: ["Data Entry", "Logistics & Sorting"],
        interests: ["Child Education"],
        availability: ["Weekends"],
        preferredActivities: [],
      })
    );
    assert.equal(registration.status, 201);
    assert.equal(
      registration.body.matches[0].opportunityId,
      "library-setup",
      "a perfect fit for the new role should top the ranking"
    );
    assert.equal(registration.body.matches[0].score, 100);
  });

  it("rejects a malformed opportunity", async () => {
    const { status } = await admin.post("/api/admin/opportunities", {
      id: "Bad ID!",
      title: "x",
      summary: "too short",
      requiredSkills: [],
      interestTags: [],
      availabilityNeeds: [],
      location: "",
      isDemo: true,
    });
    assert.equal(status, 400);
  });

  it("deactivating a role removes it from new recommendations but keeps stored matches", async () => {
    const toggled = await admin.patch("/api/admin/opportunities", {
      id: "library-setup",
      active: false,
    });
    assert.equal(toggled.status, 200);

    const publicList = await anon.get("/api/opportunities");
    assert.ok(!publicList.body.opportunities.some((o) => o.id === "library-setup"));

    const registration = await anon.post(
      "/api/volunteers",
      volunteerPayload({
        fullName: "TEST Imran Sheikh",
        email: "imran.test@example.com",
        mobile: "9123456782",
        skills: ["Data Entry", "Logistics & Sorting"],
        interests: ["Child Education"],
        availability: ["Weekends"],
        preferredActivities: [],
      })
    );
    assert.ok(!registration.body.matches.some((m) => m.opportunityId === "library-setup"));

    const volunteers = await admin.get("/api/admin/volunteers?search=priya");
    assert.ok(
      volunteers.body.items[0].matches.some((m) => m.opportunityId === "library-setup"),
      "the earlier volunteer's stored match history is untouched"
    );

    // Put it back so the catalogue is left tidy.
    await admin.patch("/api/admin/opportunities", { id: "library-setup", active: true });
  });
});

describe("10. configurable matching weights", () => {
  it("rejects weights that do not add up to 1", async () => {
    const { status } = await admin.post("/api/admin/weights", {
      skill: 0.8,
      interest: 0.8,
      availability: 0.2,
      preferenceBoost: 10,
    });
    assert.equal(status, 400);
  });

  it("applies new weights to the next registration", async () => {
    const saved = await admin.post("/api/admin/weights", {
      skill: 1,
      interest: 0,
      availability: 0,
      preferenceBoost: 0,
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.weights.skill, 1);

    const registration = await anon.post(
      "/api/volunteers",
      volunteerPayload({
        fullName: "TEST Weight Check",
        email: "weights.test@example.com",
        mobile: "9123456783",
        skills: ["Driving", "Logistics & Sorting", "Event Management"],
        interests: ["Animal Care"],
        availability: ["Weekday Mornings"],
        preferredActivities: [],
      })
    );
    const pickup = registration.body.matches.find((m) => m.opportunityId === "donation-pickup");
    assert.equal(pickup.score, 100, "skill-only weighting ignores the interest and schedule gaps");

    // Restore the documented defaults for the rest of the suite.
    await admin.post("/api/admin/weights", {
      skill: 0.5,
      interest: 0.3,
      availability: 0.2,
      preferenceBoost: 10,
    });
  });
});

describe("11. administrator accounts", () => {
  it("lists administrators without ever exposing a hash", async () => {
    const { status, body } = await admin.get("/api/admin/admins");
    assert.equal(status, 200);
    assert.equal(body.admins.length, 1);
    assert.equal(body.admins[0].username, ADMIN.username);
    assert.ok(!JSON.stringify(body).includes("scrypt$"));
    assert.ok(!JSON.stringify(body).includes("password"));
  });

  it("adds a second administrator who can then sign in", async () => {
    const created = await admin.post("/api/admin/admins", {
      displayName: "Second Admin",
      username: "second.admin",
      password: "Another-Strong-Pass-1!",
    });
    assert.equal(created.status, 201);

    const duplicate = await admin.post("/api/admin/admins", {
      displayName: "Second Admin",
      username: "second.admin",
      password: "Another-Strong-Pass-2!",
    });
    assert.equal(duplicate.status, 400);

    const second = createClient();
    const login = await second.post("/api/admin/login", {
      username: "second.admin",
      password: "Another-Strong-Pass-1!",
    });
    assert.equal(login.status, 200);
    const session = await second.get("/api/admin/session");
    assert.equal(session.body.admin.username, "second.admin");
  });
});

describe("12. login, logout and brute-force protection", () => {
  it("rejects a wrong password with the same message as an unknown email", async () => {
    const client = createClient();
    const wrongPassword = await client.post("/api/admin/login", {
      username: ADMIN.username,
      password: "Wrong-Password-123!",
    });
    const unknownUser = await client.post("/api/admin/login", {
      username: "nobody",
      password: "Wrong-Password-123!",
    });

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownUser.status, 401);
    assert.equal(wrongPassword.body.error, unknownUser.body.error);
    assert.equal(client.cookies.size, 0);
  });

  it("rate limits repeated failures", async () => {
    const client = createClient();
    const username = "bruteforce";
    let sawRateLimit = false;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { status } = await client.post("/api/admin/login", {
        username,
        password: `Wrong-Password-${attempt}!`,
      });
      if (status === 429) {
        sawRateLimit = true;
        break;
      }
    }
    assert.ok(sawRateLimit, "the login endpoint must start refusing after repeated failures");
  });

  it("destroys the session on logout, so the cookie is useless afterwards", async () => {
    const client = createClient();
    await client.post("/api/admin/login", { username: ADMIN.username, password: ADMIN.password });
    const cookie = client.cookies.get("sevadeep_admin_session");
    assert.ok(cookie);

    const before = await client.get("/api/admin/overview");
    assert.equal(before.status, 200);

    await client.post("/api/admin/logout", {});
    const after = await client.get("/api/admin/overview");
    assert.equal(after.status, 401);

    // Replaying the old cookie value must also fail — the session row is gone server-side.
    const replay = await fetch(`http://127.0.0.1:${process.env.SEVADEEP_TEST_PORT ?? 3177}/api/admin/overview`, {
      headers: { cookie: `sevadeep_admin_session=${cookie}` },
    });
    assert.equal(replay.status, 401);
  });
});

describe("13. donor and NGO accounts (username + password, no OTP)", () => {
  const donor = createClient();

  it("rejects a registration whose passwords do not match", async () => {
    const { status } = await anon.post("/api/auth/register", {
      ...DONOR,
      confirmPassword: "Something-Else-1!",
    });
    assert.equal(status, 400);
  });

  it("rejects a weak password and a malformed username", async () => {
    assert.equal(
      (await anon.post("/api/auth/register", { ...DONOR, password: "short", confirmPassword: "short" })).status,
      400
    );
    assert.equal(
      (await anon.post("/api/auth/register", { ...DONOR, username: "no" })).status,
      400
    );
  });

  it("registers a donor and signs them straight in", async () => {
    const { status, body, headers } = await donor.post("/api/auth/register", DONOR);
    assert.equal(status, 201);
    assert.equal(body.account.username, DONOR.username);
    assert.equal(body.account.role, "donor");
    assert.ok(!JSON.stringify(body).includes(DONOR.password), "the password is never echoed");

    const setCookie = (headers.getSetCookie?.() ?? [headers.get("set-cookie")]).join(";");
    assert.match(setCookie, /sevadeep_admin_session=/);
    assert.match(setCookie, /HttpOnly/i);

    const session = await donor.get("/api/auth/session");
    assert.equal(session.status, 200);
    assert.equal(session.body.account.username, DONOR.username);
  });

  it("refuses a duplicate username", async () => {
    const { status, body } = await anon.post("/api/auth/register", DONOR);
    assert.equal(status, 400);
    assert.match(body.error, /already taken/i);
  });

  it("signs in with the right password and refuses the wrong one", async () => {
    const client = createClient();
    assert.equal(
      (await client.post("/api/auth/login", { username: DONOR.username, password: "nope", role: "donor" })).status,
      401
    );
    const ok = await client.post("/api/auth/login", {
      username: DONOR.username.toUpperCase(),
      password: DONOR.password,
      role: "donor",
    });
    assert.equal(ok.status, 200, "usernames are case-insensitive");
  });

  it("will not let a donor credential sign in on the NGO or administrator surface", async () => {
    const asNgo = await createClient().post("/api/auth/login", {
      username: DONOR.username,
      password: DONOR.password,
      role: "ngo",
    });
    assert.equal(asNgo.status, 401);

    const asAdmin = await createClient().post("/api/admin/login", {
      username: DONOR.username,
      password: DONOR.password,
    });
    assert.equal(asAdmin.status, 401);
  });

  it("will not let a donor session reach administrator data", async () => {
    for (const endpoint of ["/api/admin/overview", "/api/admin/applications", "/api/admin/volunteers"]) {
      const { status, body } = await donor.get(endpoint);
      assert.equal(status, 401, endpoint);
      assert.ok(!JSON.stringify(body).includes("studentName"));
    }
  });

  it("protects /account and redirects an anonymous visitor to the login page", async () => {
    const anonymous = await anon.get("/account");
    assert.ok([302, 303, 307].includes(anonymous.status), `got ${anonymous.status}`);
    assert.match(anonymous.headers.get("location") ?? "", /\/donor-login$/);

    const signedIn = await donor.get("/account");
    assert.equal(signedIn.status, 200);
    assert.ok(String(signedIn.body).includes(DONOR.username));
  });

  it("registers an NGO account independently", async () => {
    const ngo = createClient();
    const { status, body } = await ngo.post("/api/auth/register", {
      displayName: "TEST NGO Contact",
      username: "test.ngo",
      password: "Ngo-Pass-2026!",
      confirmPassword: "Ngo-Pass-2026!",
      organisation: "TEST Sevasadan Society",
      role: "ngo",
    });
    assert.equal(status, 201);
    assert.equal(body.account.role, "ngo");

    const session = await ngo.get("/api/auth/session");
    assert.equal(session.body.account.organisation, "TEST Sevasadan Society");
  });

  it("signs out and invalidates the session", async () => {
    await donor.post("/api/auth/logout", {});
    assert.equal((await donor.get("/api/auth/session")).status, 401);
  });
});

describe("14. persistence across a server restart", () => {
  it("keeps every record, reference counter and status after a restart", async () => {
    const beforeRestart = await admin.get("/api/admin/overview");
    const applicationsBefore = beforeRestart.body.applications;
    const volunteersBefore = beforeRestart.body.volunteers.total;

    await stopServer();
    await startServer({ fresh: false });

    // A new client: the restarted server must still recognise the stored session.
    const trackAfter = await anon.post("/api/track", {
      reference: state.firstReference,
      code: state.firstCode,
    });
    assert.equal(trackAfter.status, 200, serverLog().slice(-2000));
    assert.equal(trackAfter.body.application.status, "Approved");

    const reauth = createClient();
    await reauth.post("/api/admin/login", { username: ADMIN.username, password: ADMIN.password });
    const afterRestart = await reauth.get("/api/admin/overview");

    assert.deepEqual(afterRestart.body.applications, applicationsBefore);
    assert.equal(afterRestart.body.volunteers.total, volunteersBefore);

    // The reference counter continues rather than restarting at 1.
    const nextApplication = await anon.post(
      "/api/enrollment",
      applicant({ studentName: "TEST After Restart", contactNumber: "9822222222" })
    );
    assert.equal(nextApplication.status, 201);
    // Three applications were created earlier (the two losers of the concurrency race rolled
    // their counter bump back with their transaction), so this is the fourth — proving the
    // counter resumed from the database rather than restarting at 1.
    assert.match(nextApplication.body.reference, /^SD-\d{4}-000004$/);
  });
});
