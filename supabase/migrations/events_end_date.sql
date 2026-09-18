-- Multi-day events (2026-09-17) — a trip or a visitor spans several days,
-- not one. Nullable, not required: an event with no end_date still works
-- exactly like today, rendering on just its event_date. When set, the
-- calendar views show the event on every day from event_date through
-- end_date inclusive (see entryOccursOn in lib/hooks/useAgendaEntries.ts).
--
-- Run this in the Supabase SQL editor (see events.sql's own header for why
-- this repo doesn't auto-apply migrations).

alter table events add column if not exists end_date date;
