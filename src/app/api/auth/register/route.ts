// POST /api/auth/register — donor and NGO registration.
//
// Only donor and NGO accounts can be self-registered. Administrator accounts are created by the
// one-time setup screen or by an existing administrator, never from a public endpoint.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { createAccount } from "@/server/db/accounts";
import { startSession } from "@/server/auth/session";
import { registerSchema } from "@/lib/validations/auth";
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

const schema = z.intersection(
  registerSchema,
  z.object({ role: z.enum(["donor", "ngo"]) })
);

export async function POST(request: NextRequest) {
  const limit = rateLimit(`register:${clientKey(request)}`, {
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const parsed = validate(schema, await parseJsonBody(request));
  if (!parsed.ok) return parsed.response;

  try {
    const result = await createAccount({
      username: parsed.data.username,
      password: parsed.data.password,
      role: parsed.data.role,
      displayName: parsed.data.displayName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      organisation: parsed.data.role === "ngo" ? parsed.data.organisation : null,
    });

    if (!result.ok) {
      // "That username is already taken" is unavoidable on a registration form — the user has to
      // be told to pick another. It is not an enumeration leak the login endpoint shares.
      return json({ error: result.reason }, { status: 400 });
    }

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
    console.error("[auth/register] failed", error);
    return serverError();
  }
}
