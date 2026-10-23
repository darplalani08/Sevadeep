// Student enrolment applications — Postgres.
//
// Reads are split into two shapes deliberately: `PublicApplicationStatus` (what the tracking page
// may see — status and dates, never contact details) and `AdminApplication` (what a signed-in
// administrator sees). Nothing in between.

import { getSql, queryOne } from "./sql.ts";
import {
  dedupeHash,
  generateTrackingCode,
  hashTrackingCode,
  nextReferenceWithin,
  normaliseReference,
  normaliseTrackingCode,
  verifyTrackingCode,
} from "./references.ts";
import { applicationStatuses, type ApplicationStatus } from "../../../content/education.ts";

export type ApplicationInput = {
  studentName: string;
  guardianName: string;
  contactNumber: string;
  email?: string;
  studentAge: number;
  studentClass: string;
  city: string;
  supportNeeded: string[];
  notes?: string;
};

export type AdminApplication = {
  id: number;
  reference: string;
  studentName: string;
  guardianName: string;
  contactNumber: string;
  email: string | null;
  studentAge: number | null;
  studentClass: string;
  city: string | null;
  supportNeeded: string[];
  notes: string | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationEvent = {
  status: ApplicationStatus;
  previousStatus: ApplicationStatus | null;
  note: string | null;
  at: string;
};

export type PublicApplicationStatus = {
  reference: string;
  /** First name only — enough to recognise the application, not enough to identify a child. */
  studentFirstName: string;
  studentClass: string;
  supportNeeded: string[];
  status: ApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  history: ApplicationEvent[];
};

/**
 * Duplicate window for accidental resubmission. Identical details inside the same 10-minute
 * bucket collapse onto one UNIQUE dedupe_hash; a genuine re-application later gets a different
 * bucket and succeeds.
 */
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

type ApplicationRow = {
  id: string | number;
  reference: string;
  track_code_hash: string;
  student_name: string;
  guardian_name: string;
  contact_number: string;
  email: string | null;
  student_age: number | null;
  student_class: string;
  city: string | null;
  support_needed: string[];
  notes: string | null;
  status: ApplicationStatus;
  created_at: string | Date;
  updated_at: string | Date;
};

const iso = (value: string | Date) => new Date(value).toISOString();

function toAdmin(row: ApplicationRow): AdminApplication {
  return {
    id: Number(row.id),
    reference: row.reference,
    studentName: row.student_name,
    guardianName: row.guardian_name,
    contactNumber: row.contact_number,
    email: row.email,
    studentAge: row.student_age === null ? null : Number(row.student_age),
    studentClass: row.student_class,
    city: row.city,
    supportNeeded: row.support_needed ?? [],
    notes: row.notes,
    status: row.status,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export type CreateApplicationResult =
  | {
      ok: true;
      reference: string;
      trackingCode: string;
      status: ApplicationStatus;
      submittedAt: string;
    }
  | { ok: false; code: "duplicate"; reference: string };

export async function createApplication(
  input: ApplicationInput,
  now = new Date()
): Promise<CreateApplicationResult> {
  const sql = await getSql();
  const bucket = Math.floor(now.getTime() / DEDUPE_WINDOW_MS);
  const fingerprint = dedupeHash([
    "application",
    input.studentName,
    input.guardianName,
    input.contactNumber,
    input.studentClass,
    bucket,
  ]);

  const existing = await queryOne<{ reference: string }>(
    sql,
    `select reference from public.applications where dedupe_hash = $1`,
    [fingerprint]
  );
  if (existing) return { ok: false, code: "duplicate", reference: existing.reference };

  const trackingCode = generateTrackingCode();

  try {
    return await sql.transaction(async (tx) => {
      const reference = await nextReferenceWithin(tx, "application", now);

      const rows = await tx.query<{ id: string | number; created_at: string | Date }>(
        `insert into public.applications
           (reference, track_code_hash, student_name, guardian_name, contact_number, email,
            student_age, student_class, city, support_needed, notes, status, dedupe_hash)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Submitted',$12)
         returning id, created_at`,
        [
          reference,
          hashTrackingCode(reference, trackingCode),
          input.studentName,
          input.guardianName,
          input.contactNumber,
          input.email ?? null,
          input.studentAge,
          input.studentClass,
          input.city,
          input.supportNeeded,
          input.notes ?? null,
          fingerprint,
        ]
      );

      await tx.query(
        `insert into public.application_events (application_id, from_status, to_status, note, actor)
         values ($1, null, 'Submitted', $2, 'applicant')`,
        [rows[0].id, "Application received."]
      );

      return {
        ok: true as const,
        reference,
        trackingCode,
        status: "Submitted" as ApplicationStatus,
        submittedAt: iso(rows[0].created_at),
      };
    });
  } catch (error) {
    // Two identical submissions racing each other both pass the pre-check; the UNIQUE index
    // settles it and the loser is reported as the duplicate it is.
    const again = await queryOne<{ reference: string }>(
      sql,
      `select reference from public.applications where dedupe_hash = $1`,
      [fingerprint]
    );
    if (again) return { ok: false, code: "duplicate", reference: again.reference };
    throw error;
  }
}

async function eventsFor(applicationId: number): Promise<ApplicationEvent[]> {
  const sql = await getSql();
  const rows = await sql.query<{
    from_status: ApplicationStatus | null;
    to_status: ApplicationStatus;
    note: string | null;
    created_at: string | Date;
  }>(
    `select from_status, to_status, note, created_at
       from public.application_events
      where application_id = $1
      order by created_at, id`,
    [applicationId]
  );
  return rows.map((e) => ({
    status: e.to_status,
    previousStatus: e.from_status,
    note: e.note,
    at: iso(e.created_at),
  }));
}

export async function getPublicStatus(
  reference: string,
  code: string
): Promise<PublicApplicationStatus | null> {
  const sql = await getSql();
  const ref = normaliseReference(reference);
  const row = await queryOne<ApplicationRow>(
    sql,
    `select * from public.applications where reference = $1`,
    [ref]
  );
  if (!row) return null;
  if (!verifyTrackingCode(ref, normaliseTrackingCode(code), row.track_code_hash)) return null;

  return {
    reference: row.reference,
    studentFirstName: row.student_name.trim().split(/\s+/)[0] ?? "",
    studentClass: row.student_class,
    supportNeeded: row.support_needed ?? [],
    status: row.status,
    submittedAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    history: await eventsFor(Number(row.id)),
  };
}

export type ApplicationListOptions = {
  status?: ApplicationStatus | "all";
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listApplications(
  options: ApplicationListOptions = {}
): Promise<{ items: AdminApplication[]; total: number }> {
  const sql = await getSql();
  const { status = "all", search, limit = 50, offset = 0 } = options;

  const where: string[] = [];
  const params: unknown[] = [];

  if (status !== "all" && (applicationStatuses as readonly string[]).includes(status)) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    const p = `$${params.length}`;
    where.push(
      `(lower(reference) like ${p} or lower(student_name) like ${p} or lower(guardian_name) like ${p}
        or contact_number like ${p} or lower(coalesce(email,'')) like ${p}
        or lower(coalesce(city,'')) like ${p})`
    );
  }

  const clause = where.length ? `where ${where.join(" and ")}` : "";

  // count(*) over() rides along with the page, so this is one round trip rather than a separate
  // COUNT query. Worth it: the function runs a long way from the database.
  params.push(Math.min(Math.max(limit, 1), 200), Math.max(offset, 0));
  const rows = await sql.query<ApplicationRow & { total_count: string }>(
    `select *, count(*) over() as total_count from public.applications ${clause}
      order by created_at desc, id desc
      limit $${params.length - 1} offset $${params.length}`,
    params
  );

  // A zero-row page carries no window value, so fall back to a direct count only then.
  const total =
    rows.length > 0
      ? Number(rows[0].total_count)
      : Number(
          (
            await sql.query<{ count: string }>(
              `select count(*)::text as count from public.applications ${clause}`,
              params.slice(0, -2)
            )
          )[0].count
        );

  return { items: rows.map(toAdmin), total };
}

export async function getApplicationByReference(
  reference: string
): Promise<AdminApplication | null> {
  const sql = await getSql();
  const row = await queryOne<ApplicationRow>(
    sql,
    `select * from public.applications where reference = $1`,
    [normaliseReference(reference)]
  );
  return row ? toAdmin(row) : null;
}

export const getApplicationEvents = eventsFor;

export type UpdateStatusResult =
  | { ok: true; application: AdminApplication }
  | { ok: false; code: "not_found" | "invalid_status" | "unchanged" };

export async function updateApplicationStatus(
  reference: string,
  status: ApplicationStatus,
  actor: string,
  note?: string
): Promise<UpdateStatusResult> {
  if (!(applicationStatuses as readonly string[]).includes(status)) {
    return { ok: false, code: "invalid_status" };
  }

  const sql = await getSql();
  const ref = normaliseReference(reference);

  return sql.transaction(async (tx) => {
    // Lock the row so two administrators clicking at once cannot interleave and write two
    // history entries for the same transition.
    const current = await queryOne<{ id: string | number; status: ApplicationStatus }>(
      tx,
      `select id, status from public.applications where reference = $1 for update`,
      [ref]
    );
    if (!current) return { ok: false as const, code: "not_found" as const };
    if (current.status === status) return { ok: false as const, code: "unchanged" as const };

    const rows = await tx.query<ApplicationRow>(
      `update public.applications set status = $2 where id = $1 returning *`,
      [current.id, status]
    );

    await tx.query(
      `insert into public.application_events (application_id, from_status, to_status, note, actor)
       values ($1, $2, $3, $4, $5)`,
      [current.id, current.status, status, note?.trim() || null, actor]
    );

    return { ok: true as const, application: toAdmin(rows[0]) };
  });
}
