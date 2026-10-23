// Two-window browser test: the real UI, in a real browser, with two independent sessions.
//
// Run with: npm run test:browser
//
// Window A is the public visitor (enrolment, tracking, volunteering, chatbot).
// Window B is the administrator (dashboard).
//
// What it proves that the HTTP tests cannot: that the polling UI actually re-renders — an
// application submitted in A appears in B, and a status changed in B appears in A — with no
// reload in either window. Each window records a page-load id at first paint and the test
// asserts it never changes, so "no manual refresh" is checked rather than assumed.
//
// Playwright and its Chromium build are already vendored in scraper/node_modules (they were used
// for the original content audit), so this needs no new dependency.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  BASE_URL,
  buildOnce,
  removeTestDatabase,
  startServer,
  stopServer,
} from "./helpers/server.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");
const playwrightPath = path.join(projectRoot, "scraper", "node_modules", "playwright", "index.js");
const SHOTS = path.join(projectRoot, "qa", "platform-screenshots");

const ADMIN = {
  name: "Demo Administrator",
  email: "admin@sevadeep.test",
  password: "SevaDeep-Demo-2026!",
};

const STUDENT = {
  student: "TEST Asha Patil",
  guardian: "TEST Rekha Patil",
  phone: "9876543210",
  age: "12",
  class: "Class 6-8",
  city: "Pune",
  support: "After-School Tuition",
};

const VOLUNTEER = {
  name: "TEST Nikhil Joshi",
  email: "nikhil.test@example.com",
  mobile: "9123456780",
  dob: "1996-04-12",
  aadhar: "123456789012",
};

let failures = 0;
const results = [];

async function step(label, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ label, ok: true, ms: Date.now() - started });
    console.log(`  PASS  ${label}`);
  } catch (error) {
    failures += 1;
    results.push({ label, ok: false, ms: Date.now() - started, error: String(error) });
    console.error(`  FAIL  ${label}\n        ${error instanceof Error ? error.message : error}`);
  }
}

/** Stamps a value on `window` that survives client-side navigation but not a page load. */
async function markPageLoad(page, id) {
  await page.evaluate((value) => {
    // @ts-expect-error — test-only marker on window
    window.__sevadeepLoadId = value;
  }, id);
}

async function assertNoReload(page, id, context) {
  const current = await page.evaluate(() => {
    // @ts-expect-error — test-only marker on window
    return window.__sevadeepLoadId ?? null;
  });
  assert.equal(current, id, `${context}: the page reloaded, so this was not a live update`);
}

/** Base UI selects are custom widgets: click the trigger, then the option. */
async function chooseFromSelect(page, triggerText, optionText) {
  await page.getByText(triggerText, { exact: true }).first().click();
  await page.getByRole("option", { name: optionText, exact: true }).click();
}

async function tickChip(scope, label) {
  await scope.locator("label", { hasText: new RegExp(`^\\s*${label}\\s*$`) }).first().click();
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });

  // Playwright ships as CommonJS, so a dynamic import exposes it on `default`.
  const playwright = await import(pathToFileURL(playwrightPath).href);
  const { chromium } = playwright.default ?? playwright;

  console.log("Building the app (the browser suite runs against a production build)…");
  await buildOnce();
  console.log("Starting an isolated test server…");
  await startServer({ fresh: true, mode: "production" });

  const browser = await chromium.launch();
  const contextA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const contextB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // Keep failures fast: a step that cannot find its element should report in seconds, not block
  // the suite for half a minute.
  contextA.setDefaultTimeout(12000);
  contextB.setDefaultTimeout(12000);
  contextA.setDefaultNavigationTimeout(30000);
  contextB.setDefaultNavigationTimeout(30000);

  const windowA = await contextA.newPage();
  const windowB = await contextB.newPage();

  const consoleErrors = [];
  const notFound = [];
  for (const [name, page] of [["A", windowA], ["B", windowB]]) {
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(`[${name}] ${message.text()}`);
    });
    page.on("pageerror", (error) => consoleErrors.push(`[${name}] ${error.message}`));
    page.on("response", (response) => {
      if (response.status() === 404) notFound.push(`[${name}] 404 ${response.url()}`);
    });
  }

  let reference = "";
  let trackingCode = "";

  try {
    // ---------------------------------------------------------------------
    console.log("\nWindow B — administrator bootstrap and dashboard");
    // ---------------------------------------------------------------------
    await step("B: /admin redirects an anonymous visitor away from the dashboard", async () => {
      await windowB.goto(`${BASE_URL}/admin`, { waitUntil: "domcontentloaded" });
      await windowB.waitForURL(/\/admin\/(login|setup)$/, { timeout: 15000 });
    });

    await step("B: the one-time setup screen creates the first administrator", async () => {
      await windowB.goto(`${BASE_URL}/admin/setup`, { waitUntil: "domcontentloaded" });
      await windowB.getByLabel("Full name").fill(ADMIN.name);
      await windowB.getByLabel("Email").fill(ADMIN.email);
      await windowB.getByLabel("Password", { exact: true }).fill(ADMIN.password);
      await windowB.getByLabel("Confirm password").fill(ADMIN.password);
      await windowB.getByRole("button", { name: /create administrator/i }).click();
      await windowB.waitForURL(`${BASE_URL}/admin`, { timeout: 20000 });
      await windowB.getByRole("heading", { name: "Dashboard" }).waitFor();
    });

    await step("B: the dashboard starts from zero with honest empty states", async () => {
      await windowB.getByText("No applications submitted in the last 14 days yet.").waitFor();
      await windowB
        .getByText("No volunteer registrations yet. New registrations appear here automatically.")
        .waitFor();
      const total = await windowB
        .locator("dt", { hasText: "Total applications" })
        .locator("xpath=following-sibling::dd[1]")
        .innerText();
      assert.equal(total.trim(), "0");
      await windowB.screenshot({ path: path.join(SHOTS, "01-dashboard-empty.png"), fullPage: true });
    });

    await markPageLoad(windowB, "B1");

    // ---------------------------------------------------------------------
    console.log("\nWindow A — student enrolment");
    // ---------------------------------------------------------------------
    await step("A: the enrolment form rejects an empty submission client-side", async () => {
      await windowA.goto(`${BASE_URL}/enroll`, { waitUntil: "domcontentloaded" });
      await windowA.getByRole("button", { name: /submit application/i }).click();
      await windowA.getByText("Enter the student's full name").waitFor();
      await windowA.getByText("Select at least one kind of support needed").waitFor();
    });

    await step("A: a valid application is saved and returns a reference and tracking code", async () => {
      await windowA.getByLabel("Student's Full Name *").fill(STUDENT.student);
      await windowA.getByLabel("Parent / Guardian Name *").fill(STUDENT.guardian);
      await windowA.getByLabel("Contact Number *").fill(STUDENT.phone);
      await windowA.getByLabel("Student's Age *").fill(STUDENT.age);
      await chooseFromSelect(windowA, "Select class", STUDENT.class);
      await windowA.getByLabel("City *").fill(STUDENT.city);
      await tickChip(windowA, STUDENT.support);
      await windowA.getByLabel(/I agree to SevaDeep contacting me/).check();
      await windowA.getByRole("button", { name: /submit application/i }).click();

      await windowA.getByRole("heading", { name: "Application submitted" }).waitFor({ timeout: 20000 });

      reference = (
        await windowA
          .locator("dt", { hasText: "Application reference" })
          .locator("xpath=following-sibling::dd[1]")
          .innerText()
      ).trim();
      trackingCode = (
        await windowA
          .locator("dt", { hasText: "Private tracking code" })
          .locator("xpath=following-sibling::dd[1]")
          .innerText()
      ).trim();

      assert.match(reference, /^SD-\d{4}-\d{6}$/, `reference was "${reference}"`);
      assert.match(trackingCode, /^[A-HJ-NP-Z2-9]{6}$/, `code was "${trackingCode}"`);
      await windowA.screenshot({ path: path.join(SHOTS, "02-enrolment-receipt.png"), fullPage: true });
      console.log(`        reference ${reference}, code ${trackingCode}`);
    });

    // ---------------------------------------------------------------------
    console.log("\nTwo-window synchronisation: A submits -> B updates itself");
    // ---------------------------------------------------------------------
    await step("B: the counters and charts update without anyone reloading", async () => {
      await windowB
        .locator("dt", { hasText: "Total applications" })
        .locator("xpath=following-sibling::dd[1]")
        .filter({ hasText: "1" })
        .waitFor({ timeout: 20000 });

      await windowB
        .locator("dt", { hasText: "Submitted" })
        .locator("xpath=following-sibling::dd[1]")
        .filter({ hasText: "1" })
        .waitFor({ timeout: 20000 });

      // The empty state must be gone — the chart is now drawing real data.
      await windowB
        .getByText("No applications submitted in the last 14 days yet.")
        .waitFor({ state: "detached", timeout: 20000 });

      await assertNoReload(windowB, "B1", "dashboard counters");
      await windowB.screenshot({ path: path.join(SHOTS, "03-dashboard-live-application.png"), fullPage: true });
    });

    await step("B: the new application appears in the Applications table by itself", async () => {
      await windowB.getByRole("tab", { name: /^Applications/ }).click();
      await windowB.getByText(reference).first().waitFor({ timeout: 20000 });
      await windowB.getByText(STUDENT.student).first().waitFor();
      await assertNoReload(windowB, "B1", "applications table");
    });

    // ---------------------------------------------------------------------
    console.log("\nWindow A — tracking, then B changes the status");
    // ---------------------------------------------------------------------
    await step("A: tracking refuses a wrong code", async () => {
      await windowA.goto(`${BASE_URL}/track`, { waitUntil: "domcontentloaded" });
      await windowA.getByLabel("Application Reference *").fill(reference);
      await windowA.getByLabel("Tracking Code *").fill("ZZZZZZ");
      await windowA.getByRole("button", { name: /check status/i }).click();
      await windowA
        .getByText("No application matches that reference and tracking code.")
        .waitFor({ timeout: 20000 });
    });

    await step("A: the correct reference and code show the live status", async () => {
      await windowA.getByLabel("Tracking Code *").fill(trackingCode);
      await windowA.getByRole("button", { name: /check status/i }).click();
      await windowA.getByText("Status history").waitFor({ timeout: 20000 });
      await windowA.getByText("Submitted", { exact: true }).first().waitFor();

      // No contact details may appear on a public page.
      const text = await windowA.locator("body").innerText();
      for (const secret of [STUDENT.phone, STUDENT.guardian]) {
        assert.ok(!text.includes(secret), `the tracking page leaked "${secret}"`);
      }
      await markPageLoad(windowA, "A1");
      await windowA.screenshot({ path: path.join(SHOTS, "04-tracking-submitted.png"), fullPage: true });
    });

    await step("B: an administrator changes the status to Under Review", async () => {
      await windowB.getByRole("row", { name: new RegExp(reference) }).getByRole("button", { name: "Open" }).click();
      await windowB.getByRole("dialog").waitFor();
      await windowB.getByLabel(/Note for the status history/).fill("TEST — checking with partner NGO.");
      await windowB.getByRole("button", { name: "Set Under Review" }).click();
      await windowB.getByRole("dialog").getByText("Submitted → Under Review").waitFor({ timeout: 20000 });
      await windowB.screenshot({ path: path.join(SHOTS, "05-admin-status-change.png"), fullPage: true });
    });

    await step("A: the tracking page shows Under Review on its own — no reload", async () => {
      await windowA.getByText("Under Review").first().waitFor({ timeout: 25000 });
      await windowA.getByText("A SevaDeep coordinator is checking the details", { exact: false }).waitFor();
      await windowA.getByText("Submitted → Under Review").waitFor();
      await assertNoReload(windowA, "A1", "tracking page");
      await windowA.screenshot({ path: path.join(SHOTS, "06-tracking-live-update.png"), fullPage: true });
    });

    await step("A: an Approved decision also arrives automatically", async () => {
      await windowB.getByRole("button", { name: "Set Approved" }).click();
      await windowA.getByText("Approved").first().waitFor({ timeout: 25000 });
      await windowA.getByText("Support has been arranged", { exact: false }).waitFor();
      await assertNoReload(windowA, "A1", "tracking page after approval");
      await windowB.getByRole("dialog").press("Escape");
    });

    // ---------------------------------------------------------------------
    console.log("\nWindow A — volunteer registration and matching");
    // ---------------------------------------------------------------------
    await step("A: registering a volunteer shows explained match scores", async () => {
      await windowA.goto(`${BASE_URL}/volunteer-register`, { waitUntil: "domcontentloaded" });
      await chooseFromSelect(windowA, "Select category", "Field Visits & Pickups");
      await windowA.getByLabel("Area Of Interest *").fill("Weekend pickups in Kothrud");
      await windowA.getByLabel("Full Name *").fill(VOLUNTEER.name);
      await windowA.getByLabel("Email Address *").fill(VOLUNTEER.email);
      await windowA.getByLabel("Mobile (WhatsApp) *").fill(VOLUNTEER.mobile);
      await windowA.getByLabel("Date Of Birth *").fill(VOLUNTEER.dob);
      await chooseFromSelect(windowA, "Select", "O+");
      await windowA.getByLabel("Aadhar Card *").fill(VOLUNTEER.aadhar);

      await tickChip(windowA, "Driving");
      await tickChip(windowA, "Logistics & Sorting");
      await tickChip(windowA, "Donation Drives");
      await tickChip(windowA, "Weekends");

      // The live preview runs the matching engine in the browser as the form is filled.
      const preview = windowA.locator("div", { hasText: "Live preview of your top matches" }).last();
      await windowA.getByText("Live preview of your top matches").waitFor({ timeout: 15000 });

      // Requirement coverage, not raw overlap: "Donation Sorting & Inventory" asks for 2 skills
      // and this volunteer brings 1 of them plus its only interest tag (75), which beats
      // "Donation Pickup & Field Visits" (68) because that role also wants Event Management.
      const previewText = await preview.innerText();
      assert.match(previewText, /Donation Sorting & Inventory/);
      assert.match(previewText, /75%/, `preview was:\n${previewText}`);
      await windowA.screenshot({ path: path.join(SHOTS, "07-volunteer-live-preview.png"), fullPage: true });

      // Naming an activity as a preference adds its configured boost (10 points by default),
      // which is enough to put the pickup role back on top. The preview must react immediately.
      await tickChip(windowA, "Donation Pickup & Field Visits");
      await windowA
        .getByText("Live preview of your top matches")
        .locator("xpath=following-sibling::ul[1]/li[1]")
        .filter({ hasText: "Donation Pickup & Field Visits" })
        .waitFor({ timeout: 10000 });

      await windowA.getByRole("button", { name: /submit & see my matches/i }).click();
      await windowA.getByRole("heading", { name: "Thanks for volunteering!" }).waitFor({ timeout: 20000 });
      await windowA.getByRole("heading", { name: "Your recommended opportunities" }).waitFor();

      const top = await windowA
        .locator('section[aria-label="Your recommended opportunities"] ol > li')
        .first()
        .innerText();
      assert.match(top, /Donation Pickup & Field Visits/, `top match was:\n${top}`);
      assert.match(top, /Best match/);
      assert.match(top, /\d{1,3}%/, "the top match shows a percentage");
      assert.match(top, /Skill fit/, "the component scores are shown");
      assert.match(top, /You also named this activity as a preference/, "the boost is explained");
      await windowA.screenshot({ path: path.join(SHOTS, "08-volunteer-matches.png"), fullPage: true });
    });

    await step("B: the volunteer and the skill chart appear by themselves", async () => {
      await windowB.getByRole("tab", { name: /^Volunteers/ }).click();
      await windowB.getByText(VOLUNTEER.name).first().waitFor({ timeout: 20000 });
      await assertNoReload(windowB, "B1", "volunteers tab");

      await windowB.getByRole("tab", { name: "Overview" }).click();
      await windowB
        .locator("dt", { hasText: "Volunteer registrations" })
        .locator("xpath=following-sibling::dd[1]")
        .filter({ hasText: "1" })
        .waitFor({ timeout: 20000 });
      await windowB
        .getByText("No volunteer registrations yet. New registrations appear here automatically.")
        .waitFor({ state: "detached", timeout: 20000 });
      await windowB.getByText("Driving", { exact: true }).first().waitFor();
      await assertNoReload(windowB, "B1", "overview after volunteer");
      await windowB.screenshot({ path: path.join(SHOTS, "09-dashboard-live-volunteer.png"), fullPage: true });
    });

    await step("B: the volunteer's stored match explanation is visible to staff", async () => {
      await windowB.getByRole("tab", { name: /^Volunteers/ }).click();
      await windowB.getByRole("button", { name: "Show details" }).first().click();
      await windowB.getByText("Recommended opportunities").waitFor();
      await windowB.getByText("XXXX-XXXX-9012").waitFor();
      const text = await windowB.locator("body").innerText();
      assert.ok(!text.includes(VOLUNTEER.aadhar), "the full Aadhar number must never be shown");
    });

    // ---------------------------------------------------------------------
    console.log("\nWindow A — chatbot");
    // ---------------------------------------------------------------------
    await step("A: the chatbot opens, answers, navigates and clears", async () => {
      await windowA.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await windowA.getByRole("button", { name: "Open SevaDeep assistant" }).click();
      const panel = windowA.getByRole("dialog", { name: "SevaDeep assistant" });
      await panel.waitFor();
      await panel.getByText(/Namaste! I'm the SevaDeep assistant/).waitFor();

      // A typed question
      const input = panel.getByPlaceholder("Ask about enrolment, tracking, volunteering…");
      await input.fill("how do I enrol a student?");
      await panel.getByRole("button", { name: "Send message" }).click();
      await panel.getByText(/Open the enrolment form/).waitFor({ timeout: 10000 });

      // An unknown question falls back rather than inventing an answer
      await input.fill("do you sell second hand cars");
      await panel.getByRole("button", { name: "Send message" }).click();
      await panel.getByText(/I don't have a verified answer for that one/).waitFor({ timeout: 10000 });

      // An empty message is refused
      await input.fill("   ");
      await panel.getByRole("button", { name: "Send message" }).click();
      await panel.getByText("Type a question first.").waitFor();

      // A suggested-question chip
      await input.fill("");
      await panel.getByRole("button", { name: "I want to volunteer" }).first().click();
      await panel.getByText(/50% on how well your skills cover the role/).waitFor({ timeout: 10000 });
      await windowA.screenshot({ path: path.join(SHOTS, "10-chatbot.png"), fullPage: false });

      // Clearing resets to the welcome message
      await panel.getByRole("button", { name: "Clear conversation" }).click();
      await panel.getByText(/Namaste! I'm the SevaDeep assistant/).waitFor();
      const messageLog = panel.locator('[aria-live="polite"]');
      assert.equal(
        await messageLog.getByText("how do I enrol a student?").count(),
        0,
        "the cleared conversation still shows an old message"
      );
      assert.equal(
        await messageLog.getByText("second hand cars").count(),
        0,
        "the cleared conversation still shows an old message"
      );

      // A navigation link goes to the right route
      await input.fill("track my application");
      await panel.getByRole("button", { name: "Send message" }).click();
      await panel.getByRole("link", { name: "Track an application" }).click();
      await windowA.waitForURL(`${BASE_URL}/track`, { timeout: 15000 });
    });

    await step("A: the chatbot is usable at phone width", async () => {
      const mobile = await contextA.newPage();
      await mobile.setViewportSize({ width: 390, height: 844 });
      await mobile.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await mobile.getByRole("button", { name: "Open SevaDeep assistant" }).click();
      const panel = mobile.getByRole("dialog", { name: "SevaDeep assistant" });
      await panel.waitFor();

      const box = await panel.boundingBox();
      assert.ok(box, "the panel has no box");
      assert.ok(box.width <= 390, `the panel is ${box.width}px wide at 390px viewport`);
      assert.ok(box.x >= 0, "the panel hangs off the left edge");

      await panel.getByRole("button", { name: "What is SevaDeep?" }).first().click();
      await panel.getByText(/an initiative of the Relfor Foundation/).waitFor({ timeout: 10000 });
      await mobile.screenshot({ path: path.join(SHOTS, "11-chatbot-mobile.png"), fullPage: false });
      await mobile.close();
    });

    // ---------------------------------------------------------------------
    console.log("\nRegression check on the original pages");
    // ---------------------------------------------------------------------
    await step("the original pages still render with their own content", async () => {
      const pages = [
        ["/", "Connecting Donors with NGOs"],
        ["/ngos", null],
        ["/ngo-needs", null],
        ["/donation-bucket", null],
        ["/blog", null],
        ["/gallery", null],
        ["/narayan-seva", null],
        ["/ngo-login", null],
        ["/donor-login", null],
        ["/ngo-registration", null],
      ];

      for (const [route, expected] of pages) {
        const response = await windowA.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
        assert.equal(response?.status(), 200, `${route} returned ${response?.status()}`);
        if (expected) await windowA.getByText(expected).first().waitFor();
        // The footer is part of every original page and must still be there.
        await windowA.getByText("A Relfor Foundation initiative", { exact: false }).waitFor();
      }
    });

    await step("B: signing out invalidates the session", async () => {
      await windowB.getByRole("button", { name: "Sign out" }).click();
      await windowB.waitForURL(/\/admin\/login$/, { timeout: 20000 });
      await windowB.goto(`${BASE_URL}/admin`, { waitUntil: "domcontentloaded" });
      await windowB.waitForURL(/\/admin\/login$/, { timeout: 20000 });
    });
  } finally {
    await browser.close();
    await stopServer();
    removeTestDatabase();
  }

  // React hydration and dev-overlay noise aside, an unhandled error in either window is a bug.
  const realErrors = consoleErrors.filter(
    (line) =>
      !/favicon|Download the React DevTools|net::ERR_ABORTED/i.test(line) &&
      // A 404 is reported separately, with its URL, so it can be judged on the merits.
      !/Failed to load resource: the server responded with a status of 404/i.test(line)
  );

  console.log("\n--------------------------------------------");
  console.log(`${results.filter((r) => r.ok).length}/${results.length} browser steps passed`);
  if (realErrors.length > 0) {
    console.log(`\n${realErrors.length} browser console error(s):`);
    for (const line of realErrors.slice(0, 20)) console.log(`  ${line}`);
  }
  if (notFound.length > 0) {
    console.log(`\n${notFound.length} request(s) returned 404:`);
    for (const line of [...new Set(notFound)].slice(0, 20)) console.log(`  ${line}`);
  }
  console.log(`Screenshots: ${SHOTS}`);

  if (failures > 0 || realErrors.length > 0) process.exitCode = 1;
}

await main();
