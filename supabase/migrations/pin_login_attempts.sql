-- PIN login rate limiting (2026-08-20) — a short PIN has a small keyspace, so
-- the thing actually protecting it is a hard lockout after repeated wrong
-- guesses, not the PIN's length. One row per profile (harry/sylvia — only
-- ever 2-3 fixed values, never user-created), reset on a correct PIN.
-- Run once in the Supabase SQL Editor.

create table if not exists pin_login_attempts (
  profile       text primary key,
  fail_count    integer not null default 0,
  locked_until  timestamptz,
  updated_at    timestamptz not null default now()
);

alter table pin_login_attempts enable row level security;

-- No client ever reads or writes this directly — only the service-role key
-- used inside app/api/auth/pin-login/route.ts touches it. Deny-all for the
-- anon/authenticated roles is the correct policy here, not an "own row" rule.
drop policy if exists "pin_login_attempts_service_only" on pin_login_attempts;
create policy "pin_login_attempts_service_only" on pin_login_attempts
  for all using (false) with check (false);
