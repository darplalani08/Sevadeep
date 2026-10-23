// Data access for the administrator-configurable volunteering opportunity catalogue.

import { getDb, transaction } from "./client";
import type { Opportunity } from "@/lib/matching/engine";

type OpportunityRow = {
  id: string;
  title: string;
  summary: string;
  required_skills: string;
  interest_tags: string;
  availability_needs: string;
  location: string;
  is_demo: number;
  active: number;
  created_at: string;
};

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function toOpportunity(row: OpportunityRow): Opportunity & { active: boolean; createdAt: string } {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    requiredSkills: parseList(row.required_skills),
    interestTags: parseList(row.interest_tags),
    availabilityNeeds: parseList(row.availability_needs),
    location: row.location,
    isDemo: row.is_demo === 1,
    active: row.active === 1,
    createdAt: row.created_at,
  };
}

export function listOpportunities(options: { includeInactive?: boolean } = {}) {
  const clause = options.includeInactive ? "" : "WHERE active = 1";
  const rows = getDb()
    .prepare(`SELECT * FROM opportunities ${clause} ORDER BY title ASC`)
    .all() as OpportunityRow[];
  return rows.map(toOpportunity);
}

export function getOpportunity(id: string) {
  const row = getDb().prepare(`SELECT * FROM opportunities WHERE id = ?`).get(id) as
    | OpportunityRow
    | undefined;
  return row ? toOpportunity(row) : null;
}

export type OpportunityInput = {
  id: string;
  title: string;
  summary: string;
  requiredSkills: string[];
  interestTags: string[];
  availabilityNeeds: string[];
  location: string;
  isDemo: boolean;
};

export function upsertOpportunity(input: OpportunityInput, now = new Date()) {
  transaction((db) => {
    db.prepare(
      `INSERT INTO opportunities
         (id, title, summary, required_skills, interest_tags, availability_needs, location, is_demo, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         summary = excluded.summary,
         required_skills = excluded.required_skills,
         interest_tags = excluded.interest_tags,
         availability_needs = excluded.availability_needs,
         location = excluded.location,
         is_demo = excluded.is_demo`
    ).run(
      input.id,
      input.title,
      input.summary,
      JSON.stringify(input.requiredSkills),
      JSON.stringify(input.interestTags),
      JSON.stringify(input.availabilityNeeds),
      input.location,
      input.isDemo ? 1 : 0,
      now.toISOString()
    );
  });
  return getOpportunity(input.id);
}

export function setOpportunityActive(id: string, active: boolean) {
  const result = getDb()
    .prepare(`UPDATE opportunities SET active = ? WHERE id = ?`)
    .run(active ? 1 : 0, id);
  return Number(result.changes) > 0;
}
