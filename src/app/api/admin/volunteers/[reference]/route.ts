// PATCH /api/admin/volunteers/:reference — move a volunteer through the follow-up workflow.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/session";
import { updateVolunteerStatus, volunteerStatuses } from "@/server/db/volunteers";
import { json, parseJsonBody, serverError, validate } from "@/server/http";

export const dynamic = "force-dynamic";

const patchSchema = z.object({ status: z.enum(volunteerStatuses) });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = validate(patchSchema, await parseJsonBody(request));
  if (!parsed.ok) return parsed.response;

  try {
    const { reference } = await params;
    const volunteer = await updateVolunteerStatus(reference, parsed.data.status);
    if (!volunteer) return json({ error: "Volunteer not found." }, { status: 404 });
    return json({ volunteer });
  } catch (error) {
    console.error("[admin/volunteers] status update failed", error);
    return serverError();
  }
}
