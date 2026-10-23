// Dashboard aggregation — every number below is a COUNT/GROUP BY over the real tables. There are
// no hardcoded statistics in this file.
//
// All five aggregates are fetched in one round trip: on serverless, six sequential queries is six
// times the latency for no benefit.

import { getSql } from "./sql.ts";
import { applicationStatuses, type ApplicationStatus } from "../../../content/education.ts";
import { volunteerStatuses, type VolunteerStatus } from "./volunteers.ts";

export type Overview = {
  applications: { total: number; byStatus: Record<ApplicationStatus, number> };
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
  /** Max(updated_at) plus the counts — lets a client skip a no-op re-render. */
  version: string;
  generatedAt: string;
};

const TREND_DAYS = 14;

function zeroed<T extends string>(keys: readonly T[]): Record<T, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<T, number>;
}

export async function getOverview(now = new Date()): Promise<Overview> {
  const sql = await getSql();
  const since = new Date(now.getTime() - (TREND_DAYS - 1) * 86400000).toISOString().slice(0, 10);

  const [appStatus, volStatus, opps, trend, skills, version] = await Promise.all([
    sql.query<{ status: ApplicationStatus; count: string }>(
      `select status, count(*)::text as count from public.applications group by status`
    ),
    sql.query<{ status: VolunteerStatus; count: string }>(
      `select status, count(*)::text as count from public.volunteers group by status`
    ),
    sql.query<{ total: string; active: string }>(
      `select count(*)::text as total,
              count(*) filter (where active)::text as active
         from public.opportunities`
    ),
    sql.query<{ day: string; count: string }>(
      `select to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as day, count(*)::text as count
         from public.applications
        where created_at >= $1::date
        group by day`,
      [since]
    ),
    // Skills are an array per volunteer; unnest turns the histogram into a plain GROUP BY.
    sql.query<{ label: string; count: string }>(
      `select skill as label, count(*)::text as count
         from public.volunteers, unnest(skills) as skill
        group by skill
        order by count(*) desc, skill`
    ),
    sql.query<{ stamp: string | null }>(
      `select greatest(
                coalesce((select max(updated_at) from public.applications), 'epoch'::timestamptz),
                coalesce((select max(updated_at) from public.volunteers),   'epoch'::timestamptz),
                coalesce((select max(created_at) from public.application_events), 'epoch'::timestamptz)
              )::text as stamp`
    ),
  ]);

  const appsByStatus = zeroed(applicationStatuses);
  let applicationTotal = 0;
  for (const row of appStatus) {
    if (row.status in appsByStatus) appsByStatus[row.status] = Number(row.count);
    applicationTotal += Number(row.count);
  }

  const volsByStatus = zeroed(volunteerStatuses);
  let volunteerTotal = 0;
  for (const row of volStatus) {
    if (row.status in volsByStatus) volsByStatus[row.status] = Number(row.count);
    volunteerTotal += Number(row.count);
  }

  // Zero-fill the trend so a quiet day is a gap in the line, not a missing point.
  const counts = new Map(trend.map((r) => [r.day, Number(r.count)]));
  const applicationTrend: { date: string; value: number }[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
    const day = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
    applicationTrend.push({ date: day, value: counts.get(day) ?? 0 });
  }

  return {
    applications: { total: applicationTotal, byStatus: appsByStatus },
    volunteers: { total: volunteerTotal, byStatus: volsByStatus, pending: volsByStatus.Pending },
    opportunities: { total: Number(opps[0].total), active: Number(opps[0].active) },
    charts: {
      applicationsByStatus: applicationStatuses.map((status) => ({
        label: status,
        value: appsByStatus[status],
      })),
      applicationTrend,
      volunteerSkills: skills.map((s) => ({ label: s.label, value: Number(s.count) })),
    },
    version: `${version[0].stamp ?? "0"}|${applicationTotal}|${volunteerTotal}`,
    generatedAt: now.toISOString(),
  };
}
