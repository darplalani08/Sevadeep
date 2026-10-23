// POST /api/admin/login — administrator sign-in.
//
// Failures are counted in SQLite per email+client so the limit survives a server restart, and
// the response never distinguishes "unknown email" from "wrong password".

import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  authenticate,
  clearLoginFailures,
  isRateLimited,
  recordLoginFailure,
} from "@/server/db/admins";
import { startSession } from "@/server/auth/session";
import { clientKey, json, parseJsonBody, serverError, validate } from "@/server/http";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password").max(200),
});

export async function POST(request: NextRequest) {
  const parsed = validate(loginSchema, await parseJsonBody(request));
  if (!parsed.ok) return parsed.response;

  const scope = `login:${parsed.data.email.toLowerCase()}:${clientKey(request)}`;

  try {
    if (isRateLimited(scope)) {
      return json(
        { error: "Too many failed sign-in attempts. Please try again in a few minutes." },
        { status: 429, headers: { "Retry-After": "600" } }
      );
    }

    const admin = await authenticate(parsed.data.email, parsed.data.password);
    if (!admin) {
      recordLoginFailure(scope);
      return json({ error: "Incorrect email or password." }, { status: 401 });
    }

    clearLoginFailures(scope);
    await startSession(admin.id);
    return json({ admin });
  } catch (error) {
    console.error("[admin/login] failed", error);
    return serverError();
  }
}
