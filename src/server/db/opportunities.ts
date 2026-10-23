// Opportunity catalogue — Postgres.

import { getSql, queryOne } from "./sql.ts";
import type { Opportunity } from "../../lib/matching/engine.ts";

export type StoredOpportunity = Opportunity & { active: boolean; createdAt: string };

type OpportunityRow = {
  id: string;
  title: string;
  summary: string;
  required_skills: string[];
  interest_tags: string[];
  availability_needs: string[];
  location: string;
  is_demo: boolean;
  active: boolean;
  created_at: string | Date;
};

function toOpportunity(row: OpportunityRow): StoredOpportunity {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    requiredSkills: row.required_skills ?? [],
    interestTags: row.interest_tags ?? [],
    availabilityNeeds: row.availability_needs ?? [],
    location: row.location,
    isDemo: row.is_demo,
    active: row.active,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function listOpportunities(
  options: { includeInactive?: boolean } = {}
): Promise<StoredOpportunity[]> {
  const sql = await getSql();
  const rows = options.includeInactive
    ? await sql.query<OpportunityRow>(`select * from public.opportunities order by title`)
    : await sql.query<OpportunityRow>(
        `select * from public.opportunities where active order by title`
      );
  return rows.map(toOpportunity);
}

export async function getOpportunity(id: string): Promise<StoredOpportunity | null> {
  const sql = await getSql();
  const row = await queryOne<OpportunityRow>(
    sql,
    `select * from public.opportunities where id = $1`,
    [id]
  );
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

export async function upsertOpportunity(input: OpportunityInput): Promise<StoredOpportunity | null> {
  const sql = await getSql();
  await sql.query(
    `insert into public.opportunities
       (id, title, summary, required_skills, interest_tags, availability_needs, location, is_demo)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (id) do update set
       title = excluded.title,
       summary = excluded.summary,
       required_skills = excluded.required_skills,
       interest_tags = excluded.interest_tags,
       availability_needs = excluded.availability_needs,
       location = excluded.location,
       is_demo = excluded.is_demo`,
    [
      input.id,
      input.title,
      input.summary,
      input.requiredSkills,
      input.interestTags,
      input.availabilityNeeds,
      input.location,
      input.isDemo,
    ]
  );
  return getOpportunity(input.id);
}

export async function setOpportunityActive(id: string, active: boolean): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<{ id: string }>(
    `update public.opportunities set active = $2 where id = $1 returning id`,
    [id, active]
  );
  return rows.length > 0;
}
