-- Household routines + maintenance (user request, 2026-08-13) — one table,
-- discriminated by `kind`, same pattern household_watchlist already uses
-- for domain ('media'/'game'). Both are "named thing + sub-tasks + cadence
-- + mark-done," differing only in typical cadence length and where they
-- surface in the UI:
--
--   kind='routine'     — a named multi-step chore ("Sunday Home Reset":
--                         Bathroom, Kitchen, Laundry, Trash, Sheets), a Home
--                         block alongside the existing flat household_chores
--                         (unchanged, coexists — chores stays the lightweight
--                         single-item "whose turn" list).
--   kind='maintenance' — long-cadence items ("HVAC filter every 3 months")
--                        that would get lost in a weekly chore/routine list,
--                        surfaced in Reference instead.
--
-- items is jsonb, same shape household_lists already uses:
-- [{"id": uuid, "label": text, "done": bool}] — client-owned, generic-CRUD-
-- friendly, no bespoke nested-resource route needed.

create table if not exists household_routines (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  space_id      uuid references shared_spaces(id) on delete cascade,
  kind          text not null default 'routine' check (kind in ('routine', 'maintenance')),
  name          text not null,
  cadence_days  integer not null default 7,
  items         jsonb not null default '[]'::jsonb,
  last_done_at  date,
  last_done_by  uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table household_routines enable row level security;

drop policy if exists "routines_own_or_space" on household_routines;
create policy "routines_own_or_space" on household_routines
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists household_routines_space_idx on household_routines(space_id);
create index if not exists household_routines_kind_idx  on household_routines(kind);
