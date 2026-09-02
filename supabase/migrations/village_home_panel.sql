-- Village home-panel batch A (2026-09-01):
--   music_url — a house playlist link (Spotify / YouTube), shown as an
--     embedded player on the Village home sheet and reused for the guest
--     party screen. Space-level, not per-gathering.
--   scenes — named smart-home presets: [{ id, name, icon, devices: { <deviceId>: bool } }].
--     Applying one flips household_smarthome_devices.on_state for the listed
--     devices (see lib/smarthome/apply.ts). Real hub control (Home Assistant
--     / Alexa) slots into that same function later.

alter table shared_spaces add column if not exists music_url text;
alter table shared_spaces add column if not exists scenes jsonb not null default '[]'::jsonb;
