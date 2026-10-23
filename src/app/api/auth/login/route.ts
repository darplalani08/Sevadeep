// POST /api/auth/login — donor and NGO sign-in with username and password.
//
// Administrators sign in at /api/admin/login instead, so an administrator credential cannot be
// used on a public login surface (and vice versa): `authenticate` is given the expected role and
// returns null on a mismatch, with the same message as a wrong password.

import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  accountRoles,
  authenticate,
  clearLoginFailures,
  isRateLimited,
  normaliseUsername,
  recordLoginFailure,
} from "@/server/db/accounts";
import { startSession } from "@/server/auth/session";
import { loginSchema } from "@/lib/validations/auth";
import { clientKey, json, parseJsonBody, serverError, validate } from "@/server/http";

export const dynamic = "force-dynamic";

const schema = loginSchema.extend({
  role: z.enum(accountRoles.filter((r) => r !== "admin") as ["donor", "ngo"]),
});

export async function POST(request: NextRequest) {
  const parsed = validate(schema, await parseJsonBody(request));
  if (!parsed.ok) return parsed.response;

  const username = normaliseUsername(parsed.data.username);
  const scope = `login:${parsed.data.role}:${username}:${clientKey(request)}`;

  try {
    if (await isRateLimited(scope)) {
      return json(
        { error: "Too many failed sign-in attempts. Please try again in a few minutes." },
        { status: 429, headers: { "Retry-After": "600" } }
      );
    }

    const account = await authenticate(username, parsed.data.password, parsed.data.role);
    if (!account) {
      await recordLoginFailure(scope);
      return json({ error: "Incorrect username or password." }, { status: 401 });
    }

    await clearLoginFailures(scope);
    await startSession(account.id);
    return json({
      account: {
        username: account.username,
        displayName: account.displayName,
        role: account.role,
      },
    });
  } catch (error) {
    console.error("[auth/login] failed", error);
    return serverError();
  }
}
