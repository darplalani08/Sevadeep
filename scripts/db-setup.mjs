// Applies the versioned migrations to whatever DATABASE_URL points at, then reports what is
// actually in the database.
//
//   npm run db:setup    apply migrations, then report
//   npm run db:status   report only
//
// Safe to re-run: migrations are recorded in _migrations and the opportunity seed is
// "on conflict do nothing", so nothing is overwritten and no data is deleted.

const statusOnly = process.argv.includes("--status");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(`
DATABASE_URL is not set.

Create .env.local in the project root (it is git-ignored, so the password never reaches your
public repository) containing one line:

  DATABASE_URL=postgresql://postgres.<project-ref>:<password>@<host>.pooler.supabase.com:6543/postgres?sslmode=require

Get it from the Supabase dashboard:
  Project -> Settings -> Database -> Connection string -> Transaction pooler (port 6543)
`);
  process.exit(1);
}

const redacted = url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
const target = url.startsWith("pglite://")
  ? "local PGlite (test database, NOT Supabase)"
  : url.includes("supabase")
    ? "Supabase"
    : "a Postgres server";

console.log(`Target : ${target}`);
console.log(`URL    : ${redacted}\n`);

const { getSql } = await import("../src/server/db/sql.ts");
const { applyMigrations, migrationFiles } = await import("../src/server/db/migrate.ts");

const sql = await getSql();

if (!statusOnly) {
  const available = await migrationFiles();
  console.log(`Migrations on disk: ${available.join(", ")}`);
  const applied = await applyMigrations(sql);
  console.log(
    applied.length ? `Applied now       : ${applied.join(", ")}` : "Applied now       : none (already up to date)"
  );
  console.log("");
}

const tables = await sql.query(
  `select c.relname as table,
          c.relrowsecurity as rls,
          (select count(*) from pg_policies p
            where p.schemaname = 'public' and p.tablename = c.relname)::int as policies
     from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    order by c.relname`
);

console.log("Tables:");
for (const t of tables) {
  if (t.table === "_migrations") continue;
  const counted = await sql.query(`select count(*)::text as n from public."${t.table}"`);
  console.log(
    `  ${t.table.padEnd(20)} ${String(counted[0].n).padStart(5)} rows   RLS ${
      t.rls ? "on " : "OFF"
    }  policies ${t.policies}`
  );
}

const admins = await sql.query(
  `select count(*)::text as n from public.accounts where role = 'admin'`
).catch(() => [{ n: "?" }]);

console.log(`
Administrator accounts: ${admins[0].n}`);
if (admins[0].n === "0") {
  console.log("  -> no administrator yet. Start the app and open /admin/setup to create the first one.");
}

await sql.close();
console.log("\nDone.");
