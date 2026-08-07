-- Task energy replaces priority (2026-08-07): priority was a guilt field —
-- everything the user cared about eventually became "high", and the field
-- stopped carrying information. Energy asks a different, useful question:
-- how much focus does this take, not how important is it. Run in the
-- Supabase SQL Editor.
--
-- The old `priority` column is left in place, untouched — nothing is
-- dropped. The app no longer reads or writes it. If you're confident you'll
-- never want it back, you may drop it yourself later with:
--   alter table work_items drop column priority;
-- That's your call, not something this migration does for you.

alter table work_items add column if not exists energy text
  check (energy is null or energy in ('light', 'medium', 'deep'));
