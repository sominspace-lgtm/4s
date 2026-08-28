-- Shared village layout (2026-08-28) — "the village should be the same for
-- everyone: if Sylvia rearranges or decorates it, it shows like that on
-- shared and on Harry's village too."
--
-- Until now the village arrangement was personal (user_prefs.layout.
-- villageLayout). This moves it to one row per shared space, so both
-- partners read and write the same layout. Like household_*, a "village"
-- isn't a new membership concept — it's an existing shared_space.
--
-- Requires shared_spaces_and_item_sharing.sql (spaces + members),
-- fix_shared_spaces_recursion.sql and is_space_member_include_owner.sql
-- (the is_space_member SECURITY DEFINER helper the policy uses).

create table if not exists village_layout (
  space_id    uuid primary key references shared_spaces(id) on delete cascade,
  layout      jsonb not null default '{}'::jsonb,
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table village_layout enable row level security;

-- Anyone in the space (owner or accepted member) can read and write it.
-- is_space_member() is SECURITY DEFINER so this never recurses back through
-- shared_space_members' own policies.
drop policy if exists "village_layout_space" on village_layout;
create policy "village_layout_space" on village_layout
  for all
  using (space_id is not null and is_space_member(space_id, auth.uid()))
  with check (space_id is not null and is_space_member(space_id, auth.uid()));

-- So the realtime subscription in useSharedVillageLayout delivers changes.
alter publication supabase_realtime add table village_layout;
