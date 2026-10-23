// Administrator accounts, sessions and login rate limiting.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { getDb } from "./client";
import { checkPasswordPolicy, hashPassword, verifyPassword } from "../auth/password";

export type Admin = { id: number; email: string; name: string };

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function adminCount(): number {
  const { count } = getDb().prepare(`SELECT COUNT(*) AS count FROM admins`).get() as {
    count: number;
  };
  return count;
}

export function listAdmins(): Admin[] {
  return getDb()
    .prepare(`SELECT id, email, name FROM admins ORDER BY id ASC`)
    .all() as Admin[];
}

export type CreateAdminResult =
  | { ok: true; admin: Admin }
  | { ok: false; reason: string };

export async function createAdmin(
  email: string,
  name: string,
  password: string
): Promise<CreateAdminResult> {
  const cleanEmail = normaliseEmail(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    return { ok: false, reason: "Enter a valid email address." };
  }
  if (name.trim().length < 2) return { ok: false, reason: "Enter the administrator's name." };

  const policy = checkPasswordPolicy(password);
  if (!policy.ok) return { ok: false, reason: policy.reason };

  const existing = getDb()
    .prepare(`SELECT id FROM admins WHERE email = ?`)
    .get(cleanEmail) as { id: number } | undefined;
  if (existing) return { ok: false, reason: "An administrator with that email already exists." };

  const passwordHash = await hashPassword(password);
  const result = getDb()
    .prepare(
      `INSERT INTO admins (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)`
    )
    .run(cleanEmail, name.trim(), passwordHash, new Date().toISOString());

  return {
    ok: true,
    admin: { id: Number(result.lastInsertRowid), email: cleanEmail, name: name.trim() },
  };
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

function pruneAttempts(now: Date) {
  getDb()
    .prepare(`DELETE FROM login_attempts WHERE datetime(created_at) < datetime(?)`)
    .run(new Date(now.getTime() - ATTEMPT_WINDOW_MS).toISOString());
}

export function recordLoginFailure(scopeKey: string, now = new Date()) {
  getDb()
    .prepare(`INSERT INTO login_attempts (scope_key, created_at) VALUES (?, ?)`)
    .run(scopeKey, now.toISOString());
}

export function clearLoginFailures(scopeKey: string) {
  getDb().prepare(`DELETE FROM login_attempts WHERE scope_key = ?`).run(scopeKey);
}

export function isRateLimited(scopeKey: string, now = new Date()): boolean {
  pruneAttempts(now);
  const { count } = getDb()
    .prepare(
      `SELECT COUNT(*) AS count FROM login_attempts
        WHERE scope_key = ? AND datetime(created_at) >= datetime(?)`
    )
    .get(scopeKey, new Date(now.getTime() - ATTEMPT_WINDOW_MS).toISOString()) as {
    count: number;
  };
  return count >= MAX_ATTEMPTS;
}

// ---------------------------------------------------------------------------
// Authentication & sessions
// ---------------------------------------------------------------------------

// A structurally valid hash that no password matches — used to equalise login timing for
// unknown email addresses.
const DUMMY_HASH = `scrypt$16384$8$1$${"ab".repeat(16)}$${"cd".repeat(64)}`;

export async function authenticate(email: string, password: string): Promise<Admin | null> {
  const row = getDb()
    .prepare(`SELECT id, email, name, password_hash FROM admins WHERE email = ?`)
    .get(normaliseEmail(email)) as
    | { id: number; email: string; name: string; password_hash: string }
    | undefined;

  if (!row) {
    // Spend comparable time on an unknown email so response timing does not reveal which
    // addresses exist. The salt/key lengths match a real record, so the scrypt cost is the same.
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return null;

  getDb()
    .prepare(`UPDATE admins SET last_login_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), row.id);

  return { id: row.id, email: row.email, name: row.name };
}

export type Session = { token: string; expiresAt: Date };

export function createSession(adminId: number, now = new Date()): Session {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  getDb()
    .prepare(
      `INSERT INTO admin_sessions (token_hash, admin_id, created_at, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(sha256(token), adminId, now.toISOString(), expiresAt.toISOString());
  pruneSessions(now);
  return { token, expiresAt };
}

export function pruneSessions(now = new Date()) {
  getDb()
    .prepare(`DELETE FROM admin_sessions WHERE datetime(expires_at) < datetime(?)`)
    .run(now.toISOString());
}

export function resolveSession(token: string | undefined, now = new Date()): Admin | null {
  if (!token) return null;

  const hash = sha256(token);
  const row = getDb()
    .prepare(
      `SELECT s.token_hash, s.expires_at, a.id, a.email, a.name
         FROM admin_sessions s
         JOIN admins a ON a.id = s.admin_id
        WHERE s.token_hash = ?`
    )
    .get(hash) as
    | { token_hash: string; expires_at: string; id: number; email: string; name: string }
    | undefined;

  if (!row) return null;

  // Constant-time compare on the stored hash as well, so a partial-match timing signal can't
  // be used to probe session tokens.
  const a = Buffer.from(row.token_hash);
  const b = Buffer.from(hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  if (new Date(row.expires_at).getTime() <= now.getTime()) {
    destroySession(token);
    return null;
  }

  return { id: row.id, email: row.email, name: row.name };
}

export function destroySession(token: string | undefined) {
  if (!token) return;
  getDb().prepare(`DELETE FROM admin_sessions WHERE token_hash = ?`).run(sha256(token));
}
