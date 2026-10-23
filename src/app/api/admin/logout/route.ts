// POST /api/admin/logout — destroys the server-side session row and clears the cookie.

import { endSession } from "@/server/auth/session";
import { json, serverError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await endSession();
    return json({ ok: true });
  } catch (error) {
    console.error("[admin/logout] failed", error);
    return serverError();
  }
}
