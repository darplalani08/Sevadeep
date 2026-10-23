// POST /api/admin/login — administrator sign-in with username and password.
//
// Failures are counted in Postgres per username+client so the limit survives a restart and is
// shared across serverless instances. The response never distinguishes an unknown username from
// a wrong password, a suspended account or a non-administrator account.

import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  authenticate,
  isRateLimited,
  normaliseUsername,
  recordLoginFailure,
} from "@/server/db/accounts";
import { startSession } from "@/server/auth/session";
import { clientKey, json, parseJsonBody, serverError, validate } from "@/server/http";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username").max(64),
  password: z.string().min(1, "Enter your password").max(200),
});

export async function POST(request: NextRequest) {
  const parsed = validate(loginSchema, await parseJsonBody(request));
  if (!parsed.ok) return parsed.response;

  const username = normaliseUsername(parsed.data.username);
  const scope = `login:admin:${username}:${clientKey(request)}`;

  try {
    if (await isRateLimited(scope)) {
      return json(
        { error: "Too many failed sign-in attempts. Please try again in a few minutes." },
        { status: 429, headers: { "Retry-After": "600" } }
      );
    }

    const account = await authenticate(username, parsed.data.password, "admin");
    if (!account) {
      await recordLoginFailure(scope);
      return json({ error: "Incorrect username or password." }, { status: 401 });
    }

    await startSession(account.id, scope);
    return json({
      account: { username: account.username, displayName: account.displayName, role: account.role },
    });
  } catch (error) {
    console.error("[admin/login] failed", error);
    return serverError();
  }
}
