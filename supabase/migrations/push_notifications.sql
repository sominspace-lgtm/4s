-- Real push notifications (2026-08-20) — the actual gap every proactive
-- feature this session (birthdays, check-ins, weekly recap, quiet hours) has
-- been routing around via Discord instead of fixing directly: 4S itself had
-- no way to reach you when the tab wasn't open. public/sw.js only ever did
-- offline app-shell caching.
--
-- One person can have several subscriptions (phone, laptop) — that's why
-- this is its own table keyed by endpoint, not a column on user_prefs.
-- Run once in the Supabase SQL Editor.

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_own" on push_subscriptions;
create policy "push_subscriptions_own" on push_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Dedupe state for server-sent notifications — same "claim once, not once
-- per poll" shape as the companion bot's household_notify_state. Only the
-- service-role key (the cron route) ever touches this.
create table if not exists push_notify_state (
  user_id                   uuid primary key references auth.users(id) on delete cascade,
  last_waiting_notice_on    date
);

alter table push_notify_state enable row level security;

drop policy if exists "push_notify_state_service_only" on push_notify_state;
create policy "push_notify_state_service_only" on push_notify_state
  for all using (false) with check (false);
