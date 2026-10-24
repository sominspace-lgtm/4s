-- The household's own Google account (2026-10-24): a shared email that
-- belongs to the two of you, not to one person. Same shape and the same
-- lock-down as google_connections: RLS on with no policies, so only the
-- server (service role) can read or write it, and the tokens are stored
-- encrypted. Safe to run twice.

create table if not exists household_google_connections (
  space_id      uuid primary key references shared_spaces(id) on delete cascade,
  connected_by  uuid references auth.users(id) on delete set null,
  google_email  text,
  scopes        text,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table household_google_connections enable row level security;
-- Deliberately no policies on this table.
