-- The Controller (2026-11-08): rooms, device kinds, a provider per device,
-- and a full state (brightness, temperature, locked, how open). Additive
-- only. Existing devices become plain on/off switches on your own list,
-- exactly as they work today. on_state stays, and the server keeps it in
-- step with `state` so the Village reads the same as before.
-- Run once in the Supabase SQL Editor.

alter table household_smarthome_devices add column if not exists room text;
alter table household_smarthome_devices add column if not exists kind text not null default 'switch';
alter table household_smarthome_devices add column if not exists provider text not null default 'manual';
alter table household_smarthome_devices add column if not exists state jsonb not null default '{}'::jsonb;

alter table household_smarthome_devices drop constraint if exists household_smarthome_devices_kind_check;
alter table household_smarthome_devices add constraint household_smarthome_devices_kind_check
  check (kind in ('light', 'plug', 'switch', 'thermostat', 'lock', 'blinds', 'speaker', 'fan', 'tv'));

alter table household_smarthome_devices drop constraint if exists household_smarthome_devices_provider_check;
alter table household_smarthome_devices add constraint household_smarthome_devices_provider_check
  check (provider in ('manual', 'practice'));
