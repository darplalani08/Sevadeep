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
      opportunities: listOpportunities().map(({ active, createdAt, ...rest }) => {
        void active;
        void createdAt;
        return rest;
      }),
      weights: getMatchWeights(),
    });
  } catch (error) {
    console.error("[opportunities] failed to load catalogue", error);
    return serverError("We could not load the opportunity catalogue.");
  }
}
