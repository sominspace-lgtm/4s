-- Gentle streaks for routines (2026-10-19): the days each routine was
-- finished, newest first, as yyyy-MM-dd strings. Until this runs, routines
-- work as before, just without a streak.
alter table household_routines add column if not exists done_days jsonb not null default '[]'::jsonb;
