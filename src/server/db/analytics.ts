// Dashboard aggregation — every number below is a COUNT/GROUP BY over the real tables. There
// are no hardcoded statistics anywhere in this file.

import { getDb } from "./client";
import { applicationStatuses, type ApplicationStatus } from "@content/education";
import { volunteerStatuses, type VolunteerStatus } from "./volunteers";

export type Overview = {
  applications: {
    total: number;
    byStatus: Record<ApplicationStatus, number>;
  };
  volunteers: {
    total: number;
    byStatus: Record<VolunteerStatus, number>;
    /** Volunteers still awaiting a first response from the team. */
    pending: number;
  };
  opportunities: { total: number; active: number };
  charts: {
    applicationsByStatus: { label: string; value: number }[];
    applicationTrend: { date: string; value: number }[];
    volunteerSkills: { label: string; value: number }[];
  };
  /** Max(updated_at) across the tables the dashboard renders — used to skip no-op re-renders. */
  version: string;
  generatedAt: string;
};

const TREND_DAYS = 14;

function countApplicationsByStatus(): Record<ApplicationStatus, number> {
  const rows = getDb()
    .prepare(`SELECT status, COUNT(*) AS count FROM applications GROUP BY status`)
    .all() as { status: ApplicationStatus; count: number }[];

  const result = Object.fromEntries(
    applicationStatuses.map((s) => [s, 0])
  ) as Record<ApplicationStatus, number>;
  for (const row of rows) {
    if (row.status in result) result[row.status] = row.count;
  }
  return result;
}

function countVolunteersByStatus(): Record<VolunteerStatus, number> {
  const rows = getDb()
    .prepare(`SELECT status, COUNT(*) AS count FROM volunteers GROUP BY status`)
    .all() as { status: VolunteerStatus; count: number }[];

  const result = Object.fromEntries(
    volunteerStatuses.map((s) => [s, 0])
  ) as Record<VolunteerStatus, number>;
  for (const row of rows) {
    if (row.status in result) result[row.status] = row.count;
  }
  return result;
}

/** Applications per day for the last TREND_DAYS days, including days with none. */
function applicationTrend(now = new Date()): { date: string; value: number }[] {
  const rows = getDb()
    .prepare(
      `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS count
         FROM applications
        WHERE datetime(created_at) >= datetime(?)
        GROUP BY day`
    )
    .all(new Date(now.getTime() - (TREND_DAYS - 1) * 86400000).toISOString()) as {
    day: string;
    count: number;
  }[];

  const counts = new Map(rows.map((r) => [r.day, r.count]));
  const out: { date: string; value: number }[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
    const day = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
    out.push({ date: day, value: counts.get(day) ?? 0 });
  }
  return out;
}

/**
 * Skill distribution across volunteer registrations. Skills are stored as a JSON array per
 * volunteer, so the histogram is built in JS over the stored rows rather than in SQL.
 */
function volunteerSkillDistribution(): { label: string; value: number }[] {
  const rows = getDb().prepare(`SELECT skills FROM volunteers`).all() as { skills: string }[];
  const tally = new Map<string, number>();

  for (const row of rows) {
    let skills: unknown;
    try {
      skills = JSON.parse(row.skills);
    } catch {
      continue;
    }
    if (!Array.isArray(skills)) continue;
    for (const skill of skills) {
      if (typeof skill !== "string" || !skill.trim()) continue;
      tally.set(skill, (tally.get(skill) ?? 0) + 1);
    }
  }

  return [...tally.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

export function getOverview(now = new Date()): Overview {
  const db = getDb();

  const appsByStatus = countApplicationsByStatus();
  const volsByStatus = countVolunteersByStatus();

  const { total: applicationTotal } = db
    .prepare(`SELECT COUNT(*) AS total FROM applications`)
    .get() as { total: number };
  const { total: volunteerTotal } = db
    .prepare(`SELECT COUNT(*) AS total FROM volunteers`)
    .get() as { total: number };
  const opportunityCounts = db
    .prepare(`SELECT COUNT(*) AS total, SUM(active) AS active FROM opportunities`)
    .get() as { total: number; active: number | null };

  const version = db
    .prepare(
      `SELECT COALESCE(MAX(stamp), '0') AS version FROM (
         SELECT MAX(updated_at) AS stamp FROM applications
         UNION ALL SELECT MAX(updated_at) FROM volunteers
         UNION ALL SELECT MAX(created_at) FROM application_events
       )`
    )
    .get() as { version: string };

  return {
    applications: { total: applicationTotal, byStatus: appsByStatus },
    volunteers: {
      total: volunteerTotal,
      byStatus: volsByStatus,
      pending: volsByStatus.Pending,
    },
    opportunities: {
      total: opportunityCounts.total,
      active: opportunityCounts.active ?? 0,
    },
    charts: {
      applicationsByStatus: applicationStatuses.map((status) => ({
        label: status,
        value: appsByStatus[status],
      })),
      applicationTrend: applicationTrend(now),
      volunteerSkills: volunteerSkillDistribution(),
    },
    version: `${version.version}|${applicationTotal}|${volunteerTotal}`,
    generatedAt: now.toISOString(),
  };
}
