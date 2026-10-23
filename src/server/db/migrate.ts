// Applies the versioned SQL migrations in supabase/migrations/ in filename order, recording each
// in a _migrations table so re-running is a no-op. The same files are applied to Supabase (via
// the MCP server or the Supabase CLI) and to the PGlite database the tests use, so what is tested
// is what ships.

import fs from "node:fs/promises";
import path from "node:path";

// Explicit .ts extension so the Node test runner can load this module directly (tsconfig sets
// allowImportingTsExtensions; Turbopack resolves it the same way).
import { getSql, type Sql } from "./sql.ts";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

export async function migrationFiles(): Promise<string[]> {
  const entries = await fs.readdir(MIGRATIONS_DIR);
  return entries.filter((name) => name.endsWith(".sql")).sort();
}

export async function applyMigrations(sql?: Sql): Promise<string[]> {
  const db = sql ?? (await getSql());

  await db.exec(`
    create table if not exists public._migrations (
      id         text        primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const applied = new Set(
    (await db.query<{ id: string }>(`select id from public._migrations`)).map((r) => r.id)
  );

  const ran: string[] = [];
  for (const file of await migrationFiles()) {
    if (applied.has(file)) continue;
    const text = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    await db.exec(text);
    await db.query(`insert into public._migrations (id) values ($1)`, [file]);
    ran.push(file);
  }
  return ran;
}
