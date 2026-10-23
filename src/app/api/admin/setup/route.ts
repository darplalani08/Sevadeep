// First-administrator bootstrap.
//
// No administrator password is ever hardcoded or committed. Until one account exists this
// endpoint accepts a single creation request; from then on it is closed permanently (the GET
// reports `needsSetup: false` and the POST returns 409). Further administrators are added with
// `npm run admin:create`, which reads the password from a hidden terminal prompt.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { adminCount, createAdmin } from "@/server/db/admins";
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
  name: z.string().trim().min(2, "Enter the administrator's name").max(100),
  email: z.email("Enter a valid email address"),
  password: z.string().min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters`),
});

export async function GET() {
  try {
    return json({ needsSetup: adminCount() === 0 });
  } catch (error) {
    console.error("[admin/setup] status check failed", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(`setup:${clientKey(request)}`, { limit: 5, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  try {
    if (adminCount() > 0) {
      return json(
        {
          error:
            "Setup is already complete. Use `npm run admin:create` to add another administrator.",
        },
        { status: 409 }
      );
    }

    const parsed = validate(setupSchema, await parseJsonBody(request));
    if (!parsed.ok) return parsed.response;

    const result = await createAdmin(parsed.data.email, parsed.data.name, parsed.data.password);
    if (!result.ok) return json({ error: result.reason }, { status: 400 });

    await startSession(result.admin.id);
    return json({ admin: result.admin }, { status: 201 });
  } catch (error) {
    console.error("[admin/setup] failed", error);
    return serverError();
  }
}
