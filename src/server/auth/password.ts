// Password hashing with scrypt from Node's standard library — no third-party dependency and no
// plaintext password ever reaches the database.
//
// Stored format:  scrypt$<N>$<r>$<p>$<saltHex>$<derivedKeyHex>

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export const MIN_PASSWORD_LENGTH = 12;

export type PasswordPolicyResult = { ok: true } | { ok: false; reason: string };

/** Policy applied at admin creation and password change time. */
export function checkPasswordPolicy(password: string): PasswordPolicyResult {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` };
  }
  if (password.length > 200) {
    return { ok: false, reason: "Password must be at most 200 characters long." };
  }
  if (!/[a-z]/.test(password)) return { ok: false, reason: "Password must include a lowercase letter." };
  if (!/[A-Z]/.test(password)) return { ok: false, reason: "Password must include an uppercase letter." };
  if (!/[0-9]/.test(password)) return { ok: false, reason: "Password must include a digit." };
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, reason: "Password must include a symbol." };
  }
  return { ok: true };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password, salt, KEY_LENGTH, PARAMS);
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("hex"),
    derived.toString("hex"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], "hex");
    expected = Buffer.from(parts[5], "hex");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  const derived = await scryptAsync(password, salt, expected.length, {
    N,
    r,
    p,
    maxmem: PARAMS.maxmem,
  });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
