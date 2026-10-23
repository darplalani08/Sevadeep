// GET   /api/admin/opportunities — full catalogue, including deactivated roles
// POST  /api/admin/opportunities — create or update a role
// PATCH /api/admin/opportunities — activate / deactivate a role
//
// The catalogue is administrator-owned data: the seed in server/db/opportunity-seed.ts only runs
// when the table is empty, so edits made here are never overwritten by a restart.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/session";
import {
  listOpportunities,
  setOpportunityActive,
  upsertOpportunity,
} from "@/server/db/opportunities";
import { getMatchWeights } from "@/server/db/volunteers";
import { json, parseJsonBody, serverError, validate } from "@/server/http";

export const dynamic = "force-dynamic";

const opportunitySchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{1,48}$/, "Use lowercase letters, digits and hyphens"),
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(10).max(500),
  requiredSkills: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  interestTags: z.array(z.string().trim().min(1).max(80)).max(20),
  availabilityNeeds: z.array(z.string().trim().min(1).max(80)).max(20),
  location: z.string().trim().min(2).max(80),
  isDemo: z.boolean(),
});

const togglePatchSchema = z.object({
  id: z.string().trim().min(1),
  active: z.boolean(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    return json({
      opportunities: listOpportunities({ includeInactive: true }),
      weights: getMatchWeights(),
    });
  } catch (error) {
    console.error("[admin/opportunities] list failed", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = validate(opportunitySchema, await parseJsonBody(request));
  if (!parsed.ok) return parsed.response;

  try {
    return json({ opportunity: upsertOpportunity(parsed.data) }, { status: 201 });
  } catch (error) {
    console.error("[admin/opportunities] save failed", error);
    return serverError();
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = validate(togglePatchSchema, await parseJsonBody(request));
  if (!parsed.ok) return parsed.response;

  try {
    const ok = setOpportunityActive(parsed.data.id, parsed.data.active);
    if (!ok) return json({ error: "Opportunity not found." }, { status: 404 });
    return json({ ok: true });
  } catch (error) {
    console.error("[admin/opportunities] toggle failed", error);
    return serverError();
  }
}
