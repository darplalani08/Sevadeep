// First-administrator bootstrap.
//
// No administrator password is ever hardcoded or committed. Until one administrator exists this
// endpoint accepts a single creation request; from then on it is closed permanently. Further
// administrators are added from the dashboard's Settings tab by someone already signed in.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { countAccounts, createAccount } from "@/server/db/accounts";
import { MIN_PASSWORD_LENGTH } from "@/server/auth/password";
import { startSession } from "@/server/auth/session";
import {
  clientKey,
  json,
  parseJsonBody,
  rateLimit,
  serverError,
  tooManyRequests,
  validate,
} from "@/server/http";

export const dynamic = "force-dynamic";

const setupSchema = z.object({
  displayName: z.string().trim().min(2, "Enter the administrator's name").max(100),
  username: z.string().trim().min(3, "Choose a username").max(32),
  email: z.string().trim().max(120).optional(),
  password: z.string().min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters`),
});

export async function GET() {
  try {
    return json({ needsSetup: (await countAccounts("admin")) === 0 });
  } catch (error) {
    console.error("[admin/setup] status check failed", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(`setup:${clientKey(request)}`, { limit: 5, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  try {
    if ((await countAccounts("admin")) > 0) {
      return json(
        { error: "Setup is already complete. Sign in, then add administrators from Settings." },
        { status: 409 }
      );
    }

    const parsed = validate(setupSchema, await parseJsonBody(request));
    if (!parsed.ok) return parsed.response;

    const result = await createAccount({
      username: parsed.data.username,
      password: parsed.data.password,
      role: "admin",
      displayName: parsed.data.displayName,
      email: parsed.data.email,
    });
    if (!result.ok) return json({ error: result.reason }, { status: 400 });

    await startSession(result.account.id);
    return json(
      {
        account: {
          username: result.account.username,
          displayName: result.account.displayName,
          role: result.account.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[admin/setup] failed", error);
    return serverError();
  }
}
