// Data access for volunteer registrations and their stored match results.
//
// The Aadhar number collected by the original SevaDeep volunteer form is NEVER stored in full:
// only the last four digits are kept (`id_proof_masked`), and no API returns more than that.

import { getDb, transaction } from "./client";
import { dedupeHash, nextReferenceWithin } from "./references";
import { listOpportunities } from "./opportunities";
import {
  defaultWeights,
  matchVolunteer,
  type MatchResult,
  type MatchWeights,
} from "@/lib/matching/engine";

export const volunteerStatuses = ["Pending", "Contacted", "Active", "Declined"] as const;
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
};

type VolunteerRow = {
  id: number;
  reference: string;
  full_name: string;
  email: string;
  mobile: string;
  date_of_birth: string | null;
  blood_group: string | null;
  id_proof_masked: string | null;
  category: string | null;
  area_of_interest: string | null;
  skills: string;
  interests: string;
  availability: string;
  preferred_activities: string;
  hours_per_week: number | null;
  status: VolunteerStatus;
  created_at: string;
  updated_at: string;
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

const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
/** How many ranked opportunities are stored per volunteer. */
export const MATCHES_PER_VOLUNTEER = 5;

function parseList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function maskIdProof(aadhar?: string): string | null {
  if (!aadhar) return null;
  const digits = aadhar.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

/** Weights are configurable: env overrides first, then the `settings` table, then defaults. */
export function getMatchWeights(): MatchWeights {
  const fromEnv = (key: string) => {
    const raw = process.env[key];
    if (!raw) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };

  const stored = getDb()
    .prepare(`SELECT value FROM settings WHERE key = 'match_weights'`)
    .get() as { value: string } | undefined;

  let fromDb: Partial<MatchWeights> = {};
  if (stored) {
    try {
      fromDb = JSON.parse(stored.value) as Partial<MatchWeights>;
    } catch {
      fromDb = {};
    }
  }

  return {
    skill: fromEnv("MATCH_WEIGHT_SKILL") ?? fromDb.skill ?? defaultWeights.skill,
    interest: fromEnv("MATCH_WEIGHT_INTEREST") ?? fromDb.interest ?? defaultWeights.interest,
    availability:
      fromEnv("MATCH_WEIGHT_AVAILABILITY") ?? fromDb.availability ?? defaultWeights.availability,
    preferenceBoost:
      fromEnv("MATCH_PREFERENCE_BOOST") ?? fromDb.preferenceBoost ?? defaultWeights.preferenceBoost,
  };
}

export function setMatchWeights(weights: MatchWeights) {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value) VALUES ('match_weights', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(JSON.stringify(weights));
}

export type CreateVolunteerResult =
  | { ok: true; reference: string; matches: MatchResult[]; weights: MatchWeights }
  | { ok: false; code: "duplicate"; reference: string };

export function createVolunteer(
  input: VolunteerInput,
  now = new Date()
): CreateVolunteerResult {
  const bucket = Math.floor(now.getTime() / DEDUPE_WINDOW_MS);
  const fingerprint = dedupeHash([
    "volunteer",
    input.fullName,
    input.email,
    input.mobile,
    bucket,
  ]);

  const existing = getDb()
    .prepare(`SELECT reference FROM volunteers WHERE dedupe_hash = ?`)
    .get(fingerprint) as { reference: string } | undefined;
  if (existing) return { ok: false, code: "duplicate", reference: existing.reference };

  const weights = getMatchWeights();
  const opportunities = listOpportunities();
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

  const iso = now.toISOString();

  try {
    const reference = transaction((db) => {
      const ref = nextReferenceWithin(db, "volunteer", now);
      const result = db
        .prepare(
          `INSERT INTO volunteers (
             reference, full_name, email, mobile, date_of_birth, blood_group, id_proof_masked,
             category, area_of_interest, skills, interests, availability, preferred_activities,
             hours_per_week, status, dedupe_hash, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)`
        )
        .run(
          ref,
          input.fullName,
          input.email,
          input.mobile,
          input.dateOfBirth ?? null,
          input.bloodGroup ?? null,
          maskIdProof(input.aadhar),
          input.category ?? null,
          input.areaOfInterest ?? null,
          JSON.stringify(input.skills),
          JSON.stringify(input.interests),
          JSON.stringify(input.availability),
          JSON.stringify(input.preferredActivities ?? []),
          input.hoursPerWeek ?? null,
          fingerprint,
          iso,
          iso
        );

      const volunteerId = Number(result.lastInsertRowid);
      const insertMatch = db.prepare(
        `INSERT INTO volunteer_matches (
           volunteer_id, opportunity_id, score, skill_score, interest_score, availability_score,
           matched_skills, rationale, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const match of matches) {
        insertMatch.run(
          volunteerId,
          match.opportunityId,
          match.score,
          match.skillScore,
          match.interestScore,
          match.availabilityScore,
          JSON.stringify(match.matchedSkills),
          match.rationale,
          iso
        );
      }
      return ref;
    });

    return { ok: true, reference, matches, weights };
  } catch (error) {
    const again = getDb()
      .prepare(`SELECT reference FROM volunteers WHERE dedupe_hash = ?`)
      .get(fingerprint) as { reference: string } | undefined;
    if (again) return { ok: false, code: "duplicate", reference: again.reference };
    throw error;
  }
}

function matchesFor(volunteerId: number): StoredMatch[] {
  const rows = getDb()
    .prepare(
      `SELECT m.opportunity_id, m.score, m.skill_score, m.interest_score, m.availability_score,
              m.matched_skills, m.rationale,
              COALESCE(o.title, m.opportunity_id) AS title,
              COALESCE(o.is_demo, 1) AS is_demo
         FROM volunteer_matches m
         LEFT JOIN opportunities o ON o.id = m.opportunity_id
        WHERE m.volunteer_id = ?
        ORDER BY m.score DESC, title ASC`
    )
    .all(volunteerId) as {
    opportunity_id: string;
    score: number;
    skill_score: number;
    interest_score: number;
    availability_score: number;
    matched_skills: string;
    rationale: string;
    title: string;
    is_demo: number;
  }[];

  return rows.map((r) => ({
    opportunityId: r.opportunity_id,
    title: r.title,
    score: r.score,
    skillScore: r.skill_score,
    interestScore: r.interest_score,
    availabilityScore: r.availability_score,
    matchedSkills: parseList(r.matched_skills),
    rationale: r.rationale,
    isDemo: r.is_demo === 1,
  }));
}

function toAdminVolunteer(row: VolunteerRow): AdminVolunteer {
  return {
    id: row.id,
    reference: row.reference,
    fullName: row.full_name,
    email: row.email,
    mobile: row.mobile,
    dateOfBirth: row.date_of_birth,
    bloodGroup: row.blood_group,
    idProofMasked: row.id_proof_masked,
    category: row.category,
    areaOfInterest: row.area_of_interest,
    skills: parseList(row.skills),
    interests: parseList(row.interests),
    availability: parseList(row.availability),
    preferredActivities: parseList(row.preferred_activities),
    hoursPerWeek: row.hours_per_week,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    matches: matchesFor(row.id),
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

export function listVolunteers(options: VolunteerListOptions = {}): {
  items: AdminVolunteer[];
  total: number;
} {
  const { status = "all", skill, availability, search, limit = 50, offset = 0 } = options;

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (status !== "all" && (volunteerStatuses as readonly string[]).includes(status)) {
    where.push("status = ?");
    params.push(status);
  }
  if (skill) {
    where.push("LOWER(skills) LIKE ?");
    params.push(`%${skill.toLowerCase()}%`);
  }
  if (availability) {
    where.push("LOWER(availability) LIKE ?");
    params.push(`%${availability.toLowerCase()}%`);
  }
  if (search && search.trim()) {
    const like = `%${search.trim().toLowerCase()}%`;
    where.push(
      `(LOWER(reference) LIKE ? OR LOWER(full_name) LIKE ? OR LOWER(email) LIKE ?
        OR mobile LIKE ? OR LOWER(skills) LIKE ? OR LOWER(interests) LIKE ?)`
    );
    params.push(like, like, like, like, like, like);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const db = getDb();

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM volunteers ${clause}`)
    .get(...params) as { total: number };

  const rows = db
    .prepare(
      `SELECT * FROM volunteers ${clause} ORDER BY datetime(created_at) DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, Math.min(Math.max(limit, 1), 200), Math.max(offset, 0)) as VolunteerRow[];

  return { items: rows.map(toAdminVolunteer), total };
}

export function updateVolunteerStatus(
  reference: string,
  status: VolunteerStatus,
  now = new Date()
): AdminVolunteer | null {
  if (!(volunteerStatuses as readonly string[]).includes(status)) return null;
  const result = getDb()
    .prepare(`UPDATE volunteers SET status = ?, updated_at = ? WHERE reference = ?`)
    .run(status, now.toISOString(), reference.trim().toUpperCase());
  if (Number(result.changes) === 0) return null;
  const row = getDb()
    .prepare(`SELECT * FROM volunteers WHERE reference = ?`)
    .get(reference.trim().toUpperCase()) as VolunteerRow | undefined;
  return row ? toAdminVolunteer(row) : null;
}
