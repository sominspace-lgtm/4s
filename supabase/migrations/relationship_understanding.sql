-- "Understanding each other" (2026-08-22) -- how each of you shows care,
-- communicates, handles conflict, recharges, etc. Same shape as checkins.sql:
-- each person answers for themselves (one row per person/area/topic), both
-- partners can read the whole thing, but you can only ever write your own
-- answers -- the same boundary a physical form would have.
--
-- area/topic are free text on purpose (not an enum) -- the categories this
-- shipped with (Care, Boundaries, Communication, Emotions / Mood,
-- Energy / Focus, Support & Encouragement, Self-Care / Personal Needs) are a
-- starting set, not a fixed schema; a new area or topic is just a new row,
-- no migration needed. The unique constraint means re-answering the same
-- topic updates it in place rather than duplicating -- "the Discord bot will
-- better improve these answers over time" needs that to be an upsert, not
-- an ever-growing history.
-- Run once in the Supabase SQL Editor.

create table if not exists relationship_understanding (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid not null references shared_spaces(id) on delete cascade,
  area        text not null,
  topic       text not null,
  answer      text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (space_id, user_id, area, topic)
);

alter table relationship_understanding enable row level security;

drop policy if exists "understanding_select_own_or_space" on relationship_understanding;
create policy "understanding_select_own_or_space" on relationship_understanding
  for select
  using (user_id = auth.uid() or is_space_member(space_id, auth.uid()));

drop policy if exists "understanding_write_own" on relationship_understanding;
create policy "understanding_write_own" on relationship_understanding
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists relationship_understanding_space_idx on relationship_understanding(space_id, area);
