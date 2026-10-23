// Human-readable, gap-free reference numbers (SD-2026-000001) and the private tracking codes
// that go with them.

import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

import type { Sql } from "./sql.ts";

export type RefKind = "application" | "volunteer";

const PREFIX: Record<RefKind, string> = {
  application: "SD",
  volunteer: "SD-VOL",
};

/** Pure formatter — the shape of every reference the platform hands out. */
export function formatReference(kind: RefKind, year: number, sequence: number): string {
  return `${PREFIX[kind]}-${year}-${String(sequence).padStart(6, "0")}`;
}

export function referencePattern(kind: RefKind): RegExp {
  return new RegExp(`^${PREFIX[kind]}-\\d{4}-\\d{6}$`);
}

/**
 * Reserves the next sequence number for (kind, year) and returns the formatted reference.
 *
 * The counter bump happens inside public.reserve_reference(), so it is atomic against concurrent
 * callers in a single round trip. Call it inside the same transaction as the row insert and a
 * rolled-back insert returns its number instead of burning it — verified in the integration
 * suite by racing three identical submissions.
 *
 * This module imports `Sql` as a type only and has no runtime dependency on the driver, which is
 * what lets `node --test` exercise the pure helpers below directly.
 */
export async function nextReferenceWithin(
  sql: Sql,
  kind: RefKind,
  now = new Date()
): Promise<string> {
  const year = now.getFullYear();
  const rows = await sql.query<{ reserve_reference: number }>(
    `select public.reserve_reference($1, $2) as reserve_reference`,
    [kind, year]
  );
  return formatReference(kind, year, Number(rows[0].reserve_reference));
}

// Tracking codes: 6 characters from an unambiguous alphabet (no O/0, I/1, L) so they can be
// read out over the phone. ~34^6 = 1.5 billion combinations, and the lookup is rate limited.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const TRACK_CODE_LENGTH = 6;

export function generateTrackingCode(): string {
  let code = "";
  for (let i = 0; i < TRACK_CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export function normaliseTrackingCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normaliseReference(reference: string): string {
  return reference.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Tracking codes are hashed before storage with a per-row salt, so a leaked database file does
 * not hand an attacker the codes needed to read application statuses.
 */
export function hashTrackingCode(reference: string, code: string, salt?: string): string {
  const useSalt = salt ?? randomBytes(16).toString("hex");
  const digest = createHash("sha256")
    .update(`${useSalt}:${normaliseReference(reference)}:${normaliseTrackingCode(code)}`)
    .digest("hex");
  return `${useSalt}$${digest}`;
}

export function verifyTrackingCode(reference: string, code: string, stored: string): boolean {
  const [salt] = stored.split("$");
  if (!salt) return false;
  const candidate = Buffer.from(hashTrackingCode(reference, code, salt));
  const expected = Buffer.from(stored);
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/** Stable fingerprint used by the UNIQUE dedupe_hash columns to swallow double submissions. */
export function dedupeHash(parts: (string | number | null | undefined)[]): string {
  return createHash("sha256")
    .update(parts.map((p) => String(p ?? "").trim().toLowerCase()).join("|"))
    .digest("hex");
}
