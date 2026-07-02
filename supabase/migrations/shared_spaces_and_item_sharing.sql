-- Shared Spaces + generic item sharing for 4S.
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Nothing here touches existing tables or existing rows — additive only.

-- 1. Shared spaces (Family, Couple, Trip, Household, etc.)
create table if not exists shared_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- 2. Space membership (invite-by-email, same pattern as the existing `companions` table)
create table if not exists shared_space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references shared_spaces(id) on delete cascade,
  member_email text not null,
  member_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (space_id, member_email)
);

-- 3. Generic item sharing — one row per "I shared item X with person/space Y".
-- item_type/item_id point at existing rows (work_items, captures, wishlist_items,
-- buy_items, subscriptions, domain notes, council entries, etc.) without needing
-- a schema change on any of those tables.
create table if not exists shared_item_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null,               -- e.g. 'work_item', 'capture', 'wishlist_item'
  item_id uuid not null,
  shared_with_user_id uuid references auth.users(id) on delete cascade,
  space_id uuid references shared_spaces(id) on delete cascade,
  permission text not null default 'view' check (permission in ('view', 'edit')),
  created_at timestamptz not null default now(),
  constraint shared_item_target check (
    (shared_with_user_id is not null and space_id is null) or
    (shared_with_user_id is null and space_id is not null)
  )
);

-- Row Level Security — private by default.
alter table shared_spaces enable row level security;
alter table shared_space_members enable row level security;
alter table shared_item_links enable row level security;

-- Spaces: visible to the owner and to accepted members.
create policy "spaces_select_owner_or_member" on shared_spaces
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1 from shared_space_members m
      where m.space_id = shared_spaces.id
        and m.status = 'accepted'
        and m.member_id = auth.uid()
    )
  );
create policy "spaces_insert_owner" on shared_spaces
  for insert with check (owner_id = auth.uid());
create policy "spaces_update_owner" on shared_spaces
  for update using (owner_id = auth.uid());
create policy "spaces_delete_owner" on shared_spaces
  for delete using (owner_id = auth.uid());

-- Membership: owner of the space, or the invited person (to see/accept their own invite).
create policy "members_select" on shared_space_members
  for select using (
    invited_by = auth.uid()
    or member_id = auth.uid()
    or exists (select 1 from shared_spaces s where s.id = space_id and s.owner_id = auth.uid())
  );
create policy "members_insert_owner" on shared_space_members
  for insert with check (
    exists (select 1 from shared_spaces s where s.id = space_id and s.owner_id = auth.uid())
  );
create policy "members_update_self_or_owner" on shared_space_members
  for update using (
    member_id = auth.uid()
    or exists (select 1 from shared_spaces s where s.id = space_id and s.owner_id = auth.uid())
  );
create policy "members_delete_owner" on shared_space_members
  for delete using (
    exists (select 1 from shared_spaces s where s.id = space_id and s.owner_id = auth.uid())
  );

-- Item links: visible to the owner, the direct recipient, or accepted members of the target space.
create policy "item_links_select" on shared_item_links
  for select using (
    owner_id = auth.uid()
    or shared_with_user_id = auth.uid()
    or exists (
      select 1 from shared_space_members m
      where m.space_id = shared_item_links.space_id
        and m.status = 'accepted'
        and m.member_id = auth.uid()
    )
  );
create policy "item_links_insert_owner" on shared_item_links
  for insert with check (owner_id = auth.uid());
create policy "item_links_delete_owner" on shared_item_links
  for delete using (owner_id = auth.uid());

create index if not exists idx_shared_item_links_owner on shared_item_links(owner_id);
create index if not exists idx_shared_item_links_item on shared_item_links(item_type, item_id);
create index if not exists idx_shared_space_members_space on shared_space_members(space_id);

-- 4. Let recipients actually read the shared row's content.
-- This ADDS a policy (Postgres RLS is OR-of-policies) — it does not remove or
-- replace your existing owner-only policy on work_items, so private tasks stay
-- private. It only grants SELECT on rows a shared_item_links row points at.
-- Scoped to work_items (tasks) for now — the same pattern (swap the table name
-- and item_type value) extends to captures/wishlist_items/buy_items/subscriptions
-- when you're ready to wire those up in the app.
create policy "work_items_select_if_shared" on work_items
  for select using (
    exists (
      select 1 from shared_item_links l
      where l.item_type = 'work_item'
        and l.item_id = work_items.id
        and (
          l.shared_with_user_id = auth.uid()
          or exists (
            select 1 from shared_space_members m
            where m.space_id = l.space_id
              and m.status = 'accepted'
              and m.member_id = auth.uid()
          )
        )
    )
  );
