// GET /api/admin/session — who, if anyone, is signed in. Used by the dashboard shell to detect
// an expired session during polling and send the administrator back to the login page.

import { getCurrentAdmin } from "@/server/auth/session";
import { json, serverError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    return json({ admin }, { status: admin ? 200 : 401 });
  } catch (error) {
    console.error("[admin/session] failed", error);
    return serverError();
  }
}
