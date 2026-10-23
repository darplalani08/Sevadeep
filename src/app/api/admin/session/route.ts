// GET /api/admin/session — who, if anyone, is signed in as an administrator. The dashboard shell
// uses it to notice an expired session during polling and send the administrator back to login.

import { getCurrentAdmin } from "@/server/auth/session";
import { json, serverError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return json({ admin: null }, { status: 401 });
    return json({
      admin: { username: admin.username, displayName: admin.displayName, role: admin.role },
    });
  } catch (error) {
    console.error("[admin/session] failed", error);
    return serverError();
  }
}
