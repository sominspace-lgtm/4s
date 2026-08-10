-- Household, round two (2026-08-07): a shared shopping list and a shared
-- notice board.
--
-- Same shape as household_chores/household_meals — space_id nullable
-- (null = just me, set = shared with that space), same own-or-space RLS via
-- the is_space_member() SECURITY DEFINER helper. Requires household.sql,
-- shared_spaces_and_item_sharing.sql and fix_shared_spaces_recursion.sql.
--
-- Why these two, of all the things a household app could add:
--   Shopping is the single highest-friction shared list there is — it's the
--   one thing everyone in a house needs to write to from a different room,
--   and "did you get milk" is the archetypal household failure.
--   Notes is the fridge door. Not tasks, not chores: the things you'd write
--   on a magnet pad — the gate code, the vet's number, "back late Tuesday".
--
-- Deliberately NOT included: assignment, points, or completion stats per
-- person. Making housework measurable per-head is how you make a household
-- worse, and the product's premise is reducing guilt rather than
-- redistributing it.

create table if not exists household_shopping (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  name        text not null,
  qty         text,
  -- Grouping by aisle-ish category keeps a 30-item list scannable in a shop.
  category    text,
  got         boolean not null default false,
  got_at      timestamptz,
  got_by      uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists household_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  body        text not null,
  -- Pinned notes sort first and survive the "clear done" sweep.
  pinned      boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table household_shopping enable row level security;
alter table household_notes    enable row level security;

drop policy if exists "shopping_own_or_space" on household_shopping;
create policy "shopping_own_or_space" on household_shopping
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

drop policy if exists "notes_own_or_space" on household_notes;
create policy "notes_own_or_space" on household_notes
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists household_shopping_space_idx on household_shopping(space_id);
create index if not exists household_shopping_got_idx   on household_shopping(got);
create index if not exists household_notes_space_idx    on household_notes(space_id);
