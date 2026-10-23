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

  // ONE round trip, not six.
  //
  // This was originally six queries behind Promise.all. That deadlocked against Supabase's
  // transaction-mode pooler: pgbouncer hands each concurrent query a different backend, and
  // postgres.js pipelines on a small pool, so the endpoint hung indefinitely while the
  // one-, two- and three-query endpoints were fine. Collapsing the aggregates into a single
  // statement removes the concurrency entirely — and, incidentally, five cross-region round
  // trips, which is the other reason this endpoint was the slowest thing on the site.
  const rows = await sql.query<{ payload: OverviewPayload }>(
    `
    with app_status as (
      select status, count(*)::int as count from public.applications group by status
    ),
    vol_status as (
      select status, count(*)::int as count from public.volunteers group by status
    ),
    opp as (
      select count(*)::int as total, count(*) filter (where active)::int as active
        from public.opportunities
    ),
    trend as (
      select to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as day, count(*)::int as count
        from public.applications
       where created_at >= $1::date
       group by day
    ),
    skills as (
      select skill as label, count(*)::int as count
        from public.volunteers, unnest(skills) as skill
       group by skill
    ),
    stamp as (
      select greatest(
               coalesce((select max(updated_at) from public.applications), 'epoch'::timestamptz),
               coalesce((select max(updated_at) from public.volunteers),   'epoch'::timestamptz),
               coalesce((select max(created_at) from public.application_events), 'epoch'::timestamptz)
             )::text as version
    )
    select json_build_object(
      'appStatus',  coalesce((select json_agg(json_build_object('status', status, 'count', count)) from app_status), '[]'::json),
      'volStatus',  coalesce((select json_agg(json_build_object('status', status, 'count', count)) from vol_status), '[]'::json),
      'opportunities', (select json_build_object('total', total, 'active', active) from opp),
      'trend',      coalesce((select json_agg(json_build_object('day', day, 'count', count)) from trend), '[]'::json),
      'skills',     coalesce((select json_agg(json_build_object('label', label, 'count', count) order by count desc, label) from skills), '[]'::json),
      'version',    (select version from stamp)
    ) as payload
    `,
    [since]
  );

  const payload = rows[0].payload;

  const appsByStatus = zeroed(applicationStatuses);
  let applicationTotal = 0;
  for (const row of payload.appStatus) {
    if (row.status in appsByStatus) appsByStatus[row.status as ApplicationStatus] = row.count;
    applicationTotal += row.count;
  }

  const volsByStatus = zeroed(volunteerStatuses);
  let volunteerTotal = 0;
  for (const row of payload.volStatus) {
    if (row.status in volsByStatus) volsByStatus[row.status as VolunteerStatus] = row.count;
    volunteerTotal += row.count;
  }

  // Zero-fill the trend so a quiet day is a gap in the line, not a missing point.
  const counts = new Map(payload.trend.map((r) => [r.day, r.count]));
  const applicationTrend: { date: string; value: number }[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
    const day = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
    applicationTrend.push({ date: day, value: counts.get(day) ?? 0 });
  }

  return {
    applications: { total: applicationTotal, byStatus: appsByStatus },
    volunteers: { total: volunteerTotal, byStatus: volsByStatus, pending: volsByStatus.Pending },
    opportunities: payload.opportunities,
    charts: {
      applicationsByStatus: applicationStatuses.map((status) => ({
        label: status,
        value: appsByStatus[status],
      })),
      applicationTrend,
      volunteerSkills: payload.skills.map((s) => ({ label: s.label, value: s.count })),
    },
    version: `${payload.version ?? "0"}|${applicationTotal}|${volunteerTotal}`,
    generatedAt: now.toISOString(),
  };
}

/** Shape of the single JSON payload the aggregate query returns. */
type OverviewPayload = {
  appStatus: { status: string; count: number }[];
  volStatus: { status: string; count: number }[];
  opportunities: { total: number; active: number };
  trend: { day: string; count: number }[];
  skills: { label: string; count: number }[];
  version: string | null;
};
