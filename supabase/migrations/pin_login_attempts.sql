-- PIN login (2026-08-20) — one row per fixed profile (harry/sylvia/shared,
-- never user-created). pin_hash starts null for harry/sylvia: the app
-- treats a null hash as "not set up yet" and lets that profile choose its
-- own PIN the first time it's opened, rather than a hash baked into an env
-- var at deploy time. Shared's PIN is fixed and seeded directly (see setup
-- notes) since it's shared, not personal.
--
-- fail_count/locked_until is the actual protection for a short PIN's small
-- keyspace — see app/api/auth/pin-login/route.ts.
-- Run once in the Supabase SQL Editor.

create table if not exists pin_login_attempts (
  profile       text primary key,
  pin_hash      text,
  fail_count    integer not null default 0,
  locked_until  timestamptz,
  updated_at    timestamptz not null default now()
);

alter table pin_login_attempts enable row level security;

-- No client ever reads or writes this directly — only the service-role key
-- used inside app/api/auth/pin-* routes touches it. Deny-all for the
-- anon/authenticated roles is the correct policy here, not an "own row" rule.
drop policy if exists "pin_login_attempts_service_only" on pin_login_attempts;
create policy "pin_login_attempts_service_only" on pin_login_attempts
  for all using (false) with check (false);
