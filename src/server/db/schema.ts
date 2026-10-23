// Schema for the local SevaDeep SQLite database.
//
// Migrations are plain SQL statements applied in order and recorded in `_migrations`, so the
// database is created on first use and upgraded in place on later boots — never reset.

export type Migration = { id: string; sql: string };

export const migrations: Migration[] = [
  {
    id: "001_initial",
    sql: `
    CREATE TABLE IF NOT EXISTS admins (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      email          TEXT    NOT NULL UNIQUE,
      name           TEXT    NOT NULL,
      password_hash  TEXT    NOT NULL,
      created_at     TEXT    NOT NULL,
      last_login_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash   TEXT    PRIMARY KEY,
      admin_id     INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      created_at   TEXT    NOT NULL,
      expires_at   TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id);
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS login_attempts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      scope_key   TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_login_attempts_scope ON login_attempts(scope_key, created_at);

    -- Reference counters: one row per (kind, year), incremented inside a transaction so
    -- references are gap-free and never collide.
    CREATE TABLE IF NOT EXISTS ref_counters (
      kind      TEXT    NOT NULL,
      year      INTEGER NOT NULL,
      next_val  INTEGER NOT NULL,
      PRIMARY KEY (kind, year)
    );

    CREATE TABLE IF NOT EXISTS applications (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      reference        TEXT    NOT NULL UNIQUE,
      track_code_hash  TEXT    NOT NULL,
      student_name     TEXT    NOT NULL,
      guardian_name    TEXT    NOT NULL,
      contact_number   TEXT    NOT NULL,
      email            TEXT,
      student_age      INTEGER,
      student_class    TEXT    NOT NULL,
      city             TEXT,
      support_needed   TEXT    NOT NULL,   -- JSON array of support types
      notes            TEXT,
      status           TEXT    NOT NULL DEFAULT 'Submitted'
                         CHECK (status IN ('Submitted','Under Review','Approved','Rejected')),
      dedupe_hash      TEXT    NOT NULL UNIQUE,
      created_at       TEXT    NOT NULL,
      updated_at       TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_applications_status  ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_applications_created ON applications(created_at);
    CREATE INDEX IF NOT EXISTS idx_applications_updated ON applications(updated_at);

    CREATE TABLE IF NOT EXISTS application_events (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      from_status     TEXT,
      to_status       TEXT    NOT NULL,
      note            TEXT,
      actor           TEXT    NOT NULL,     -- 'applicant' | admin email
      created_at      TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_application_events_app ON application_events(application_id, created_at);

    CREATE TABLE IF NOT EXISTS opportunities (
      id                  TEXT    PRIMARY KEY,
      title               TEXT    NOT NULL,
      summary             TEXT    NOT NULL,
      required_skills     TEXT    NOT NULL,  -- JSON array
      interest_tags       TEXT    NOT NULL,  -- JSON array
      availability_needs  TEXT    NOT NULL,  -- JSON array
      location            TEXT    NOT NULL,
      is_demo             INTEGER NOT NULL DEFAULT 1,
      active              INTEGER NOT NULL DEFAULT 1,
      created_at          TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS volunteers (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      reference            TEXT    NOT NULL UNIQUE,
      full_name            TEXT    NOT NULL,
      email                TEXT    NOT NULL,
      mobile               TEXT    NOT NULL,
      date_of_birth        TEXT,
      blood_group          TEXT,
      id_proof_masked      TEXT,              -- last 4 digits only; full number is never stored
      category             TEXT,
      area_of_interest     TEXT,
      skills               TEXT    NOT NULL,  -- JSON array
      interests            TEXT    NOT NULL,  -- JSON array
      availability         TEXT    NOT NULL,  -- JSON array
      preferred_activities TEXT    NOT NULL,  -- JSON array
      hours_per_week       INTEGER,
      status               TEXT    NOT NULL DEFAULT 'Pending'
                             CHECK (status IN ('Pending','Contacted','Active','Declined')),
      dedupe_hash          TEXT    NOT NULL UNIQUE,
      created_at           TEXT    NOT NULL,
      updated_at           TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_volunteers_created ON volunteers(created_at);
    CREATE INDEX IF NOT EXISTS idx_volunteers_status  ON volunteers(status);

    CREATE TABLE IF NOT EXISTS volunteer_matches (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      volunteer_id       INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
      opportunity_id     TEXT    NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
      score              REAL    NOT NULL,
      skill_score        REAL    NOT NULL,
      interest_score     REAL    NOT NULL,
      availability_score REAL    NOT NULL,
      matched_skills     TEXT    NOT NULL,  -- JSON array
      rationale          TEXT    NOT NULL,
      created_at         TEXT    NOT NULL,
      UNIQUE (volunteer_id, opportunity_id)
    );
    CREATE INDEX IF NOT EXISTS idx_matches_volunteer ON volunteer_matches(volunteer_id, score DESC);

    CREATE TABLE IF NOT EXISTS settings (
      key    TEXT PRIMARY KEY,
      value  TEXT NOT NULL
    );
    `,
  },
];
