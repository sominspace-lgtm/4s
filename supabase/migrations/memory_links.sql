-- Memories — multiple named links, not one (user request, 2026-08-13).
-- shared_spaces.memories_url only ever held a single link; couples often
-- have more than one photo source (Google Photos, iCloud, a shared Drive
-- folder) and had no way to keep more than one. Each row renders as its own
-- tile in Household → Setup. Space-only (no personal variant) — memories
-- are inherently a shared-space concept the same way the old single-link
-- field already was.

create table if not exists memory_links (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references shared_spaces(id) on delete cascade,
  label       text not null,
  url         text not null,
  created_at  timestamptz not null default now()
);

alter table memory_links enable row level security;

drop policy if exists "memory_links_space_member" on memory_links;
create policy "memory_links_space_member" on memory_links
  for all
  using (is_space_member(space_id, auth.uid()))
  with check (is_space_member(space_id, auth.uid()));

create index if not exists memory_links_space_idx on memory_links(space_id);

-- Backfill: carry forward the one existing link per space so nothing is lost.
-- shared_spaces.memories_url itself is left in place, just no longer read.
insert into memory_links (space_id, label, url)
select id, 'Memories', memories_url from shared_spaces
where memories_url is not null and memories_url != '';
