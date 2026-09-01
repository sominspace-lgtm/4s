-- Per-kind dedup for server-sent pushes (2026-09-01). `push_notify_state`
-- had one `last_waiting_notice_on date` for the single overdue-tasks nudge.
-- The daily cron now sends a few kinds (overdue tasks, a subscription
-- renewing, the Sunday check-in nudge), each needing its own "already sent"
-- marker — a jsonb map keyed by a per-kind string ("overdue:2026-09-01",
-- "sub:<id>:<date>", "checkin:2026-09-01") is simpler than a column per kind.
--
-- Run once in the Supabase SQL Editor. Additive.

alter table push_notify_state add column if not exists last_sent jsonb not null default '{}'::jsonb;
