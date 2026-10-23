// Human-readable, gap-free reference numbers (SD-2026-000001) and the private tracking codes
// that go with them.

import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

import type { Db } from "./client";

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
 * Takes the connection rather than opening its own transaction, so the counter bump and the row
 * insert commit together — see createApplication / createVolunteer.
 *
 * This module imports `Db` as a type only and has no runtime dependency on the database client,
 * which is what lets `node --test` exercise the pure helpers below directly.
 */
export function nextReferenceWithin(db: Db, kind: RefKind, now = new Date()): string {
  const year = now.getFullYear();
  const row = db
    .prepare(`SELECT next_val FROM ref_counters WHERE kind = ? AND year = ?`)
    .get(kind, year) as { next_val: number } | undefined;

  const sequence = row?.next_val ?? 1;
  if (row) {
    db.prepare(`UPDATE ref_counters SET next_val = ? WHERE kind = ? AND year = ?`).run(
      sequence + 1,
      kind,
      year
    );
  } else {
    db.prepare(`INSERT INTO ref_counters (kind, year, next_val) VALUES (?, ?, ?)`).run(
      kind,
      year,
      2
    );
  }
  return formatReference(kind, year, sequence);
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
