// SQLite connection for the SevaDeep platform features.
//
// Uses `node:sqlite` (bundled with Node 22.5+) so the project needs no native build step and no
// extra dependency. The file lives at <project>/data/sevadeep.db and is created on first use;
// migrations are additive and the database is never dropped on startup.

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

import { migrations } from "./schema";
import { defaultOpportunities } from "./opportunity-seed";

export type Db = DatabaseSync;

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "sevadeep.db");

function resolveDbPath() {
  return process.env.SEVADEEP_DB_PATH
    ? path.resolve(process.env.SEVADEEP_DB_PATH)
    : DEFAULT_DB_PATH;
}

function applyMigrations(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id          TEXT PRIMARY KEY,
    applied_at  TEXT NOT NULL
  );`);

  const applied = new Set(
    (db.prepare(`SELECT id FROM _migrations`).all() as { id: string }[]).map((r) => r.id)
  );

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    db.exec("BEGIN");
    try {
      db.exec(migration.sql);
      db.prepare(`INSERT INTO _migrations (id, applied_at) VALUES (?, ?)`).run(
        migration.id,
        new Date().toISOString()
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

// Seeds the opportunity catalogue only when it is empty, so administrator edits and removals
// are never undone by a restart.
function seedOpportunities(db: DatabaseSync) {
  const { count } = db.prepare(`SELECT COUNT(*) AS count FROM opportunities`).get() as {
    count: number;
  };
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO opportunities
      (id, title, summary, required_skills, interest_tags, availability_needs, location, is_demo, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const now = new Date().toISOString();
  db.exec("BEGIN");
  try {
    for (const o of defaultOpportunities) {
      insert.run(
        o.id,
        o.title,
        o.summary,
        JSON.stringify(o.requiredSkills),
        JSON.stringify(o.interestTags),
        JSON.stringify(o.availabilityNeeds),
        o.location,
        o.isDemo ? 1 : 0,
        now
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function create(): DatabaseSync {
  const file = resolveDbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new DatabaseSync(file);
  // WAL keeps concurrent dev-server readers from blocking the writer; FKs are off by default.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");

  applyMigrations(db);
  seedOpportunities(db);
  return db;
}

// `next dev` re-evaluates server modules on change; cache the handle on globalThis so each
// reload reuses one connection instead of leaking file handles.
const globalForDb = globalThis as unknown as { __sevadeepDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (!globalForDb.__sevadeepDb) {
    globalForDb.__sevadeepDb = create();
  }
  return globalForDb.__sevadeepDb;
}

/** Runs `fn` inside a transaction, rolling back if it throws. */
export function transaction<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* already rolled back */
    }
    throw error;
  }
}

export function dbPath() {
  return resolveDbPath();
}
