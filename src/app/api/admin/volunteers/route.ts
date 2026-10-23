// GET /api/admin/volunteers — searchable, filterable volunteer list with stored match results.

import type { NextRequest } from "next/server";

import { requireAdmin } from "@/server/auth/session";
import { listVolunteers, volunteerStatuses, type VolunteerStatus } from "@/server/db/volunteers";
import { json, serverError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const params = request.nextUrl.searchParams;
    const statusParam = params.get("status") ?? "all";
    const status = (volunteerStatuses as readonly string[]).includes(statusParam)
      ? (statusParam as VolunteerStatus)
      : "all";

    const limit = Number(params.get("limit") ?? 100);
    const offset = Number(params.get("offset") ?? 0);

    const { items, total } = listVolunteers({
      status,
      skill: params.get("skill") ?? undefined,
      availability: params.get("availability") ?? undefined,
      search: params.get("search") ?? undefined,
      limit: Number.isFinite(limit) ? limit : 100,
      offset: Number.isFinite(offset) ? offset : 0,
    });

    return json({ items, total });
  } catch (error) {
    console.error("[admin/volunteers] list failed", error);
    return serverError();
  }
}
