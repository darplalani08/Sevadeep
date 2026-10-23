// Unit tests for the volunteer matching engine.
// Run with: npm test   (node --test --experimental-strip-types)

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defaultWeights,
  matchVolunteer,
  scoreOpportunity,
  type Opportunity,
} from "../src/lib/matching/engine.ts";

const teaching: Opportunity = {
  id: "teaching-support",
  title: "Teaching Support",
  summary: "After-school classes.",
  requiredSkills: ["Teaching & Tutoring", "Spoken English", "Mathematics"],
  interestTags: ["Child Education", "Skill Development"],
  availabilityNeeds: ["Weekday Evenings", "Weekends"],
  location: "Pune",
  isDemo: true,
};

const driving: Opportunity = {
  id: "donation-pickup",
  title: "Donation Pickup",
  summary: "Doorstep collection.",
  requiredSkills: ["Driving", "Logistics & Sorting"],
  interestTags: ["Donation Drives"],
  availabilityNeeds: ["Weekends"],
  location: "Pune",
  isDemo: true,
};

describe("scoreOpportunity", () => {
  it("gives a perfect score when skills, interests and schedule all line up", () => {
    const result = scoreOpportunity(
      {
        skills: ["Teaching & Tutoring", "Spoken English", "Mathematics"],
        interests: ["Child Education", "Skill Development"],
        availability: ["Weekends"],
      },
      teaching
    );
    assert.equal(result.score, 100);
    assert.equal(result.skillScore, 100);
    assert.equal(result.interestScore, 100);
    assert.equal(result.availabilityScore, 100);
  });

  it("applies the documented 50/30/20 weighting", () => {
    // 1 of 3 skills (33.3), 1 of 2 interests (50), availability overlaps (100)
    const result = scoreOpportunity(
      {
        skills: ["Teaching & Tutoring"],
        interests: ["Child Education"],
        availability: ["Weekday Evenings"],
      },
      teaching
    );
    const expected = Math.round(0.5 * (100 / 3) + 0.3 * 50 + 0.2 * 100);
    assert.equal(result.score, expected);
    assert.equal(result.skillScore, 33);
  });

  it("treats availability as a gate, not a proportion", () => {
    const base = {
      skills: ["Driving", "Logistics & Sorting"],
      interests: ["Donation Drives"],
    };
    const fits = scoreOpportunity({ ...base, availability: ["Weekends"] }, driving);
    const clashes = scoreOpportunity({ ...base, availability: ["Weekday Mornings"] }, driving);

    assert.equal(fits.availabilityScore, 100);
    assert.equal(clashes.availabilityScore, 0);
    assert.equal(fits.score - clashes.score, 20);
  });

  it("treats 'Flexible' as a wildcard on the volunteer's side", () => {
    const result = scoreOpportunity(
      { skills: ["Driving"], interests: [], availability: ["Flexible"] },
      driving
    );
    assert.equal(result.availabilityScore, 100);
  });

  it("adds the preference boost only for a named activity, and never exceeds 100", () => {
    const profile = {
      skills: ["Driving", "Logistics & Sorting"],
      interests: ["Donation Drives"],
      availability: ["Weekends"],
    };
    const without = scoreOpportunity(profile, driving);
    const withPreference = scoreOpportunity(
      { ...profile, preferredActivities: ["Donation Pickup"] },
      driving
    );

    assert.equal(without.score, 100);
    assert.equal(withPreference.preferred, true);
    assert.equal(withPreference.score, 100, "clamped, not 110");

    const partial = scoreOpportunity(
      { skills: ["Driving"], interests: [], availability: [], preferredActivities: ["donation-pickup"] },
      driving
    );
    const partialWithout = scoreOpportunity(
      { skills: ["Driving"], interests: [], availability: [] },
      driving
    );
    assert.equal(partial.score - partialWithout.score, defaultWeights.preferenceBoost);
  });

  it("handles missing inputs without throwing and keeps scores in 0-100", () => {
    const empty = scoreOpportunity({ skills: [], interests: [], availability: [] }, teaching);
    assert.equal(empty.score, 0);

    // @ts-expect-error — deliberately passing junk the way a crafted request would
    const junk = scoreOpportunity({ skills: null, interests: undefined, availability: 5 }, teaching);
    assert.ok(junk.score >= 0 && junk.score <= 100);

    const noRequirements = scoreOpportunity(
      { skills: [], interests: [], availability: [] },
      { ...teaching, requiredSkills: [], interestTags: [], availabilityNeeds: [] }
    );
    assert.equal(noRequirements.score, 100, "a role that asks for nothing is satisfied by anyone");
  });

  it("normalises case and whitespace when comparing", () => {
    const result = scoreOpportunity(
      {
        skills: ["  teaching & TUTORING  ", "spoken   english", "Mathematics"],
        interests: ["child education", "Skill Development"],
        availability: ["WEEKENDS"],
      },
      teaching
    );
    assert.equal(result.score, 100);
  });

  it("de-duplicates repeated inputs so they cannot inflate a score", () => {
    const result = scoreOpportunity(
      {
        skills: ["Teaching & Tutoring", "Teaching & Tutoring", "teaching & tutoring"],
        interests: [],
        availability: [],
      },
      teaching
    );
    assert.equal(result.skillScore, 33);
  });

  it("reports which skills matched and which the team would train", () => {
    const result = scoreOpportunity(
      { skills: ["Mathematics"], interests: [], availability: [] },
      teaching
    );
    assert.deepEqual(result.matchedSkills, ["Mathematics"]);
    assert.deepEqual(result.missingSkills, ["Teaching & Tutoring", "Spoken English"]);
    assert.match(result.rationale, /mathematics/i);
  });
});

describe("matchVolunteer", () => {
  const catalogue = [teaching, driving];

  it("ranks by score, applies the limit and drops zero scores", () => {
    const results = matchVolunteer(
      {
        skills: ["Driving", "Logistics & Sorting"],
        interests: ["Donation Drives"],
        availability: ["Weekends"],
      },
      catalogue
    );

    assert.equal(results[0].opportunityId, "donation-pickup");
    assert.ok(results.every((r) => r.score >= 1));

    const limited = matchVolunteer(
      { skills: ["Driving", "Teaching & Tutoring"], interests: [], availability: ["Flexible"] },
      catalogue,
      defaultWeights,
      { limit: 1 }
    );
    assert.equal(limited.length, 1);
  });

  it("returns nothing rather than noise when nothing fits", () => {
    const results = matchVolunteer(
      { skills: ["Carpentry & Repairs"], interests: ["Animal Care"], availability: [] },
      catalogue
    );
    assert.equal(results.length, 0);
  });

  it("is deterministic — the client preview and the stored server result agree", () => {
    const profile = {
      skills: ["Teaching & Tutoring", "Driving"],
      interests: ["Child Education", "Donation Drives"],
      availability: ["Weekends"],
    };
    const a = matchVolunteer(profile, catalogue);
    const b = matchVolunteer(profile, catalogue);
    assert.deepEqual(a, b);
  });

  it("respects reconfigured weights", () => {
    const profile = {
      skills: ["Teaching & Tutoring", "Spoken English", "Mathematics"],
      interests: [],
      availability: [],
    };
    const skillOnly = matchVolunteer(profile, [teaching], {
      skill: 1,
      interest: 0,
      availability: 0,
      preferenceBoost: 0,
    });
    assert.equal(skillOnly[0].score, 100);

    const interestOnly = matchVolunteer(profile, [teaching], {
      skill: 0,
      interest: 1,
      availability: 0,
      preferenceBoost: 0,
    });
    assert.equal(interestOnly.length, 0, "no interests given, so an interest-only score is 0");
  });
});
