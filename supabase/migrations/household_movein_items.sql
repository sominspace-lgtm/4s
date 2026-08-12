-- Move-in items (2026-08-12) — the shared "we need to buy this for the new
-- place" list, separate from household_shopping on purpose. Shopping is
-- groceries and consumables, restocked weekly, gone the moment it's used.
-- Move-in is furniture, appliances, one-off setup purchases for a specific
-- life event (moving in together) — a different rhythm and a different
-- question ("what does our home still need" vs "what's out of milk").
-- Mixing them in one table/tab would bury one list inside the other right
-- when moving-in is the thing actually on someone's mind.
--
-- Same shape as household_shopping minus qty (a couch doesn't have a
-- quantity the way "6 eggs" does) — see supabase/migrations/household_shopping_notes.sql
-- for the sibling this mirrors.

create table if not exists household_movein_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  name        text not null,
  category    text,
  got         boolean not null default false,
  got_at      timestamptz,
  got_by      uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table household_movein_items enable row level security;

drop policy if exists "household_movein_items_own_or_space" on household_movein_items;
create policy "household_movein_items_own_or_space" on household_movein_items
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists household_movein_items_space_idx on household_movein_items(space_id);
create index if not exists household_movein_items_got_idx   on household_movein_items(got);
