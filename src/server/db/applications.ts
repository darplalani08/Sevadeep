// Data access for student enrolment applications.
//
// Every write goes through a transaction so the reference counter, the application row and its
// first status event are committed together. Reads are split into two shapes deliberately:
// `PublicApplicationStatus` (what the tracking page may see) and `AdminApplication` (what a
// signed-in administrator sees). Nothing in between.

import { getDb, transaction } from "./client";
import {
  dedupeHash,
  generateTrackingCode,
  hashTrackingCode,
  nextReferenceWithin,
  normaliseReference,
  normaliseTrackingCode,
  verifyTrackingCode,
} from "./references";
import { applicationStatuses, type ApplicationStatus } from "@content/education";

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

export type ApplicationRow = {
  id: number;
  reference: string;
  track_code_hash: string;
  student_name: string;
  guardian_name: string;
  contact_number: string;
  email: string | null;
  student_age: number | null;
  student_class: string;
  city: string | null;
  support_needed: string;
  notes: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
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
 * Duplicate window for accidental resubmission. Identical details submitted inside the same
 * 10-minute bucket collapse onto one UNIQUE dedupe_hash and the second request is rejected;
 * a genuine re-application later gets a different bucket and succeeds.
 */
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

function toAdmin(row: ApplicationRow): AdminApplication {
  return {
    id: row.id,
    reference: row.reference,
    studentName: row.student_name,
    guardianName: row.guardian_name,
    contactNumber: row.contact_number,
    email: row.email,
    studentAge: row.student_age,
    studentClass: row.student_class,
    city: row.city,
    supportNeeded: safeParseArray(row.support_needed),
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeParseArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export type CreateApplicationResult =
  | { ok: true; reference: string; trackingCode: string; status: ApplicationStatus; submittedAt: string }
  | { ok: false; code: "duplicate"; reference: string };

export function createApplication(
  input: ApplicationInput,
  now = new Date()
): CreateApplicationResult {
  const bucket = Math.floor(now.getTime() / DEDUPE_WINDOW_MS);
  const fingerprint = dedupeHash([
    "application",
    input.studentName,
    input.guardianName,
    input.contactNumber,
    input.studentClass,
    bucket,
  ]);

  const existing = getDb()
    .prepare(`SELECT reference FROM applications WHERE dedupe_hash = ?`)
    .get(fingerprint) as { reference: string } | undefined;
  if (existing) {
    return { ok: false, code: "duplicate", reference: existing.reference };
  }

  const trackingCode = generateTrackingCode();
  const iso = now.toISOString();

  try {
    return transaction((db) => {
      const reference = nextReferenceWithin(db, "application", now);
      const result = db
        .prepare(
          `INSERT INTO applications (
             reference, track_code_hash, student_name, guardian_name, contact_number, email,
             student_age, student_class, city, support_needed, notes, status, dedupe_hash,
             created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', ?, ?, ?)`
        )
        .run(
          reference,
          hashTrackingCode(reference, trackingCode),
          input.studentName,
          input.guardianName,
          input.contactNumber,
          input.email ?? null,
          input.studentAge,
          input.studentClass,
          input.city,
          JSON.stringify(input.supportNeeded),
          input.notes ?? null,
          fingerprint,
          iso,
          iso
        );

      db.prepare(
        `INSERT INTO application_events (application_id, from_status, to_status, note, actor, created_at)
         VALUES (?, NULL, 'Submitted', ?, 'applicant', ?)`
      ).run(Number(result.lastInsertRowid), "Application received.", iso);

      return {
        ok: true as const,
        reference,
        trackingCode,
        status: "Submitted" as ApplicationStatus,
        submittedAt: iso,
      };
    });
  } catch (error) {
    // Two identical submissions racing each other both pass the pre-check; the UNIQUE index
    // settles it and the loser is reported as the duplicate it is.
    const again = getDb()
      .prepare(`SELECT reference FROM applications WHERE dedupe_hash = ?`)
      .get(fingerprint) as { reference: string } | undefined;
    if (again) return { ok: false, code: "duplicate", reference: again.reference };
    throw error;
  }
}

export function getPublicStatus(
  reference: string,
  code: string
): PublicApplicationStatus | null {
  const ref = normaliseReference(reference);
  const row = getDb()
    .prepare(`SELECT * FROM applications WHERE reference = ?`)
    .get(ref) as ApplicationRow | undefined;
  if (!row) return null;
  if (!verifyTrackingCode(ref, normaliseTrackingCode(code), row.track_code_hash)) return null;

  const events = getDb()
    .prepare(
      `SELECT from_status, to_status, note, created_at
         FROM application_events
        WHERE application_id = ?
        ORDER BY created_at ASC, id ASC`
    )
    .all(row.id) as {
    from_status: ApplicationStatus | null;
    to_status: ApplicationStatus;
    note: string | null;
    created_at: string;
  }[];

  return {
    reference: row.reference,
    studentFirstName: row.student_name.trim().split(/\s+/)[0] ?? "",
    studentClass: row.student_class,
    supportNeeded: safeParseArray(row.support_needed),
    status: row.status,
    submittedAt: row.created_at,
    updatedAt: row.updated_at,
    history: events.map((e) => ({
      status: e.to_status,
      previousStatus: e.from_status,
      note: e.note,
      at: e.created_at,
    })),
  };
}

export type ApplicationListOptions = {
  status?: ApplicationStatus | "all";
  search?: string;
  limit?: number;
  offset?: number;
};

export function listApplications(options: ApplicationListOptions = {}): {
  items: AdminApplication[];
  total: number;
} {
  const { status = "all", search, limit = 50, offset = 0 } = options;

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (status !== "all" && applicationStatuses.includes(status)) {
    where.push("status = ?");
    params.push(status);
  }
  if (search && search.trim()) {
    const like = `%${search.trim().toLowerCase()}%`;
    where.push(
      `(LOWER(reference) LIKE ? OR LOWER(student_name) LIKE ? OR LOWER(guardian_name) LIKE ?
        OR contact_number LIKE ? OR LOWER(COALESCE(email,'')) LIKE ? OR LOWER(COALESCE(city,'')) LIKE ?)`
    );
    params.push(like, like, like, like, like, like);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const db = getDb();

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM applications ${clause}`)
    .get(...params) as { total: number };

  const rows = db
    .prepare(
      `SELECT * FROM applications ${clause} ORDER BY datetime(created_at) DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, Math.min(Math.max(limit, 1), 200), Math.max(offset, 0)) as ApplicationRow[];

  return { items: rows.map(toAdmin), total };
}

export function getApplicationByReference(reference: string): AdminApplication | null {
  const row = getDb()
    .prepare(`SELECT * FROM applications WHERE reference = ?`)
    .get(normaliseReference(reference)) as ApplicationRow | undefined;
  return row ? toAdmin(row) : null;
}

export function getApplicationEvents(applicationId: number): ApplicationEvent[] {
  const rows = getDb()
    .prepare(
      `SELECT from_status, to_status, note, created_at FROM application_events
        WHERE application_id = ? ORDER BY created_at ASC, id ASC`
    )
    .all(applicationId) as {
    from_status: ApplicationStatus | null;
    to_status: ApplicationStatus;
    note: string | null;
    created_at: string;
  }[];
  return rows.map((e) => ({
    status: e.to_status,
    previousStatus: e.from_status,
    note: e.note,
    at: e.created_at,
  }));
}

export type UpdateStatusResult =
  | { ok: true; application: AdminApplication }
  | { ok: false; code: "not_found" | "invalid_status" | "unchanged" };

export function updateApplicationStatus(
  reference: string,
  status: ApplicationStatus,
  actor: string,
  note?: string,
  now = new Date()
): UpdateStatusResult {
  if (!applicationStatuses.includes(status)) return { ok: false, code: "invalid_status" };

  const ref = normaliseReference(reference);
  const current = getDb()
    .prepare(`SELECT id, status FROM applications WHERE reference = ?`)
    .get(ref) as { id: number; status: ApplicationStatus } | undefined;
  if (!current) return { ok: false, code: "not_found" };
  if (current.status === status) return { ok: false, code: "unchanged" };

  const iso = now.toISOString();
  transaction((db) => {
    db.prepare(`UPDATE applications SET status = ?, updated_at = ? WHERE id = ?`).run(
      status,
      iso,
      current.id
    );
    db.prepare(
      `INSERT INTO application_events (application_id, from_status, to_status, note, actor, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(current.id, current.status, status, note?.trim() || null, actor, iso);
  });

  const updated = getApplicationByReference(ref);
  return updated ? { ok: true, application: updated } : { ok: false, code: "not_found" };
}
