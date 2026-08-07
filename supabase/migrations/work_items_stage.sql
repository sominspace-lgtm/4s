-- Task stage evolution (2026-08-07): idea → seed → growing → completed →
-- landmark. Run in the Supabase SQL Editor.
--
-- `completed_at` is a safety net, not new: lib/hooks/useWorkItems.ts has
-- written to it since the very first commit, before this project tracked
-- migrations at all, so it almost certainly already exists — `if not
-- exists` makes this a harmless no-op if so.
--
-- `landmark` is new: a manual pin for "this one matters, keep it in the
-- skyline" — the automatic trigger (ran 14+ days from created_at to
-- completed_at) needs no storage at all, it's computed from dates you
-- already have. This column only exists for the cases the automatic rule
-- can't see.

alter table work_items add column if not exists completed_at timestamptz;
alter table work_items add column if not exists landmark boolean not null default false;
