// GET /api/admin/overview — live dashboard statistics and chart series.
// Protected: every number comes from the database and is only served to a signed-in admin.

import { requireAdmin } from "@/server/auth/session";
import { getOverview } from "@/server/db/analytics";
import { json, serverError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    return json(await getOverview());
  } catch (error) {
    console.error("[admin/overview] failed", error);
    return serverError();
  }
}
