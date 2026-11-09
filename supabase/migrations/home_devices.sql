-- Paired screens (2026-11-08). A wall iPad gets its own key instead of
-- signing in as a person. Only the server (service role) ever reads or
-- writes these tables, so RLS is on with no policies at all: the browser
-- can never see a key hash or list another household's screens.
-- Run once in the Supabase SQL Editor.

create table if not exists home_devices (
  id            uuid primary key default gen_random_uuid(),
  space_id      uuid not null references shared_spaces(id) on delete cascade,
  name          text not null,
  mode          text not null default 'ambient' check (mode in ('ambient')),
  token_hash    text unique,
  added_by      uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz,
  revoked_at    timestamptz
);

create index if not exists home_devices_space_idx on home_devices(space_id);
alter table home_devices enable row level security;

create table if not exists device_pair_requests (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  secret_hash  text not null unique,
  expires_at   timestamptz not null,
  device_id    uuid references home_devices(id) on delete cascade,
  approved_by  uuid references auth.users(id) on delete set null,
  claimed_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists device_pair_requests_expires_idx on device_pair_requests(expires_at);
alter table device_pair_requests enable row level security;
