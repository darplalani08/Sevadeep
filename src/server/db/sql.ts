// Minimal Postgres driver boundary.
//
// Two implementations behind one tiny interface:
//
//   postgres://…   the `postgres` driver, used at runtime against Supabase's transaction-mode
//                  pooler. Chosen over @supabase/supabase-js because this application depends on
//                  real multi-statement transactions — the reference counter, the row insert and
//                  its first audit event must commit together — and PostgREST cannot express a
//                  transaction across statements.
//   pglite://…     Postgres compiled to WebAssembly, used by the test suites so the schema and
//                  every query are exercised against a genuine Postgres rather than a mock.
//
// Keeping the surface this small is what lets the same repository code run in both.

import type { PGlite } from "@electric-sql/pglite";

export type Row = Record<string, unknown>;

export type Sql = {
  /** Runs a parameterised statement. Never interpolate values into `text`. */
  query<T = Row>(text: string, params?: readonly unknown[]): Promise<T[]>;
  /** Runs `fn` inside a transaction, rolling back if it throws. */
  transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
  /** Multi-statement DDL (migrations only). */
  exec(text: string): Promise<void>;
  close(): Promise<void>;
  kind: "postgres" | "pglite";
};

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Point it at the Supabase transaction pooler " +
        "(postgres://…:6543/postgres?sslmode=require), or at pglite://memory for tests. " +
        "See .env.example."
    );
  }
  return url;
}

// ---------------------------------------------------------------------------
// PGlite (tests)
// ---------------------------------------------------------------------------

async function createPglite(url: string): Promise<Sql> {
  const { PGlite } = await import("@electric-sql/pglite");
  // pglite://memory  -> in-memory;  pglite:///abs/path -> persisted to disk
  const target = url.slice("pglite://".length);
  const db: PGlite = await PGlite.create(
    target === "memory" || target === "" ? undefined : target
  );

  const wrap = (handle: {
    query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    exec: (text: string) => Promise<unknown>;
  }): Sql => ({
    kind: "pglite",
    async query<T>(text: string, params: readonly unknown[] = []) {
      const result = await handle.query(text, [...params]);
      return result.rows as T[];
    },
    async transaction<T>(fn: (tx: Sql) => Promise<T>) {
      // PGlite exposes transactions on the root handle only.
      return db.transaction(async (tx) => fn(wrap(tx as never))) as Promise<T>;
    },
    async exec(text: string) {
      await handle.exec(text);
    },
    async close() {
      await db.close();
    },
  });

  return wrap(db as never);
}

// ---------------------------------------------------------------------------
// postgres (runtime)
// ---------------------------------------------------------------------------

async function createPostgres(url: string): Promise<Sql> {
  const { default: postgres } = await import("postgres");

  const client = postgres(url, {
    // Supabase's transaction-mode pooler does not support prepared statements.
    // Keep max connections reasonable (10) to avoid queuing concurrent requests.
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: 60,
    connect_timeout: 15,
    ssl: url.includes("sslmode=disable") ? false : "require",
    onnotice: () => {},
  });

  const wrap = (handle: ReturnType<typeof postgres>): Sql => ({
    kind: "postgres",
    async query<T>(text: string, params: readonly unknown[] = []) {
      return (await handle.unsafe(text, params as never[])) as unknown as T[];
    },
    async transaction<T>(fn: (tx: Sql) => Promise<T>) {
      return client.begin(async (tx) => fn(wrap(tx as never))) as Promise<T>;
    },
    async exec(text: string) {
      // The driver owns transaction control, so migration files must not carry their own
      // begin/commit (it raises UNSAFE_TRANSACTION). Wrapping here keeps each migration atomic:
      // a failure rolls the whole file back rather than leaving a half-built schema.
      await client.begin(async (tx) => {
        await tx.unsafe(text);
      });
    },
    async close() {
      await client.end({ timeout: 5 });
    },
  });

  return wrap(client);
}

// `next dev` re-evaluates server modules on change, and each Vercel invocation reuses a warm
// container; cache the handle so neither leaks connections.
const globalForSql = globalThis as unknown as { __sevadeepSql?: Promise<Sql> };

export function getSql(): Promise<Sql> {
  if (!globalForSql.__sevadeepSql) {
    const url = databaseUrl();
    const connecting = url.startsWith("pglite://") ? createPglite(url) : createPostgres(url);

    // SEVADEEP_AUTO_MIGRATE applies the migration files on first use. It exists for local
    // development and the test harnesses, which own their database. It is deliberately OFF by
    // default: on Vercel several cold starts can begin at once, and migrating from inside a
    // request handler is the wrong place to do it. Production migrations go through the Supabase
    // MCP server or the Supabase CLI, out of band.
    globalForSql.__sevadeepSql =
      process.env.SEVADEEP_AUTO_MIGRATE === "1"
        ? connecting.then(async (sql) => {
            const { applyMigrations } = await import("./migrate.ts");
            await applyMigrations(sql);
            return sql;
          })
        : connecting;
  }
  return globalForSql.__sevadeepSql;
}

/** Test-suite helper: drop the cached handle so the next getSql() builds a fresh one. */
export async function resetSql(): Promise<void> {
  const existing = globalForSql.__sevadeepSql;
  globalForSql.__sevadeepSql = undefined;
  if (existing) {
    try {
      await (await existing).close();
    } catch {
      /* already gone */
    }
  }
}

/** Convenience for the common "one row or nothing" read. */
export async function queryOne<T = Row>(
  sql: Sql,
  text: string,
  params: readonly unknown[] = []
): Promise<T | null> {
  const rows = await sql.query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}
