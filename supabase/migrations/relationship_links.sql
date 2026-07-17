-- Relationship tab: a link library for external things tied to your
-- relationship(s) — a shared Google Photos album, a Discord bot invite,
-- anything else worth keeping one tap away. Owner-scoped, private by
-- default (RLS). Run in the Supabase SQL Editor.
--
-- Replaces the Decisions tab in Life (components/life/LifeHub.tsx). The old
-- `decisions` table and its data are left in place, untouched — nothing was
-- dropped, the tab was just removed from the UI.

create table if not exists relationship_links (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null,
  url         text not null,
  note        text,
  created_at  timestamptz not null default now()
);

alter table relationship_links enable row level security;
drop policy if exists "relationship_links_owner_all" on relationship_links;
create policy "relationship_links_owner_all" on relationship_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists relationship_links_user_idx on relationship_links(user_id);
