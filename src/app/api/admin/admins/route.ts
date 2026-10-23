// GET  /api/admin/admins — who can sign in (no hashes, ever)
// POST /api/admin/admins — a signed-in administrator adds another one
//
// This is how administrators are added after the one-time /admin/setup screen. The password is
// typed by the person who will use it, hashed with scrypt server-side, and only the hash is
// stored — no password is ever hardcoded, logged or committed.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/session";
import { createAdmin, listAdmins } from "@/server/db/admins";
import { MIN_PASSWORD_LENGTH } from "@/server/auth/password";
import { json, parseJsonBody, serverError, validate } from "@/server/http";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(2, "Enter the administrator's name").max(100),
  email: z.email("Enter a valid email address"),
  password: z.string().min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters`),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    return json({ admins: listAdmins() });
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
    const result = await createAdmin(parsed.data.email, parsed.data.name, parsed.data.password);
    if (!result.ok) return json({ error: result.reason }, { status: 400 });
    return json({ admin: result.admin }, { status: 201 });
  } catch (error) {
    console.error("[admin/admins] create failed", error);
    return serverError();
  }
}
