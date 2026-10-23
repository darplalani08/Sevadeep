-- SevaDeep platform — initial Postgres schema.
--
-- Target: Supabase project mvuhxlnvulaepxxfxmvj.
-- Replaces the SQLite schema in src/server/db/schema.ts, which cannot work on Vercel (read-only,
-- per-invocation-ephemeral filesystem — see SEVADEEP_AUDIT.md §2).
--
-- SECURITY POSTURE
-- Every table has RLS enabled AND forced, and deliberately has **no policies at all**. All
-- application access goes through the service-role key, server-side only, inside Next route
-- handlers that do their own authorisation (requireAdmin(), reference+code for tracking).
-- With no policies, anon and authenticated are denied everything by default, so a leaked
-- publishable key grants no read of applicant data. Grants to those roles are revoked as well,
-- belt and braces. If browser-side access is ever wanted, add explicit policies then — do not
-- loosen this file.
--
-- CONVENTIONS
--   * lowercase, unquoted identifiers throughout
--   * bigint generated always as identity for surrogate keys (sequential, 8 bytes, SQL-standard)
--   * timestamptz everywhere, never naive timestamp
--   * every foreign key has a covering index
--   * check constraints mirror the application's enums so an invalid row cannot be written
--     even if a future caller forgets to validate

-- (the migration runner wraps this file in a transaction — see src/server/db/sql.ts)

-- ---------------------------------------------------------------------------
-- accounts: one table for every human login (administrator, donor, NGO)
-- ---------------------------------------------------------------------------
-- A single accounts table with a role column, rather than three parallel tables, so there is one
-- credential format, one session mechanism and one place to audit. Usernames are stored already
-- normalised to lowercase and are unique across all roles.

create table if not exists public.accounts (
  id             bigint generated always as identity primary key,
  username       text        not null,
  role           text        not null check (role in ('admin', 'donor', 'ngo')),
  display_name   text        not null check (length(btrim(display_name)) between 2 and 120),
  email          text,
  phone          text,
  organisation   text,                      -- NGO accounts only
  password_hash  text        not null,      -- scrypt: scrypt$N$r$p$salt$key
  status         text        not null default 'active'
                   check (status in ('active', 'suspended')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_login_at  timestamptz,

  constraint accounts_username_format
    check (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$')
);

-- Usernames are case-insensitive to the user but stored lowercase; this is the uniqueness rule.
create unique index if not exists accounts_username_key on public.accounts (username);
create index if not exists accounts_role_idx on public.accounts (role);
-- Partial index: lookups that matter are nearly always for accounts that can still sign in.
create index if not exists accounts_active_role_idx on public.accounts (role) where status = 'active';

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
-- The cookie carries a random token; only its sha256 is stored, so the database never holds a
-- usable session credential.

create table if not exists public.sessions (
  token_hash  text        primary key,
  account_id  bigint      not null references public.accounts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  user_agent  text
);

create index if not exists sessions_account_idx on public.sessions (account_id);
create index if not exists sessions_expires_idx on public.sessions (expires_at);

-- ---------------------------------------------------------------------------
-- login_attempts: brute-force counter that survives a restart
-- ---------------------------------------------------------------------------

create table if not exists public.login_attempts (
  id         bigint generated always as identity primary key,
  scope_key  text        not null,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_scope_idx on public.login_attempts (scope_key, created_at desc);

-- ---------------------------------------------------------------------------
-- ref_counters + reserve_reference(): gap-free human references
-- ---------------------------------------------------------------------------
-- Done as a function so the counter bump is atomic with respect to concurrent callers in one
-- round trip. `on conflict do update ... returning` serialises writers on the row lock.

create table if not exists public.ref_counters (
  kind      text    not null,
  year      integer not null,
  next_val  integer not null,
  primary key (kind, year)
);

create or replace function public.reserve_reference(p_kind text, p_year integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq integer;
begin
  insert into public.ref_counters (kind, year, next_val)
  values (p_kind, p_year, 2)
  on conflict (kind, year)
    do update set next_val = public.ref_counters.next_val + 1
  returning case when xmax = 0 then 1 else next_val - 1 end into v_seq;

  return v_seq;
end;
$$;

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------

create table if not exists public.applications (
  id              bigint generated always as identity primary key,
  reference       text        not null,
  track_code_hash text        not null,          -- salt$sha256(salt:reference:code)
  student_name    text        not null check (length(btrim(student_name)) between 2 and 100),
  guardian_name   text        not null check (length(btrim(guardian_name)) between 2 and 100),
  contact_number  text        not null check (contact_number ~ '^[6-9][0-9]{9}$'),
  email           text,
  student_age     integer     check (student_age between 3 and 30),
  student_class   text        not null,
  city            text,
  support_needed  text[]      not null default '{}',
  notes           text,
  status          text        not null default 'Submitted'
                    check (status in ('Submitted', 'Under Review', 'Approved', 'Rejected')),
  dedupe_hash     text        not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists applications_reference_key   on public.applications (reference);
create unique index if not exists applications_dedupe_hash_key on public.applications (dedupe_hash);
create index        if not exists applications_status_idx      on public.applications (status);
create index        if not exists applications_created_idx     on public.applications (created_at desc);
create index        if not exists applications_updated_idx     on public.applications (updated_at desc);
-- Supports the dashboard's free-text search without a sequential scan as the table grows.
create index        if not exists applications_search_idx on public.applications
  using gin (to_tsvector('simple',
    coalesce(reference,'') || ' ' || coalesce(student_name,'') || ' ' ||
    coalesce(guardian_name,'') || ' ' || coalesce(contact_number,'') || ' ' ||
    coalesce(email,'') || ' ' || coalesce(city,'')));

create table if not exists public.application_events (
  id             bigint generated always as identity primary key,
  application_id bigint      not null references public.applications(id) on delete cascade,
  from_status    text,
  to_status      text        not null
                   check (to_status in ('Submitted', 'Under Review', 'Approved', 'Rejected')),
  note           text,
  actor          text        not null,   -- 'applicant' or the administrator's username
  created_at     timestamptz not null default now()
);

create index if not exists application_events_app_idx
  on public.application_events (application_id, created_at);

-- ---------------------------------------------------------------------------
-- opportunities (administrator-owned catalogue)
-- ---------------------------------------------------------------------------

create table if not exists public.opportunities (
  id                 text        primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,48}$'),
  title              text        not null,
  summary            text        not null,
  required_skills    text[]      not null default '{}',
  interest_tags      text[]      not null default '{}',
  availability_needs text[]      not null default '{}',
  location           text        not null,
  is_demo            boolean     not null default true,
  active             boolean     not null default true,
  created_at         timestamptz not null default now()
);

-- Partial index: the public catalogue and the matcher only ever read active rows.
create index if not exists opportunities_active_idx on public.opportunities (title) where active;

-- ---------------------------------------------------------------------------
-- volunteers + stored match results
-- ---------------------------------------------------------------------------

create table if not exists public.volunteers (
  id                   bigint generated always as identity primary key,
  reference            text        not null,
  account_id           bigint      references public.accounts(id) on delete set null,
  full_name            text        not null,
  email                text        not null,
  mobile               text        not null check (mobile ~ '^[6-9][0-9]{9}$'),
  date_of_birth        date,
  blood_group          text,
  id_proof_masked      text,        -- last 4 digits only; the full number is never stored
  category             text,
  area_of_interest     text,
  skills               text[]      not null default '{}',
  interests            text[]      not null default '{}',
  availability         text[]      not null default '{}',
  preferred_activities text[]      not null default '{}',
  hours_per_week       integer     check (hours_per_week between 1 and 60),
  status               text        not null default 'Pending'
                         check (status in ('Pending', 'Under Review', 'Approved', 'Rejected')),
  dedupe_hash          text        not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create unique index if not exists volunteers_reference_key   on public.volunteers (reference);
create unique index if not exists volunteers_dedupe_hash_key on public.volunteers (dedupe_hash);
create index        if not exists volunteers_status_idx      on public.volunteers (status);
create index        if not exists volunteers_created_idx     on public.volunteers (created_at desc);
create index        if not exists volunteers_account_idx     on public.volunteers (account_id);
-- GIN on the arrays so "which volunteers have skill X" is an index lookup, not a scan.
create index        if not exists volunteers_skills_idx       on public.volunteers using gin (skills);
create index        if not exists volunteers_availability_idx on public.volunteers using gin (availability);

create table if not exists public.volunteer_matches (
  id                 bigint generated always as identity primary key,
  volunteer_id       bigint      not null references public.volunteers(id) on delete cascade,
  opportunity_id     text        not null references public.opportunities(id) on delete cascade,
  score              numeric(5,2) not null check (score between 0 and 100),
  skill_score        numeric(5,2) not null check (skill_score between 0 and 100),
  interest_score     numeric(5,2) not null check (interest_score between 0 and 100),
  availability_score numeric(5,2) not null check (availability_score between 0 and 100),
  matched_skills     text[]      not null default '{}',
  rationale          text        not null,
  created_at         timestamptz not null default now(),

  unique (volunteer_id, opportunity_id)
);

create index if not exists volunteer_matches_volunteer_idx
  on public.volunteer_matches (volunteer_id, score desc);
create index if not exists volunteer_matches_opportunity_idx
  on public.volunteer_matches (opportunity_id);

-- ---------------------------------------------------------------------------
-- settings (configurable matching weights)
-- ---------------------------------------------------------------------------

create table if not exists public.settings (
  key   text primary key,
  value jsonb not null
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists accounts_touch     on public.accounts;
drop trigger if exists applications_touch on public.applications;
drop trigger if exists volunteers_touch   on public.volunteers;

create trigger accounts_touch     before update on public.accounts
  for each row execute function public.touch_updated_at();
create trigger applications_touch before update on public.applications
  for each row execute function public.touch_updated_at();
create trigger volunteers_touch   before update on public.volunteers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Lock the database down
-- ---------------------------------------------------------------------------
-- RLS is ENABLED on every table with no policies defined, so anon and authenticated read and
-- write nothing, by default, forever. service_role has bypassrls and is the only thing the
-- application uses — server-side, never shipped to the browser.
--
-- Deliberately NOT "force row level security": FORCE applies RLS to the table owner (postgres)
-- as well, which is the role the Supabase dashboard's table editor connects as. With no policies
-- that would leave the project owner unable to read their own rows. ENABLE is the correct
-- strength here; add FORCE only alongside explicit policies.

alter table public.accounts           enable row level security;
alter table public.sessions           enable row level security;
alter table public.login_attempts     enable row level security;
alter table public.ref_counters       enable row level security;
alter table public.applications       enable row level security;
alter table public.application_events enable row level security;
alter table public.opportunities      enable row level security;
alter table public.volunteers         enable row level security;
alter table public.volunteer_matches  enable row level security;
alter table public.settings           enable row level security;

-- Least privilege: the browser-facing roles are given nothing at all.
--
-- Wrapped in a role-existence check so this same file also runs against a plain Postgres (the
-- test harness uses PGlite, which has no anon/authenticated/service_role). On Supabase all three
-- exist and every statement below applies.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables    in schema public from anon;
    revoke all on all sequences in schema public from anon;
    revoke all on all functions in schema public from anon;
    alter default privileges in schema public revoke all on tables    from anon;
    alter default privileges in schema public revoke all on sequences from anon;
    alter default privileges in schema public revoke all on functions from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on all tables    in schema public from authenticated;
    revoke all on all sequences in schema public from authenticated;
    revoke all on all functions in schema public from authenticated;
    alter default privileges in schema public revoke all on tables    from authenticated;
    alter default privileges in schema public revoke all on sequences from authenticated;
    alter default privileges in schema public revoke all on functions from authenticated;
  end if;

  revoke execute on function public.reserve_reference(text, integer) from public;

  -- ...but the application must still be able to call it.
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.reserve_reference(text, integer) to service_role;
  end if;
end
$$;
