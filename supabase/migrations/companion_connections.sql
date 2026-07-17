-- Per-couple Companion bot credentials. One row per confirmed
-- relationship_pairs — NOT a global env var — so if this app is ever used
-- by more than one couple, each pair's Discord bot URL/key stays scoped to
-- that pair and is never reachable by anyone else's session, no matter how
-- the API route is called.
--
-- Depends on relationship_pairs.sql — run that one first.
-- Run this once in the Supabase SQL editor. Additive only.

create table if not exists companion_connections (
  id          uuid primary key default gen_random_uuid(),
  pair_id     uuid not null references relationship_pairs(id) on delete cascade,
  api_url     text not null,
  api_key     text not null,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (pair_id)
);

alter table companion_connections enable row level security;

-- Visible/editable only to the two people in the CONFIRMED pair it belongs
-- to — a pending (unconfirmed) invite grants no access to anything.
drop policy if exists "connections_select_pair_members" on companion_connections;
create policy "connections_select_pair_members" on companion_connections
  for select using (
    exists (
      select 1 from relationship_pairs p
      where p.id = companion_connections.pair_id
        and p.status = 'confirmed'
        and (p.requester_id = auth.uid() or p.partner_id = auth.uid())
    )
  );

drop policy if exists "connections_insert_pair_members" on companion_connections;
create policy "connections_insert_pair_members" on companion_connections
  for insert with check (
    exists (
      select 1 from relationship_pairs p
      where p.id = companion_connections.pair_id
        and p.status = 'confirmed'
        and (p.requester_id = auth.uid() or p.partner_id = auth.uid())
    )
  );

drop policy if exists "connections_update_pair_members" on companion_connections;
create policy "connections_update_pair_members" on companion_connections
  for update using (
    exists (
      select 1 from relationship_pairs p
      where p.id = companion_connections.pair_id
        and p.status = 'confirmed'
        and (p.requester_id = auth.uid() or p.partner_id = auth.uid())
    )
  );

drop policy if exists "connections_delete_pair_members" on companion_connections;
create policy "connections_delete_pair_members" on companion_connections
  for delete using (
    exists (
      select 1 from relationship_pairs p
      where p.id = companion_connections.pair_id
        and p.status = 'confirmed'
        and (p.requester_id = auth.uid() or p.partner_id = auth.uid())
    )
  );
