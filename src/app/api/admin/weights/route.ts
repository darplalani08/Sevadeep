// GET  /api/admin/weights — the matching weights currently in force
// POST /api/admin/weights — change them
//
// Weights are read with env-override-then-database-then-default precedence (see
// server/db/volunteers.ts), so an installation can pin them in .env.local and this endpoint then
// reports the effective values.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/session";
import { getMatchWeights, setMatchWeights } from "@/server/db/volunteers";
import { json, parseJsonBody, serverError, validate } from "@/server/http";

export const dynamic = "force-dynamic";

const weightsSchema = z
  .object({
    skill: z.number().min(0).max(1),
    interest: z.number().min(0).max(1),
    availability: z.number().min(0).max(1),
    preferenceBoost: z.number().min(0).max(25),
  })
  .refine(
    (value) => Math.abs(value.skill + value.interest + value.availability - 1) < 0.001,
    "Skill, interest and availability weights must add up to 1."
  );

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    return json({ weights: await getMatchWeights() });
  } catch (error) {
    console.error("[admin/weights] read failed", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = validate(weightsSchema, await parseJsonBody(request));
  if (!parsed.ok) return parsed.response;

  try {
    setMatchWeights(parsed.data);
    return json({ weights: await getMatchWeights() });
  } catch (error) {
    console.error("[admin/weights] write failed", error);
    return serverError();
  }
}
