// Skill-based volunteer matching.
//
// Deliberately dependency-free and side-effect-free: the same module runs in the browser (to show
// recommendations the instant a volunteer submits the form), on the server (to persist the
// matches) and under `node --test` (see tests/matching.test.ts).
//
// Score = (wSkill x skillScore) + (wInterest x interestScore) + (wAvailability x availabilityScore)
// with the three component scores each normalised to 0-100, plus an optional, clearly separated
// preference boost when the volunteer explicitly asked for that activity. The final score is
// clamped to 0-100.

export type Opportunity = {
  id: string;
  title: string;
  summary: string;
  requiredSkills: string[];
  interestTags: string[];
  availabilityNeeds: string[];
  location: string;
  isDemo: boolean;
};

export type VolunteerProfile = {
  skills: string[];
  interests: string[];
  availability: string[];
  preferredActivities?: string[];
};

export type MatchWeights = {
  skill: number;
  interest: number;
  availability: number;
  /** Extra points (not part of the weighted sum) when the volunteer named this activity. */
  preferenceBoost: number;
};

export const defaultWeights: MatchWeights = {
  skill: 0.5,
  interest: 0.3,
  availability: 0.2,
  preferenceBoost: 10,
};

export type MatchResult = {
  opportunityId: string;
  title: string;
  summary: string;
  location: string;
  isDemo: boolean;
  /** 0-100, rounded. */
  score: number;
  skillScore: number;
  interestScore: number;
  availabilityScore: number;
  matchedSkills: string[];
  matchedInterests: string[];
  matchedAvailability: string[];
  missingSkills: string[];
  preferred: boolean;
  rationale: string;
};

/** Availability value that satisfies any schedule requirement, on either side of the match. */
const WILDCARD_AVAILABILITY = "flexible";

const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

function cleanList(values: string[] | undefined | null): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = norm(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function overlap(a: string[], b: string[]): string[] {
  const bKeys = new Set(b.map(norm));
  return a.filter((item) => bKeys.has(norm(item)));
}

/**
 * Requirement coverage: what share of what the role asks for does this person bring?
 * A role that asks for nothing is satisfied by everyone (100); a person who listed nothing
 * covers nothing (0).
 */
function coverage(required: string[], provided: string[]): { score: number; matched: string[] } {
  if (required.length === 0) return { score: 100, matched: [] };
  if (provided.length === 0) return { score: 0, matched: [] };
  const matched = overlap(required, provided);
  return { score: (matched.length / required.length) * 100, matched };
}

function availabilityFit(
  needs: string[],
  offered: string[]
): { score: number; matched: string[] } {
  if (needs.length === 0) return { score: 100, matched: [] };
  if (offered.length === 0) return { score: 0, matched: [] };

  const offeredIsWildcard = offered.some((v) => norm(v) === WILDCARD_AVAILABILITY);
  const needsIsWildcard = needs.some((v) => norm(v) === WILDCARD_AVAILABILITY);
  const matched = overlap(needs, offered);

  // One matching slot is enough to actually show up, so availability is a gate rather than a
  // proportion — but a wildcard on either side always clears it.
  if (offeredIsWildcard || needsIsWildcard || matched.length > 0) {
    return { score: 100, matched };
  }
  return { score: 0, matched: [] };
}

function buildRationale(r: Omit<MatchResult, "rationale">): string {
  const parts: string[] = [];

  if (r.matchedSkills.length > 0) {
    parts.push(
      `Your ${listToProse(r.matchedSkills.map((s) => s.toLowerCase()))} ${
        r.matchedSkills.length === 1 ? "skill is" : "skills are"
      } what this role needs`
    );
  } else {
    parts.push("None of your listed skills line up with this role yet");
  }

  if (r.matchedInterests.length > 0) {
    parts.push(`it sits in ${listToProse(r.matchedInterests)}, which you said interests you`);
  }

  if (r.availabilityScore === 100 && r.matchedAvailability.length > 0) {
    parts.push(`and your ${listToProse(r.matchedAvailability.map((s) => s.toLowerCase()))} availability fits the schedule`);
  } else if (r.availabilityScore === 100) {
    parts.push("and your schedule is flexible enough to fit it");
  } else {
    parts.push("but your stated availability does not overlap the schedule this role runs on");
  }

  let text = `${parts.join(", ")}.`;
  if (r.preferred) text += " You also named this activity as a preference.";
  if (r.missingSkills.length > 0 && r.matchedSkills.length > 0) {
    text += ` The team would train you on ${listToProse(r.missingSkills.map((s) => s.toLowerCase()))}.`;
  }
  return text;
}

function listToProse(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function scoreOpportunity(
  profile: VolunteerProfile,
  opportunity: Opportunity,
  weights: MatchWeights = defaultWeights
): MatchResult {
  const skills = cleanList(profile.skills);
  const interests = cleanList(profile.interests);
  const availability = cleanList(profile.availability);
  const preferred = cleanList(profile.preferredActivities);

  const required = cleanList(opportunity.requiredSkills);
  const tags = cleanList(opportunity.interestTags);
  const needs = cleanList(opportunity.availabilityNeeds);

  const skill = coverage(required, skills);
  const interest = coverage(tags, interests);
  const avail = availabilityFit(needs, availability);

  const isPreferred = preferred.some(
    (p) => norm(p) === norm(opportunity.id) || norm(p) === norm(opportunity.title)
  );

  const weighted =
    weights.skill * skill.score +
    weights.interest * interest.score +
    weights.availability * avail.score;

  const boosted = weighted + (isPreferred ? weights.preferenceBoost : 0);
  const score = Math.round(Math.min(100, Math.max(0, boosted)));

  const base: Omit<MatchResult, "rationale"> = {
    opportunityId: opportunity.id,
    title: opportunity.title,
    summary: opportunity.summary,
    location: opportunity.location,
    isDemo: opportunity.isDemo,
    score,
    skillScore: Math.round(skill.score),
    interestScore: Math.round(interest.score),
    availabilityScore: Math.round(avail.score),
    matchedSkills: skill.matched,
    matchedInterests: interest.matched,
    matchedAvailability: avail.matched,
    missingSkills: required.filter(
      (r) => !skill.matched.some((m) => norm(m) === norm(r))
    ),
    preferred: isPreferred,
  };

  return { ...base, rationale: buildRationale(base) };
}

/**
 * Ranks every active opportunity for a volunteer. Ties break on skill score, then title, so the
 * ordering is stable between the instant client-side preview and the stored server result.
 */
export function matchVolunteer(
  profile: VolunteerProfile,
  opportunities: Opportunity[],
  weights: MatchWeights = defaultWeights,
  options: { limit?: number; minScore?: number } = {}
): MatchResult[] {
  const { limit, minScore = 1 } = options;

  const ranked = opportunities
    .map((opportunity) => scoreOpportunity(profile, opportunity, weights))
    .filter((result) => result.score >= minScore)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.skillScore - a.skillScore ||
        a.title.localeCompare(b.title)
    );

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}
