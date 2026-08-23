-- Date Ideas, split out of the generic household_lists checklist
-- (2026-08-22) -- a date idea isn't just done/not-done, it's a real little
-- plan: what stage it's at, an optional linked pin (where), an optional
-- energy level (light/medium/deep, same vocabulary work_items already uses),
-- and free-form tags for your own sorting. Same shared "for all" access as
-- household_lists/chores/shopping -- either of you can add, edit, or
-- reorganize any idea, there's no personal-only concept here.
-- Run once in the Supabase SQL Editor.

create table if not exists date_ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,

  title       text not null,
  status      text not null default 'idea' check (status in ('idea', 'planned', 'done')),
  energy      text check (energy in ('light', 'medium', 'deep')),
  place_id    uuid references places(id) on delete set null,
  tags        text[] not null default '{}',
  notes       text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table date_ideas enable row level security;

drop policy if exists "date_ideas_own_or_space" on date_ideas;
create policy "date_ideas_own_or_space" on date_ideas
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists date_ideas_space_idx on date_ideas(space_id, status);
