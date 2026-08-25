-- Smart Home (2026-08-25) -- a manual device/status list, not a real
-- automation integration (no Home Assistant/IoT API exists in this app).
-- Same shape as household_rules/household_movein_items: space_id nullable
-- (null = just me, set = shared with that space), own-or-space access via
-- the is_space_member() SECURITY DEFINER helper.
-- Run once in the Supabase SQL Editor.

create table if not exists household_smarthome_devices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,

  name        text not null,
  category    text,
  on_state    boolean not null default false,
  note        text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table household_smarthome_devices enable row level security;

drop policy if exists "smarthome_devices_own_or_space" on household_smarthome_devices;
create policy "smarthome_devices_own_or_space" on household_smarthome_devices
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists household_smarthome_devices_space_idx on household_smarthome_devices(space_id);
