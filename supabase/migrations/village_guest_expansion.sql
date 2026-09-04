-- Village Guest Mode expansion (2026-09-03).
-- Guest Mode becomes a real control panel for the night: a menu, an
-- agenda, a message the hosts can pin to the wall, and Somi's little
-- card (age / churu / tricks).
--
-- menu    = [{ id, name, note }]          -- note holds "veg" / "has nuts" etc.
-- agenda  = [{ id, time, label, done }]   -- "7:00" / "Dinner", struck when done
-- pet_info = { name, ageText, snack, tricks: string[], notes }  -- overrides DEFAULT_SOMI
--
-- No RLS or publication change: `gatherings` is already
--   `created_by = auth.uid() or is_space_member(space_id, auth.uid())`
-- and in the supabase_realtime publication (whole rows are sent, so the
-- new columns ride along); `shared_spaces` already has a member policy.

alter table gatherings add column if not exists menu jsonb not null default '[]'::jsonb;
alter table gatherings add column if not exists agenda jsonb not null default '[]'::jsonb;
alter table gatherings add column if not exists pinned_contribution_id uuid
  references guest_contributions(id) on delete set null;

alter table shared_spaces add column if not exists pet_info jsonb not null default '{}'::jsonb;
