// GET /api/opportunities — the active opportunity catalogue.
//
// Public because the volunteer form needs it to render the "preferred activities" picker and to
// preview matches client-side while the volunteer is still filling the form. It exposes only
// the role definitions — no volunteer or applicant data.

import { listOpportunities } from "@/server/db/opportunities";
import { getMatchWeights } from "@/server/db/volunteers";
import { json, serverError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json({
      // Only the role definitions are public — never the active flag or internal timestamps.
      opportunities: (await listOpportunities()).map((o) => ({
        id: o.id,
        title: o.title,
        summary: o.summary,
        requiredSkills: o.requiredSkills,
        interestTags: o.interestTags,
        availabilityNeeds: o.availabilityNeeds,
        location: o.location,
        isDemo: o.isDemo,
      })),
      weights: await getMatchWeights(),
    });
  } catch (error) {
    console.error("[opportunities] failed to load catalogue", error);
    return serverError("We could not load the opportunity catalogue.");
  }
}
