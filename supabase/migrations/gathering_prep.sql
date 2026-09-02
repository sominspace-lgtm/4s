-- Hosting as a mode (2026-09-01, Village batch B).
--   phase — 'prep' while the hosts are getting ready (wall shows a prep
--     checklist, the scene stays calm), 'live' once the doors are open
--     (welcome QR, the scene warms up). Existing rows default to 'live' so
--     nothing changes for gatherings already running.
--   starts_at — optional planned start time.
--   prep — the getting-ready checklist: [{ id, text, done }].

alter table gatherings add column if not exists phase text not null default 'live'
  check (phase in ('prep', 'live'));
alter table gatherings add column if not exists starts_at timestamptz;
alter table gatherings add column if not exists prep jsonb not null default '[]'::jsonb;
