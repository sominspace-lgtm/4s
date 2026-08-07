-- Native calendar events (2026-08-07) — Calendar Phase A. Standalone dated
-- items that aren't a task, renewal, refill, or gift (a doctor's
-- appointment, a birthday party, anything with just a date and a title).
-- Date-only, matching how every other agenda entry in the app already
-- works (due_date, renewal_date, etc.) — no time-of-day field, since
-- nothing in the UI renders one and adding it here alone would be
-- inconsistent with the rest of the calendar.

create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  event_date  date not null,
  notes       text,
  created_at  timestamptz not null default now()
);

alter table events enable row level security;

drop policy if exists "events_owner_all" on events;
create policy "events_owner_all" on events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists events_user_idx on events(user_id);
create index if not exists events_date_idx on events(event_date);
