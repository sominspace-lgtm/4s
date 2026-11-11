-- Home Assistant (2026-11-10): a household can connect its own Home
-- Assistant, and its lights, plugs, thermostat, locks, blinds, fans, TVs and
-- speakers show up in Home controls with their real rooms. Additive only.
-- Run once in the Supabase SQL Editor of the SS project.

-- Where the household's Home Assistant is, and the key SS uses to reach it.
-- Only the server (service role) can read or write it: RLS is on with no
-- policies, same as home_devices. The key never goes back to a browser.
-- An earlier, never-used SmartThings version of this table (always empty)
-- may exist; it is replaced.
drop table if exists smarthome_links;
create table smarthome_links (
  space_id uuid primary key references shared_spaces(id) on delete cascade,
  provider text not null default 'home_assistant' check (provider in ('home_assistant')),
  base_url text not null,
  access_token text not null,
  connected_by uuid references auth.users(id) on delete set null,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table smarthome_links enable row level security;

-- Which real device a row stands for (its Home Assistant entity id), and
-- what it can do, so a command goes out without asking first.
alter table household_smarthome_devices add column if not exists external_id text;
alter table household_smarthome_devices add column if not exists meta jsonb not null default '{}'::jsonb;
create unique index if not exists household_smarthome_devices_external
  on household_smarthome_devices (space_id, provider, external_id) where external_id is not null;

alter table household_smarthome_devices drop constraint if exists household_smarthome_devices_provider_check;
alter table household_smarthome_devices add constraint household_smarthome_devices_provider_check
  check (provider in ('manual', 'practice', 'home_assistant'));
