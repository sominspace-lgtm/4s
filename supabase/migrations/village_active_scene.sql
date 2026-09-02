-- Scene-reactive figures (2026-09-02).
--
-- active_scene records which smart-home scene is currently applied, so the
-- Village reacts (Goodnight → the couple asleep, Movie → sitting still,
-- We're out → figures gone, Party → warm), and both partners' screens + the
-- wall agree. Cleared to null by any manual device toggle or "We're home".
--   { "id": "<scene uuid>", "name": "Movie", "appliedAt": "<iso>" }
--
-- Realtime on shared_spaces + household_smarthome_devices so a scene applied
-- on one screen shows on the other within a second.

alter table shared_spaces add column if not exists active_scene jsonb;

-- If either of these errors "relation is already member of publication",
-- that line is already done — just drop it and run the rest.
alter publication supabase_realtime add table shared_spaces;
alter publication supabase_realtime add table household_smarthome_devices;
