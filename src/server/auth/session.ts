// Cookie-backed sessions for every account type (administrator, donor, NGO).

import { cookies } from "next/headers";

import { SESSION_COOKIE } from "./cookie";
import {
  createSession,
  destroySession,
  resolveSession,
  SESSION_TTL_MS,
  type Account,
  type AccountRole,
} from "@/server/db/accounts";

export { SESSION_COOKIE };

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  // Localhost runs over plain HTTP; the flag is set automatically in production.
  secure: process.env.NODE_ENV === "production",
};

export async function startSession(accountId: number, clearScopeKey?: string) {
  const session = await createSession(accountId, undefined, clearScopeKey);
  const store = await cookies();
  store.set(SESSION_COOKIE, session.token, {
    ...baseCookieOptions,
    expires: session.expiresAt,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return session;
}

export async function endSession() {
  const store = await cookies();
  await destroySession(store.get(SESSION_COOKIE)?.value);
  store.set(SESSION_COOKIE, "", { ...baseCookieOptions, maxAge: 0 });
}

/** The signed-in account, whatever its role, or null. */
export async function getCurrentAccount(): Promise<Account | null> {
  const store = await cookies();
  return resolveSession(store.get(SESSION_COOKIE)?.value);
}

/** The signed-in administrator, or null if nobody is signed in or the account is not an admin. */
export async function getCurrentAdmin(): Promise<Account | null> {
  const account = await getCurrentAccount();
  return account && account.role === "admin" ? account : null;
}

function unauthorized(message: string) {
  return Response.json({ error: message }, { status: 401, headers: { "Cache-Control": "no-store" } });
}

/**
 * Guard for protected API routes. Returns either the account or a ready-to-return 401, so every
 * protected handler starts with the same two lines.
 *
 * A signed-in donor hitting an admin endpoint gets the same 401 as an anonymous caller: the
 * response never reveals that a valid session exists but lacks the role.
 */
export async function requireAccount(
  role?: AccountRole
): Promise<{ ok: true; account: Account } | { ok: false; response: Response }> {
  const account = await getCurrentAccount();
  if (!account || (role && account.role !== role)) {
    return {
      ok: false,
      response: unauthorized(
        role === "admin" ? "Administrator sign-in required." : "Sign-in required."
      ),
    };
  }
  return { ok: true, account };
}

export function requireAdmin() {
  return requireAccount("admin");
}
