-- Household rules + inventory (2026-08-10) — backfilled into the repo
-- 2026-08-11. These tables were created by pasting SQL straight into the
-- Supabase editor and never committed, which meant the schema could not be
-- rebuilt from this repo. Do not do that again: every table gets a file here.
--
-- Same shape and RLS as household_shopping/household_notes: space_id nullable
-- (null = just me, set = shared with that space), own-or-space access via the
-- is_space_member() SECURITY DEFINER helper. Requires household.sql,
-- shared_spaces_and_item_sharing.sql, fix_shared_spaces_recursion.sql.

create table if not exists household_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  text        text not null,
  category    text,
  note        text,
  -- Retired rules stay readable instead of being deleted: "we used to do this"
  -- is household history, and a hard delete loses why it changed.
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists household_inventory (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  name        text not null,
  room        text,
  note        text,
  created_at  timestamptz not null default now()
);

alter table household_rules     enable row level security;
alter table household_inventory enable row level security;

drop policy if exists "rules_own_or_space" on household_rules;
create policy "rules_own_or_space" on household_rules
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

drop policy if exists "inventory_own_or_space" on household_inventory;
create policy "inventory_own_or_space" on household_inventory
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists household_rules_space_idx     on household_rules(space_id);
create index if not exists household_rules_active_idx    on household_rules(active);
create index if not exists household_inventory_space_idx on household_inventory(space_id);
create index if not exists household_inventory_room_idx  on household_inventory(room);
