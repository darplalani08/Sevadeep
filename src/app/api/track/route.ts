// POST /api/track — public application status lookup.
//
// Requires BOTH the reference and the private 6-character tracking code, and returns only
// non-identifying fields (status, dates, requested support, the student's first name). Contact
// numbers, emails, guardian names and internal notes are never included in this response.
// Rate limited so the code space cannot be brute forced.

import type { NextRequest } from "next/server";

import { trackingLookupSchema } from "@/lib/validations/enrollment";
import { statusGuidance } from "@content/education";
import { getPublicStatus } from "@/server/db/applications";
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
  // Generous enough for a tracking page polling every 4s, tight enough to make guessing a
  // 6-character code over ~1.5 billion combinations hopeless.
  const limit = rateLimit(`track:${clientKey(request)}`, { limit: 90, windowMs: 60 * 1000 });
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const parsed = validate(trackingLookupSchema, await parseJsonBody(request));
  if (!parsed.ok) return parsed.response;

  try {
    const status = await getPublicStatus(parsed.data.reference, parsed.data.code);
    if (!status) {
      // One message for "no such reference" and "wrong code" alike, so the endpoint cannot be
      // used to discover which references exist.
      return json(
        { error: "No application matches that reference and tracking code." },
        { status: 404 }
      );
    }

    return json({
      application: status,
      guidance: statusGuidance[status.status],
    });
  } catch (error) {
    console.error("[track] lookup failed", error);
    return serverError("We could not look up that application. Please try again.");
  }
}
