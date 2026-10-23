// GET    /api/admin/applications/:reference  — full record plus status history
// PATCH  /api/admin/applications/:reference  — change the status (admins only)

import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/session";
import {
  getApplicationByReference,
  getApplicationEvents,
  updateApplicationStatus,
} from "@/server/db/applications";
import { applicationStatuses } from "@content/education";
import { json, parseJsonBody, serverError, validate } from "@/server/http";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(applicationStatuses),
  note: z.string().trim().max(500).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { reference } = await params;
    const application = getApplicationByReference(reference);
    if (!application) return json({ error: "Application not found." }, { status: 404 });

    return json({ application, history: getApplicationEvents(application.id) });
  } catch (error) {
    console.error("[admin/applications] fetch failed", error);
    return serverError();
  }
}

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
    const result = updateApplicationStatus(
      reference,
      parsed.data.status,
      auth.admin.email,
      parsed.data.note
    );

    if (!result.ok) {
      if (result.code === "not_found") {
        return json({ error: "Application not found." }, { status: 404 });
      }
      if (result.code === "unchanged") {
        const application = getApplicationByReference(reference);
        return json({ application, unchanged: true });
      }
      return json({ error: "That status is not valid." }, { status: 400 });
    }

    return json({
      application: result.application,
      history: getApplicationEvents(result.application.id),
    });
  } catch (error) {
    console.error("[admin/applications] status update failed", error);
    return serverError();
  }
}
