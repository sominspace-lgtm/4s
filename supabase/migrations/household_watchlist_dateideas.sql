-- household_watchlist + household_date_ideas (2026-08-10) — "4S is the main
-- hub for everything": watching/gaming backlog and date-night ideas now write
-- through from Discord into 4S, not just via the read-only companion/summary
-- proxy. Same own-or-space RLS shape as the rest of Household.
--
-- Requires household.sql, shared_spaces_and_item_sharing.sql,
-- fix_shared_spaces_recursion.sql, and household_discord.sql (space_id/token
-- linkage this data arrives through).

create table if not exists household_watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  domain      text not null check (domain in ('media', 'game')),
  title       text not null,
  subtype     text,
  status      text not null default 'watchlist'
                check (status in ('watchlist', 'watching', 'finished', 'dropped')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists household_date_ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  title       text not null,
  items       text[] not null default '{}',
  created_at  timestamptz not null default now()
);

alter table household_watchlist  enable row level security;
alter table household_date_ideas enable row level security;

drop policy if exists "watchlist_own_or_space" on household_watchlist;
create policy "watchlist_own_or_space" on household_watchlist
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

drop policy if exists "date_ideas_own_or_space" on household_date_ideas;
create policy "date_ideas_own_or_space" on household_date_ideas
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists household_watchlist_space_idx  on household_watchlist(space_id);
create index if not exists household_date_ideas_space_idx on household_date_ideas(space_id);
