-- Google connection (2026-10-05): Calendar + Gmail, read and write.
--
-- One row per 4S user. The tokens are the whole point of the table, so RLS is
-- enabled with NO policies: neither the anon nor the authenticated role can
-- read or write it. Only server routes using the service-role client touch
-- it (see lib/google/server.ts). The browser learns "connected or not" from
-- /api/google/status, never the tokens. Tokens are also stored encrypted.

create table if not exists google_connections (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  google_email  text,
  scopes        text,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table google_connections enable row level security;
-- Deliberately no policies on this table.

-- Routines get a time of day so the calendar's Routines view can place them in
-- Morning / Daytime / Evening rows.
alter table household_routines add column if not exists time_of_day text
  check (time_of_day in ('morning', 'day', 'evening'));
