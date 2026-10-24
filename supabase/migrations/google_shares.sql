-- Sharing your own Google Calendar (2026-10-24). Each person decides:
-- share it with the other person, show it on the shared screen, and whether
-- they see the details or just "Busy". Off until you turn it on. Read and
-- written only by the server (RLS on, no policies), same as the tokens.
-- Safe to run twice.

create table if not exists google_shares (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  calendar_partner   boolean not null default false,
  calendar_household boolean not null default false,
  details            boolean not null default true,
  updated_at         timestamptz not null default now()
);

alter table google_shares enable row level security;
-- Deliberately no policies on this table.
