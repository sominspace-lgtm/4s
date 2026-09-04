-- Bin day (2026-09-03). Which weekday the trash / recycling goes out, so
-- the village can put a bin by the gate the evening before and the
-- morning of, and the ambient readout can lead with it.
--
-- bin_days = { "trash": 0-6, "recycling": 0-6 }   -- 0 = Sunday
--
-- Same jsonb-blob pattern as shared_spaces.guest_info / pet_info: the
-- member RLS policy and full-row realtime already cover a new column, no
-- policy or publication change.

alter table shared_spaces add column if not exists bin_days jsonb not null default '{}'::jsonb;
