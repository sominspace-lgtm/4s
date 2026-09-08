-- Care log (2026-09-08) — a chronological record of care given, instead of
-- pretending care is a chore. You don't "feed Somi" on a 3-day cadence,
-- you feed her twice a day and want to see that you did. Same for looking
-- after yourself: took meds, moved, rested.
--
-- Two subjects at launch: 'somi' lives in the household (space_id set, both
-- partners see it) and 'self' is personal (space_id null, only you).
-- `subject` is free text so a second pet slots in with no schema change.
-- `kind` is one of the presets in lib/utils/careTypes.ts, or free text for
-- a one-off. `detail` holds the "10mg" / "4.2kg" / "annual checkup" bit.
--
-- space_id nullability + the _own_or_space policy match household_chores
-- exactly (see household.sql). is_space_member() is SECURITY DEFINER, so
-- referencing it here does not recurse.

create table if not exists care_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  space_id   uuid references shared_spaces(id) on delete cascade,
  subject    text not null,
  kind       text not null,
  note       text,
  detail     text,
  logged_at  timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table care_logs enable row level security;

drop policy if exists "care_logs_own_or_space" on care_logs;
create policy "care_logs_own_or_space" on care_logs
  for all to authenticated
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists care_logs_subject_idx on care_logs (subject, logged_at desc);
create index if not exists care_logs_space_idx   on care_logs (space_id);
create index if not exists care_logs_user_idx    on care_logs (user_id);
