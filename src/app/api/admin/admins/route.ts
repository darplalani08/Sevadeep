// GET  /api/admin/admins — who can sign in (never a hash)
// POST /api/admin/admins — a signed-in administrator adds another one

import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/session";
import { createAccount, listAccounts } from "@/server/db/accounts";
import { MIN_PASSWORD_LENGTH } from "@/server/auth/password";
import { json, parseJsonBody, serverError, validate } from "@/server/http";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  displayName: z.string().trim().min(2, "Enter the administrator's name").max(100),
  username: z.string().trim().min(3, "Choose a username").max(32),
  email: z.string().trim().max(120).optional(),
  password: z.string().min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters`),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const admins = (await listAccounts("admin")).map((a) => ({
      id: a.id,
      username: a.username,
      displayName: a.displayName,
      email: a.email,
    }));
    return json({ admins });
  } catch (error) {
    console.error("[admin/admins] list failed", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = validate(createSchema, await parseJsonBody(request));
  if (!parsed.ok) return parsed.response;

  try {
    const result = await createAccount({
      username: parsed.data.username,
      password: parsed.data.password,
      role: "admin",
      displayName: parsed.data.displayName,
      email: parsed.data.email,
    });
    if (!result.ok) return json({ error: result.reason }, { status: 400 });
    return json({ admin: result.account }, { status: 201 });
  } catch (error) {
    console.error("[admin/admins] create failed", error);
    return serverError();
  }
}
