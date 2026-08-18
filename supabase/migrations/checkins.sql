-- Weekly relationship check-ins, captured in Discord by the companion bot,
-- made visible in 4S OS. The bot only ever writes its OWN answering partner's
-- row (own-or-space read lets both partners see each other's), one row per
-- (space, person, week) — the unique constraint is what makes re-answering
-- the same week's questions an update rather than a duplicate.
-- Run once in the Supabase SQL Editor.

create table if not exists checkins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  space_id      uuid not null references shared_spaces(id) on delete cascade,
  week_of       date not null,
  -- [{questionKey, questionText, answer}], client-owned shape — same reasoning
  -- as household_lists.items: no schema per question, so the bot's question
  -- bank can change without a migration on this side.
  answers       jsonb not null default '[]',
  completed_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (space_id, user_id, week_of)
);

alter table checkins enable row level security;

-- Read: own-or-space, same as every other household table — a check-in is
-- meant to be read by both partners, that's the point of it.
drop policy if exists "checkins_select_own_or_space" on checkins;
create policy "checkins_select_own_or_space" on checkins
  for select
  using (user_id = auth.uid() or is_space_member(space_id, auth.uid()));

-- Write: yourself only. You can see your partner's answers, but you can't
-- edit them — the same boundary a physical form would have.
drop policy if exists "checkins_write_own" on checkins;
create policy "checkins_write_own" on checkins
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists checkins_space_week_idx on checkins(space_id, week_of desc);
