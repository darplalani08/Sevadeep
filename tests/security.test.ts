// Unit tests for the security primitives: password hashing/policy, reference generation,
// tracking-code hashing and the duplicate-submission fingerprint.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkPasswordPolicy,
  hashPassword,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
} from "../src/server/auth/password.ts";
import {
  dedupeHash,
  formatReference,
  generateTrackingCode,
  hashTrackingCode,
  normaliseReference,
  normaliseTrackingCode,
  referencePattern,
  TRACK_CODE_LENGTH,
  verifyTrackingCode,
} from "../src/server/db/references.ts";

describe("password policy", () => {
  it("rejects weak passwords with a reason", () => {
    const weak = [
      "short",
      "a".repeat(MIN_PASSWORD_LENGTH),
      "ALLUPPERCASE123!",
      "nouppercase123!",
      "NoDigitsHere!!",
      "NoSymbols1234",
    ];
    for (const password of weak) {
      const result = checkPasswordPolicy(password);
      assert.equal(result.ok, false, password);
      if (!result.ok) assert.ok(result.reason.length > 0);
    }
  });

  it("accepts a password that meets every rule", () => {
    assert.deepEqual(checkPasswordPolicy("SevaDeep-Demo-2026!"), { ok: true });
  });
});

describe("password hashing", () => {
  it("never stores the plaintext and verifies the right password", async () => {
    const password = "SevaDeep-Demo-2026!";
    const stored = await hashPassword(password);

    assert.ok(!stored.includes(password));
    assert.match(stored, /^scrypt\$\d+\$\d+\$\d+\$[0-9a-f]+\$[0-9a-f]+$/);
    assert.equal(await verifyPassword(password, stored), true);
  });

  it("rejects a wrong password, including near-misses", async () => {
    const stored = await hashPassword("SevaDeep-Demo-2026!");
    for (const attempt of ["SevaDeep-Demo-2026", "sevadeep-demo-2026!", "", "x"]) {
      assert.equal(await verifyPassword(attempt, stored), false, attempt);
    }
  });

  it("salts each hash, so the same password hashes differently every time", async () => {
    const a = await hashPassword("SevaDeep-Demo-2026!");
    const b = await hashPassword("SevaDeep-Demo-2026!");
    assert.notEqual(a, b);
    assert.equal(await verifyPassword("SevaDeep-Demo-2026!", a), true);
    assert.equal(await verifyPassword("SevaDeep-Demo-2026!", b), true);
  });

  it("returns false instead of throwing on a malformed stored hash", async () => {
    for (const stored of ["", "nonsense", "scrypt$1$2$3", "bcrypt$16384$8$1$aa$bb", "scrypt$x$y$z$$"]) {
      assert.equal(await verifyPassword("whatever", stored), false, stored);
    }
  });
});

describe("application references", () => {
  it("formats as SD-YYYY-NNNNNN with zero padding", () => {
    assert.equal(formatReference("application", 2026, 1), "SD-2026-000001");
    assert.equal(formatReference("application", 2026, 123456), "SD-2026-123456");
    assert.equal(formatReference("volunteer", 2026, 7), "SD-VOL-2026-000007");
  });

  it("matches its own pattern", () => {
    assert.match(formatReference("application", 2026, 42), referencePattern("application"));
    assert.match(formatReference("volunteer", 2026, 42), referencePattern("volunteer"));
    assert.doesNotMatch("SD-26-1", referencePattern("application"));
  });

  it("normalises user-typed references", () => {
    assert.equal(normaliseReference("  sd-2026-000001 "), "SD-2026-000001");
  });
});

describe("tracking codes", () => {
  it("generates unambiguous codes of the documented length", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateTrackingCode();
      assert.equal(code.length, TRACK_CODE_LENGTH);
      assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/, `no O, 0, I, 1 or L: ${code}`);
    }
  });

  it("is not stored in readable form and verifies only the right code", () => {
    const reference = "SD-2026-000001";
    const code = "A2B3C4";
    const stored = hashTrackingCode(reference, code);

    assert.ok(!stored.includes(code));
    assert.equal(verifyTrackingCode(reference, code, stored), true);
    assert.equal(verifyTrackingCode(reference, "A2B3C5", stored), false);
  });

  it("is bound to its own reference, so a code cannot be replayed on another application", () => {
    const stored = hashTrackingCode("SD-2026-000001", "A2B3C4");
    assert.equal(verifyTrackingCode("SD-2026-000002", "A2B3C4", stored), false);
  });

  it("accepts the code as the user would type it", () => {
    const stored = hashTrackingCode("SD-2026-000001", "A2B3C4");
    assert.equal(verifyTrackingCode("sd-2026-000001", " a2b3c4 ", stored), true);
    assert.equal(normaliseTrackingCode(" a2-b3 c4 "), "A2B3C4");
  });

  it("uses a different salt per application", () => {
    const a = hashTrackingCode("SD-2026-000001", "A2B3C4");
    const b = hashTrackingCode("SD-2026-000001", "A2B3C4");
    assert.notEqual(a, b);
  });

  it("returns false instead of throwing on a malformed stored hash", () => {
    assert.equal(verifyTrackingCode("SD-2026-000001", "A2B3C4", ""), false);
    assert.equal(verifyTrackingCode("SD-2026-000001", "A2B3C4", "garbage"), false);
  });
});

describe("duplicate-submission fingerprint", () => {
  it("is stable for the same inputs and differs for different ones", () => {
    const a = dedupeHash(["application", "Asha Patil", "Rekha Patil", "9876543210", 123]);
    const b = dedupeHash(["application", "asha patil", " Rekha Patil ", "9876543210", 123]);
    const c = dedupeHash(["application", "Asha Patil", "Rekha Patil", "9876543210", 124]);

    assert.equal(a, b, "case and surrounding whitespace do not matter");
    assert.notEqual(a, c, "a later time bucket is a different submission");
    assert.match(a, /^[0-9a-f]{64}$/);
  });

  it("separates two different children of the same guardian", () => {
    const first = dedupeHash(["application", "Asha Patil", "Rekha Patil", "9876543210", 123]);
    const second = dedupeHash(["application", "Rohit Patil", "Rekha Patil", "9876543210", 123]);
    assert.notEqual(first, second);
  });
});
