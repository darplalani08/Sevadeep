// Accounts, sessions and login rate limiting — Postgres.
//
// One table for every human login (administrator, donor, NGO), distinguished by `role`. A single
// credential format (scrypt), a single session mechanism and one place to audit, rather than
// three parallel systems.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { getSql, queryOne, type Sql } from "./sql.ts";
import { checkPasswordPolicy, hashPassword, verifyPassword } from "../auth/password.ts";

export const accountRoles = ["admin", "donor", "ngo"] as const;
export type AccountRole = (typeof accountRoles)[number];

export type Account = {
  id: number;
  username: string;
  role: AccountRole;
  displayName: string;
  email: string | null;
  organisation: string | null;
};

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

/** Usernames are case-insensitive to the user and stored lowercase. */
export function normaliseUsername(username: string): string {
  return username.trim().toLowerCase();
}

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function checkUsername(username: string): { ok: true } | { ok: false; reason: string } {
  const clean = normaliseUsername(username);
  if (!USERNAME_PATTERN.test(clean)) {
    return {
      ok: false,
      reason:
        "Usernames are 3–32 characters, start with a letter or digit, and use only letters, digits, dots, hyphens and underscores.",
    };
  }
  return { ok: true };
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

type AccountRow = {
  id: string | number;
  username: string;
  role: AccountRole;
  display_name: string;
  email: string | null;
  organisation: string | null;
};

function toAccount(row: AccountRow): Account {
  return {
    id: Number(row.id),
    username: row.username,
    role: row.role,
    displayName: row.display_name,
    email: row.email,
    organisation: row.organisation,
  };
}

export async function countAccounts(role?: AccountRole): Promise<number> {
  const sql = await getSql();
  const rows = role
    ? await sql.query<{ count: string }>(
        `select count(*)::text as count from public.accounts where role = $1`,
        [role]
      )
    : await sql.query<{ count: string }>(`select count(*)::text as count from public.accounts`);
  return Number(rows[0].count);
}

export async function listAccounts(role?: AccountRole): Promise<Account[]> {
  const sql = await getSql();
  const rows = role
    ? await sql.query<AccountRow>(
        `select id, username, role, display_name, email, organisation
           from public.accounts where role = $1 order by id`,
        [role]
      )
    : await sql.query<AccountRow>(
        `select id, username, role, display_name, email, organisation
           from public.accounts order by id`
      );
  return rows.map(toAccount);
}

export async function findAccountByUsername(username: string): Promise<Account | null> {
  const sql = await getSql();
  const row = await queryOne<AccountRow>(
    sql,
    `select id, username, role, display_name, email, organisation
       from public.accounts where username = $1`,
    [normaliseUsername(username)]
  );
  return row ? toAccount(row) : null;
}

export type CreateAccountInput = {
  username: string;
  password: string;
  role: AccountRole;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  organisation?: string | null;
};

export type CreateAccountResult =
  | { ok: true; account: Account }
  | { ok: false; reason: string };

export async function createAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
  const username = normaliseUsername(input.username);

  const usernameCheck = checkUsername(username);
  if (!usernameCheck.ok) return { ok: false, reason: usernameCheck.reason };

  if (input.displayName.trim().length < 2) {
    return { ok: false, reason: "Enter a name." };
  }

  const policy = checkPasswordPolicy(input.password);
  if (!policy.ok) return { ok: false, reason: policy.reason };

  const sql = await getSql();
  const passwordHash = await hashPassword(input.password);

  try {
    const rows = await sql.query<AccountRow>(
      `insert into public.accounts (username, role, display_name, email, phone, organisation, password_hash)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id, username, role, display_name, email, organisation`,
      [
        username,
        input.role,
        input.displayName.trim(),
        input.email?.trim() || null,
        input.phone?.trim() || null,
        input.organisation?.trim() || null,
        passwordHash,
      ]
    );
    return { ok: true, account: toAccount(rows[0]) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("accounts_username_key") || message.includes("duplicate key")) {
      return { ok: false, reason: "That username is already taken." };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Rate limiting — counted in the database so a restart does not clear it
// ---------------------------------------------------------------------------

export async function recordLoginFailure(scopeKey: string): Promise<void> {
  const sql = await getSql();
  await sql.query(`insert into public.login_attempts (scope_key) values ($1)`, [scopeKey]);
}

export async function clearLoginFailures(scopeKey: string): Promise<void> {
  const sql = await getSql();
  await sql.query(`delete from public.login_attempts where scope_key = $1`, [scopeKey]);
}

export async function isRateLimited(scopeKey: string): Promise<boolean> {
  const sql = await getSql();
  const cutoff = new Date(Date.now() - ATTEMPT_WINDOW_MS).toISOString();
  // Asynchronously prune expired attempts without blocking the latency-critical rate check
  sql.query(`delete from public.login_attempts where created_at < $1`, [cutoff]).catch(() => {});
  const rows = await sql.query<{ count: string }>(
    `select count(*)::text as count from public.login_attempts
      where scope_key = $1 and created_at >= $2`,
    [scopeKey, cutoff]
  );
  return Number(rows[0].count) >= MAX_ATTEMPTS;
}

// ---------------------------------------------------------------------------
// Authentication & sessions
// ---------------------------------------------------------------------------

// In-memory cache for resolved session tokens.
// Eliminates 1 database round-trip on every live data poll and tab navigation.
type CachedSession = { account: Account; cachedAt: number };
const sessionCache = new Map<string, CachedSession>();
const SESSION_CACHE_TTL_MS = 30_000; // 30 seconds

// A structurally valid hash that no password matches, used to equalise login timing for unknown
// usernames so the response cannot be used to discover which accounts exist.
const DUMMY_HASH = `scrypt$16384$8$1$${"ab".repeat(16)}$${"cd".repeat(64)}`;

export async function authenticate(
  username: string,
  password: string,
  role?: AccountRole
): Promise<Account | null> {
  const sql = await getSql();
  const row = await queryOne<AccountRow & { password_hash: string; status: string }>(
    sql,
    `select id, username, role, display_name, email, organisation, password_hash, status
       from public.accounts where username = $1`,
    [normaliseUsername(username)]
  );

  if (!row) {
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }

  const ok = await verifyPassword(password, row.password_hash);
  // Role and status are checked only after the password, so a wrong password and a
  // wrong-role-but-right-password both look identical from outside.
  if (!ok || row.status !== "active" || (role && row.role !== role)) return null;

  // Asynchronously record last login timestamp without adding an extra blocking round-trip
  sql.query(`update public.accounts set last_login_at = now() where id = $1`, [row.id]).catch(() => {});
  return toAccount(row);
}

export type Session = { token: string; expiresAt: Date };

export async function createSession(
  accountId: number,
  userAgent?: string,
  clearScopeKey?: string
): Promise<Session> {
  const sql = await getSql();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const tokenHash = sha256(token);

  if (clearScopeKey) {
    // Single round-trip: clear failure attempts and insert session together
    await sql.query(
      `with d as (
         delete from public.login_attempts where scope_key = $1
       )
       insert into public.sessions (token_hash, account_id, expires_at, user_agent)
       values ($2, $3, $4, $5)`,
      [clearScopeKey, tokenHash, accountId, expiresAt.toISOString(), userAgent ?? null]
    );
  } else {
    await sql.query(
      `insert into public.sessions (token_hash, account_id, expires_at, user_agent)
       values ($1, $2, $3, $4)`,
      [tokenHash, accountId, expiresAt.toISOString(), userAgent ?? null]
    );
  }

  // Non-blocking cleanup of expired sessions
  sql.query(`delete from public.sessions where expires_at < now()`).catch(() => {});

  return { token, expiresAt };
}

export async function resolveSession(token: string | undefined): Promise<Account | null> {
  if (!token) return null;
  const hash = sha256(token);

  const cached = sessionCache.get(hash);
  if (cached && Date.now() - cached.cachedAt < SESSION_CACHE_TTL_MS) {
    return cached.account;
  }

  const sql = await getSql();
  const row = await queryOne<AccountRow & { token_hash: string; status: string }>(
    sql,
    `select a.id, a.username, a.role, a.display_name, a.email, a.organisation, a.status,
            s.token_hash
       from public.sessions s
       join public.accounts a on a.id = s.account_id
      where s.token_hash = $1 and s.expires_at > now()`,
    [hash]
  );
  if (!row || row.status !== "active") {
    sessionCache.delete(hash);
    return null;
  }

  // Constant-time compare on the stored hash as well, so a partial-match timing signal cannot be
  // used to probe session tokens.
  const a = Buffer.from(row.token_hash);
  const b = Buffer.from(hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    sessionCache.delete(hash);
    return null;
  }

  const account = toAccount(row);
  sessionCache.set(hash, { account, cachedAt: Date.now() });
  return account;
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  const hash = sha256(token);
  sessionCache.delete(hash);
  const sql = await getSql();
  await sql.query(`delete from public.sessions where token_hash = $1`, [hash]);
}

/** Revokes every session for an account — used when a password changes. */
export async function destroyAllSessions(accountId: number, sql?: Sql): Promise<void> {
  sessionCache.clear();
  const db = sql ?? (await getSql());
  await db.query(`delete from public.sessions where account_id = $1`, [accountId]);
}
