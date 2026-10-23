// GET /api/admin/applications — searchable, status-filtered application list.
// Contains applicant contact details, so it is admin-only and never cached.

import type { NextRequest } from "next/server";

import { requireAdmin } from "@/server/auth/session";
import { listApplications } from "@/server/db/applications";
import { applicationStatuses, type ApplicationStatus } from "@content/education";
import { json, serverError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const params = request.nextUrl.searchParams;
    const statusParam = params.get("status") ?? "all";
    const status = (applicationStatuses as readonly string[]).includes(statusParam)
      ? (statusParam as ApplicationStatus)
      : "all";

    const limit = Number(params.get("limit") ?? 100);
    const offset = Number(params.get("offset") ?? 0);

    const { items, total } = listApplications({
      status,
      search: params.get("search") ?? undefined,
      limit: Number.isFinite(limit) ? limit : 100,
      offset: Number.isFinite(offset) ? offset : 0,
    });

    return json({ items, total });
  } catch (error) {
    console.error("[admin/applications] list failed", error);
    return serverError();
  }
}
