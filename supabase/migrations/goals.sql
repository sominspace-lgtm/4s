-- Goals as COMMITMENTS (2026-08-11), not progress trackers.
--
-- The deliberate omission here is a percentage. There is no `progress` column,
-- no target count, no completion ratio — because a progress bar answers "how
-- far along am I", and the question that actually keeps a goal alive is "am I
-- still choosing this?". A goal you haven't touched in a month doesn't need a
-- number telling you it's 20% done; it needs to be asked about.
--
-- Hence `last_touched_at`: the one signal the product acts on. Stale goals
-- surface a question, never a guilt-trip, and retiring one is a legitimate
-- outcome (status 'retired', with an optional reason) rather than a failure
-- state. `achieved` and `retired` are both endings; neither is worth more.
--
-- space_id nullable, same as every other household table: null = personal,
-- set = shared with that space. A couple sharing a goal ("get the flat sorted
-- by spring") is the point, but it must not be forced.
--
-- Requires shared_spaces_and_item_sharing.sql + fix_shared_spaces_recursion.sql.

create table if not exists goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  space_id      uuid references shared_spaces(id) on delete cascade,
  title         text not null,
  -- Why this matters. Optional, but it's the field that makes a goal
  -- reconsiderable later — without it, a stale goal is just a stale string.
  why           text,
  -- The single next concrete step. One, not a list: a goal with a backlog
  -- attached is a project, and projects belong in Tasks.
  next_action   text,
  status        text not null default 'active' check (status in ('active', 'retired', 'achieved')),
  -- Bumped whenever someone edits the goal or sets a new next action. Drives
  -- the "still choosing this?" nudge; never shown as a streak.
  last_touched_at timestamptz not null default now(),
  ended_at      timestamptz,
  ended_reason  text,
  created_at    timestamptz not null default now()
);

alter table goals enable row level security;

drop policy if exists "goals_own_or_space" on goals;
create policy "goals_own_or_space" on goals
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists goals_space_idx  on goals(space_id);
create index if not exists goals_status_idx on goals(status);
create index if not exists goals_touched_idx on goals(last_touched_at);
