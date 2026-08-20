-- Presence (2026-08-20) — "is my partner using the app right now", for the
-- Household tab. A separate table rather than a column on user_prefs on
-- purpose: user_prefs' RLS is (correctly) owner-only, and presence is the
-- one piece of otherwise-private account state a partner genuinely needs to
-- read. Same reasoning as checkins/needs/shared_routine_items this session —
-- a narrow, purpose-built table beats widening an existing one's RLS to fit
-- a case it wasn't designed for.
-- Run once in the Supabase SQL Editor.

create table if not exists presence (
  user_id       uuid not null references auth.users(id) on delete cascade,
  space_id      uuid not null references shared_spaces(id) on delete cascade,
  last_active_at timestamptz not null default now(),
  primary key (user_id, space_id)
);

alter table presence enable row level security;

drop policy if exists "presence_read_space" on presence;
create policy "presence_read_space" on presence
  for select
  using (user_id = auth.uid() or is_space_member(space_id, auth.uid()));

drop policy if exists "presence_write_own" on presence;
create policy "presence_write_own" on presence
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
