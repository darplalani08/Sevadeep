// Volunteer registrations and their stored match results — Postgres.
//
// The Aadhar number collected by the original SevaDeep volunteer form is NEVER stored in full:
// only the last four digits are kept, and no API returns more than that.

import { getSql, queryOne } from "./sql.ts";
import { dedupeHash, nextReferenceWithin } from "./references.ts";
import { listOpportunities } from "./opportunities.ts";
import {
  defaultWeights,
  matchVolunteer,
  type MatchResult,
  type MatchWeights,
} from "../../lib/matching/engine.ts";

export const volunteerStatuses = ["Pending", "Under Review", "Approved", "Rejected"] as const;
export type VolunteerStatus = (typeof volunteerStatuses)[number];

export type VolunteerInput = {
  fullName: string;
  email: string;
  mobile: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  /** Full Aadhar as typed; only the last 4 digits are persisted. */
  aadhar?: string;
  category?: string;
  areaOfInterest?: string;
  skills: string[];
  interests: string[];
  availability: string[];
  preferredActivities?: string[];
  hoursPerWeek?: number;
  accountId?: number | null;
};

export type StoredMatch = {
  opportunityId: string;
  title: string;
  score: number;
  skillScore: number;
  interestScore: number;
  availabilityScore: number;
  matchedSkills: string[];
  rationale: string;
  isDemo: boolean;
};

export type AdminVolunteer = {
  id: number;
  reference: string;
  fullName: string;
  email: string;
  mobile: string;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  idProofMasked: string | null;
  category: string | null;
  areaOfInterest: string | null;
  skills: string[];
  interests: string[];
  availability: string[];
  preferredActivities: string[];
  hoursPerWeek: number | null;
  status: VolunteerStatus;
  createdAt: string;
  updatedAt: string;
  matches: StoredMatch[];
};

const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
export const MATCHES_PER_VOLUNTEER = 5;

const iso = (value: string | Date) => new Date(value).toISOString();

function maskIdProof(aadhar?: string): string | null {
  if (!aadhar) return null;
  const digits = aadhar.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

/** Weights are configurable: env overrides first, then the settings table, then defaults. */
export async function getMatchWeights(): Promise<MatchWeights> {
  const fromEnv = (key: string) => {
    const raw = process.env[key];
    if (!raw) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };

  const sql = await getSql();
  const row = await queryOne<{ value: Partial<MatchWeights> }>(
    sql,
    `select value from public.settings where key = 'match_weights'`
  );
  const stored = row?.value ?? {};

  return {
    skill: fromEnv("MATCH_WEIGHT_SKILL") ?? stored.skill ?? defaultWeights.skill,
    interest: fromEnv("MATCH_WEIGHT_INTEREST") ?? stored.interest ?? defaultWeights.interest,
    availability:
      fromEnv("MATCH_WEIGHT_AVAILABILITY") ?? stored.availability ?? defaultWeights.availability,
    preferenceBoost:
      fromEnv("MATCH_PREFERENCE_BOOST") ?? stored.preferenceBoost ?? defaultWeights.preferenceBoost,
  };
}

export async function setMatchWeights(weights: MatchWeights): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into public.settings (key, value) values ('match_weights', $1)
     on conflict (key) do update set value = excluded.value`,
    [JSON.stringify(weights)]
  );
}

export type CreateVolunteerResult =
  | { ok: true; reference: string; matches: MatchResult[]; weights: MatchWeights }
  | { ok: false; code: "duplicate"; reference: string };

export async function createVolunteer(
  input: VolunteerInput,
  now = new Date()
): Promise<CreateVolunteerResult> {
  const sql = await getSql();
  const bucket = Math.floor(now.getTime() / DEDUPE_WINDOW_MS);
  const fingerprint = dedupeHash(["volunteer", input.fullName, input.email, input.mobile, bucket]);

  const existing = await queryOne<{ reference: string }>(
    sql,
    `select reference from public.volunteers where dedupe_hash = $1`,
    [fingerprint]
  );
  if (existing) return { ok: false, code: "duplicate", reference: existing.reference };

  const weights = await getMatchWeights();
  const opportunities = await listOpportunities();
  const matches = matchVolunteer(
    {
      skills: input.skills,
      interests: input.interests,
      availability: input.availability,
      preferredActivities: input.preferredActivities,
    },
    opportunities,
    weights,
    { limit: MATCHES_PER_VOLUNTEER }
  );

  try {
    const reference = await sql.transaction(async (tx) => {
      const ref = await nextReferenceWithin(tx, "volunteer", now);

      const rows = await tx.query<{ id: string | number }>(
        `insert into public.volunteers
           (reference, account_id, full_name, email, mobile, date_of_birth, blood_group,
            id_proof_masked, category, area_of_interest, skills, interests, availability,
            preferred_activities, hours_per_week, status, dedupe_hash)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'Pending',$16)
         returning id`,
        [
          ref,
          input.accountId ?? null,
          input.fullName,
          input.email,
          input.mobile,
          input.dateOfBirth || null,
          input.bloodGroup ?? null,
          maskIdProof(input.aadhar),
          input.category ?? null,
          input.areaOfInterest ?? null,
          input.skills,
          input.interests,
          input.availability,
          input.preferredActivities ?? [],
          input.hoursPerWeek ?? null,
          fingerprint,
        ]
      );

      const volunteerId = rows[0].id;
      for (const match of matches) {
        await tx.query(
          `insert into public.volunteer_matches
             (volunteer_id, opportunity_id, score, skill_score, interest_score,
              availability_score, matched_skills, rationale)
           values ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            volunteerId,
            match.opportunityId,
            match.score,
            match.skillScore,
            match.interestScore,
            match.availabilityScore,
            match.matchedSkills,
            match.rationale,
          ]
        );
      }
      return ref;
    });

    return { ok: true, reference, matches, weights };
  } catch (error) {
    const again = await queryOne<{ reference: string }>(
      sql,
      `select reference from public.volunteers where dedupe_hash = $1`,
      [fingerprint]
    );
    if (again) return { ok: false, code: "duplicate", reference: again.reference };
    throw error;
  }
}

type VolunteerRow = {
  id: string | number;
  reference: string;
  full_name: string;
  email: string;
  mobile: string;
  date_of_birth: string | Date | null;
  blood_group: string | null;
  id_proof_masked: string | null;
  category: string | null;
  area_of_interest: string | null;
  skills: string[];
  interests: string[];
  availability: string[];
  preferred_activities: string[];
  hours_per_week: number | null;
  status: VolunteerStatus;
  created_at: string | Date;
  updated_at: string | Date;
};

/**
 * Loads stored matches for many volunteers in one query — the list view would otherwise fire one
 * query per row (the classic N+1).
 */
async function matchesFor(volunteerIds: number[]): Promise<Map<number, StoredMatch[]>> {
  const byVolunteer = new Map<number, StoredMatch[]>();
  if (volunteerIds.length === 0) return byVolunteer;

  const sql = await getSql();
  const rows = await sql.query<{
    volunteer_id: string | number;
    opportunity_id: string;
    score: string | number;
    skill_score: string | number;
    interest_score: string | number;
    availability_score: string | number;
    matched_skills: string[];
    rationale: string;
    title: string;
    is_demo: boolean | null;
  }>(
    `select m.volunteer_id, m.opportunity_id, m.score, m.skill_score, m.interest_score,
            m.availability_score, m.matched_skills, m.rationale,
            coalesce(o.title, m.opportunity_id) as title,
            coalesce(o.is_demo, true) as is_demo
       from public.volunteer_matches m
       left join public.opportunities o on o.id = m.opportunity_id
      where m.volunteer_id = any($1)
      order by m.score desc, title`,
    [volunteerIds]
  );

  for (const r of rows) {
    const id = Number(r.volunteer_id);
    const list = byVolunteer.get(id) ?? [];
    list.push({
      opportunityId: r.opportunity_id,
      title: r.title,
      score: Number(r.score),
      skillScore: Number(r.skill_score),
      interestScore: Number(r.interest_score),
      availabilityScore: Number(r.availability_score),
      matchedSkills: r.matched_skills ?? [],
      rationale: r.rationale,
      isDemo: r.is_demo ?? true,
    });
    byVolunteer.set(id, list);
  }
  return byVolunteer;
}

function toAdminVolunteer(row: VolunteerRow, matches: StoredMatch[]): AdminVolunteer {
  return {
    id: Number(row.id),
    reference: row.reference,
    fullName: row.full_name,
    email: row.email,
    mobile: row.mobile,
    dateOfBirth: row.date_of_birth ? iso(row.date_of_birth).slice(0, 10) : null,
    bloodGroup: row.blood_group,
    idProofMasked: row.id_proof_masked,
    category: row.category,
    areaOfInterest: row.area_of_interest,
    skills: row.skills ?? [],
    interests: row.interests ?? [],
    availability: row.availability ?? [],
    preferredActivities: row.preferred_activities ?? [],
    hoursPerWeek: row.hours_per_week === null ? null : Number(row.hours_per_week),
    status: row.status,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    matches,
  };
}

export type VolunteerListOptions = {
  status?: VolunteerStatus | "all";
  skill?: string;
  availability?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listVolunteers(
  options: VolunteerListOptions = {}
): Promise<{ items: AdminVolunteer[]; total: number }> {
  const sql = await getSql();
  const { status = "all", skill, availability, search, limit = 50, offset = 0 } = options;

  const where: string[] = [];
  const params: unknown[] = [];

  if (status !== "all" && (volunteerStatuses as readonly string[]).includes(status)) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (skill) {
    params.push([skill]);
    where.push(`skills @> $${params.length}`);
  }
  if (availability) {
    params.push([availability]);
    where.push(`availability @> $${params.length}`);
  }
  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    const p = `$${params.length}`;
    where.push(
      `(lower(reference) like ${p} or lower(full_name) like ${p} or lower(email) like ${p}
        or mobile like ${p} or lower(array_to_string(skills, ' ')) like ${p}
        or lower(array_to_string(interests, ' ')) like ${p})`
    );
  }

  const clause = where.length ? `where ${where.join(" and ")}` : "";

  const totalRows = await sql.query<{ count: string }>(
    `select count(*)::text as count from public.volunteers ${clause}`,
    params
  );

  params.push(Math.min(Math.max(limit, 1), 200), Math.max(offset, 0));
  const rows = await sql.query<VolunteerRow>(
    `select * from public.volunteers ${clause}
      order by created_at desc, id desc
      limit $${params.length - 1} offset $${params.length}`,
    params
  );

  const matches = await matchesFor(rows.map((r) => Number(r.id)));
  return {
    items: rows.map((r) => toAdminVolunteer(r, matches.get(Number(r.id)) ?? [])),
    total: Number(totalRows[0].count),
  };
}

export async function updateVolunteerStatus(
  reference: string,
  status: VolunteerStatus
): Promise<AdminVolunteer | null> {
  if (!(volunteerStatuses as readonly string[]).includes(status)) return null;

  const sql = await getSql();
  const rows = await sql.query<VolunteerRow>(
    `update public.volunteers set status = $2 where reference = $1 returning *`,
    [reference.trim().toUpperCase(), status]
  );
  if (rows.length === 0) return null;

  const matches = await matchesFor([Number(rows[0].id)]);
  return toAdminVolunteer(rows[0], matches.get(Number(rows[0].id)) ?? []);
}
