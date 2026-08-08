-- Household (2026-08-07) — the shared-living tab: chores, meals, and who's
-- doing what, for couples or families under one roof.
--
-- A "household" is just an existing shared_space, not a new membership
-- concept — you already invite people to spaces, and inventing a second
-- parallel way to say "these people live with me" would mean two invite
-- flows, two accept flows, and two places to revoke. space_id is nullable:
-- null = personal (living alone, or tracking chores you own), set = shared
-- with everyone in that space.
--
-- Requires shared_spaces_and_item_sharing.sql (spaces + members) and
-- fix_shared_spaces_recursion.sql (the is_space_member SECURITY DEFINER
-- helper the policies below use to avoid RLS recursion).

create table if not exists household_chores (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  space_id      uuid references shared_spaces(id) on delete cascade,
  name          text not null,
  cadence_days  integer not null default 7,
  last_done_at  date,
  last_done_by  uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists household_meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  meal_date   date not null,
  slot        text not null default 'dinner' check (slot in ('breakfast', 'lunch', 'dinner')),
  title       text not null,
  cook        text,
  created_at  timestamptz not null default now()
);

alter table household_chores enable row level security;
alter table household_meals  enable row level security;

-- Yours, or shared with a space you're an accepted member of. Same shape for
-- both tables. is_space_member() is SECURITY DEFINER so this never recurses
-- back through shared_space_members' own policies.
drop policy if exists "chores_own_or_space" on household_chores;
create policy "chores_own_or_space" on household_chores
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

drop policy if exists "meals_own_or_space" on household_meals;
create policy "meals_own_or_space" on household_meals
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists household_chores_space_idx on household_chores(space_id);
create index if not exists household_meals_space_idx  on household_meals(space_id);
create index if not exists household_meals_date_idx   on household_meals(meal_date);
