// POST /api/enrollment — create a student enrolment application.
//
// The same Zod schema the browser form uses is re-run here, so a crafted request cannot bypass
// validation. A reference and a private tracking code are only returned after the row is
// committed, so the UI can never show success for an unsaved application.

import type { NextRequest } from "next/server";

import { enrollmentSchema } from "@/lib/validations/enrollment";
import { createApplication } from "@/server/db/applications";
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
  const limit = rateLimit(`enrollment:${clientKey(request)}`, {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const parsed = validate(enrollmentSchema, await parseJsonBody(request));
  if (!parsed.ok) return parsed.response;

  const values = parsed.data;

  try {
    const result = createApplication({
      studentName: values.studentName,
      guardianName: values.guardianName,
      contactNumber: values.contactNumber,
      email: values.email,
      studentAge: values.studentAge,
      studentClass: values.studentClass,
      city: values.city,
      supportNeeded: values.supportNeeded,
      notes: values.notes,
    });

    if (!result.ok) {
      return json(
        {
          error:
            "This application has already been submitted. Use the reference below on the tracking page with the code you were given.",
          code: "duplicate",
          reference: result.reference,
        },
        { status: 409 }
      );
    }

    return json(
      {
        reference: result.reference,
        trackingCode: result.trackingCode,
        status: result.status,
        submittedAt: result.submittedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[enrollment] failed to save application", error);
    return serverError("We could not save your application. Please try again.");
  }
}
