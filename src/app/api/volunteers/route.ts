// POST /api/volunteers — register a volunteer and return their ranked opportunity matches.
//
// Scores are computed server-side from the persisted opportunity catalogue and stored alongside
// the registration, so the dashboard shows exactly what the volunteer was shown.

import type { NextRequest } from "next/server";

import { volunteerSchema } from "@/lib/validations/volunteer";
import { createVolunteer } from "@/server/db/volunteers";
import {
  clientKey,
  json,
  parseJsonBody,
  rateLimit,
  serverError,
  tooManyRequests,
  validate,
} from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limit = rateLimit(`volunteer:${clientKey(request)}`, {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const parsed = validate(volunteerSchema, await parseJsonBody(request));
  if (!parsed.ok) return parsed.response;

  const values = parsed.data;

  try {
    const result = createVolunteer({
      fullName: values.fullName,
      email: values.email,
      mobile: values.mobile,
      dateOfBirth: values.dateOfBirth,
      bloodGroup: values.bloodGroup,
      aadhar: values.aadhar,
      category: values.category,
      areaOfInterest: values.areaOfInterest,
      skills: values.skills,
      interests: values.interests,
      availability: values.availability,
      preferredActivities: values.preferredActivities,
      hoursPerWeek: values.hoursPerWeek,
    });

    if (!result.ok) {
      return json(
        {
          error:
            "You have already registered with these details. The team will be in touch — no need to register again.",
          code: "duplicate",
          reference: result.reference,
        },
        { status: 409 }
      );
    }

    return json(
      {
        reference: result.reference,
        matches: result.matches,
        weights: result.weights,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[volunteers] failed to save registration", error);
    return serverError("We could not save your registration. Please try again.");
  }
}
