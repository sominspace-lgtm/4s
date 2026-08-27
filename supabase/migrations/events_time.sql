-- Optional time-of-day for events (2026-08-27) — Calendar week/day views,
-- inspired by Google Calendar, need something to lay out on an hourly grid.
-- events.sql originally left this out on purpose ("nothing in the UI
-- renders one"); that's no longer true once week/day views exist.
--
-- Nullable, not required: an event without a time still works exactly like
-- today (renders as an all-day item, same as every other agenda entry —
-- tasks/renewals/refills/gifts never had a time and still won't). No
-- duration/end-time field either — this app has never modeled that
-- anywhere, and guessing a fake default duration would be worse than a
-- single clean start-time marker.
--
-- Run this in the Supabase SQL editor (see events.sql's own header for why
-- this repo doesn't auto-apply migrations).

alter table events add column if not exists event_time time;
