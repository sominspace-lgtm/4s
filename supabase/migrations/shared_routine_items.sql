-- Shared routine items (2026-08-18) — lets ONE step inside an otherwise
-- private personal routine ("Morning routine: make bed, meditate, journal")
-- become visible to your partner, without exposing the rest of the routine.
--
-- This is deliberately a MIRROR, not a permissions rule on household_routines
-- itself. RLS is row-level, not field-level — there is no way to let a
-- partner read "just the shared item" out of a personal routine row without
-- handing them the whole row (every other step's label too). So sharing an
-- item writes a small, disposable copy of just that item's label + done
-- state here; the source of truth (household_routines, space_id null) never
-- becomes readable by anyone but its owner.
--
-- Read-only for the partner: this is "did they meditate today", not a shared
-- checklist either of you can tick for the other. Only the owner ever writes.
-- Run once in the Supabase SQL Editor.

create table if not exists shared_routine_items (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references shared_spaces(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  routine_id  uuid not null references household_routines(id) on delete cascade,
  -- household_routines' own item ids come from crypto.randomUUID() OR a
  -- Math.random() fallback (see lib/hooks/useRoutines.ts, newItemId()), so
  -- this is text, not uuid — the fallback form isn't valid uuid syntax.
  item_id     text not null,
  label       text not null,
  done        boolean not null default false,
  updated_at  timestamptz not null default now(),
  unique (routine_id, item_id)
);

alter table shared_routine_items enable row level security;

drop policy if exists "shared_routine_items_read" on shared_routine_items;
create policy "shared_routine_items_read" on shared_routine_items
  for select
  using (owner_id = auth.uid() or is_space_member(space_id, auth.uid()));

drop policy if exists "shared_routine_items_write_own" on shared_routine_items;
create policy "shared_routine_items_write_own" on shared_routine_items
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists shared_routine_items_space_idx on shared_routine_items(space_id);
