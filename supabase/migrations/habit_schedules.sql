-- Custom habit schedules — extends the existing habits table.
-- Run once in the Supabase SQL editor. Purely additive: every column has a
-- default, and the default ('daily') matches how every existing habit
-- already behaves, so no existing habit changes behavior after this runs.

alter table habits add column if not exists schedule_type text not null default 'daily'
  check (schedule_type in ('daily', 'interval', 'weekly'));

-- Used when schedule_type = 'interval' — e.g. 2 = every other day, 3 = every
-- 3 days, 14 = every 2 weeks. Due-ness is computed from days since the last
-- completion (like Buy Again's cadence_days/last_bought), not a fixed
-- anchor date, so no extra "start date" column is needed.
alter table habits add column if not exists interval_days integer;

-- Used when schedule_type = 'weekly' — 0=Sunday..6=Saturday. A single day
-- covers "once a week"; several days covers "Mon/Wed/Fri".
alter table habits add column if not exists days_of_week integer[];

alter table habits add column if not exists paused boolean not null default false;
