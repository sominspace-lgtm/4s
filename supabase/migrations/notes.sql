-- Notes (2026-08-21) — an Apple Notes-style list + editor, replacing the old
-- Life/Domains grid (nine fixed categories, one-line captures only, no
-- titles). Same sharing shape as household_chores/household_meals: space_id
-- nullable, null = private, set = shared with everyone in that space. That's
-- the actual design principle behind this feature — not "notes can be
-- shared" as a special case, but "everything can be shared if you choose
-- to", the same switch every other list in this app already has.
--
-- Requires shared_spaces_and_item_sharing.sql and
-- fix_shared_spaces_recursion.sql (is_space_member), same as household.sql.
-- Run in the Supabase SQL Editor.

create table if not exists notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  title       text not null default '',
  body        text not null default '',
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table notes enable row level security;

drop policy if exists "notes_own_or_space" on notes;
create policy "notes_own_or_space" on notes
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists notes_user_idx  on notes(user_id);
create index if not exists notes_space_idx on notes(space_id);
