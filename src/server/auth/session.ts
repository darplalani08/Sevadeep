// Cookie-backed administrator session handling for Route Handlers and Server Components.

import { cookies } from "next/headers";

import {
  createSession,
  destroySession,
  resolveSession,
  SESSION_TTL_MS,
  type Admin,
} from "@/server/db/admins";

import { SESSION_COOKIE } from "./cookie";

export { SESSION_COOKIE };

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  // Localhost demos run over plain HTTP; the flag is still set automatically in production.
  secure: process.env.NODE_ENV === "production",
};

export async function startSession(adminId: number) {
  const session = createSession(adminId);
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
  const token = store.get(SESSION_COOKIE)?.value;
  destroySession(token);
  store.set(SESSION_COOKIE, "", { ...baseCookieOptions, maxAge: 0 });
}

/** Returns the signed-in administrator, or null. Safe to call from pages and route handlers. */
export async function getCurrentAdmin(): Promise<Admin | null> {
  const store = await cookies();
  return resolveSession(store.get(SESSION_COOKIE)?.value);
}

/**
 * Guard for admin API routes. Returns either the admin or a ready-to-return 401 response, so
 * every protected handler starts with the same two lines.
 */
export async function requireAdmin(): Promise<
  { ok: true; admin: Admin } | { ok: false; response: Response }
> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return {
      ok: false,
      response: Response.json(
        { error: "Administrator sign-in required." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      ),
    };
  }
  return { ok: true, admin };
}
