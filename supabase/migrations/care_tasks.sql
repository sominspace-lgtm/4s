-- Care tasks you can edit (2026-10-16). The buttons on a care log (Somi's
-- care, the house, your own) used to be a fixed list in the code. Now each
-- one can be renamed, reordered, hidden, or given an "every N days" rhythm so
-- it shows as due like a chore. A built-in task with no row here still shows
-- with its default name; the first edit writes its row. Logging still goes to
-- care_logs, matched by `kind`.
--
-- Same space_id rule as care_logs: 'somi' and 'home' sit on the shared space
-- so both partners see the same list, 'self' is personal (space_id null).

create table if not exists care_tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  subject     text not null,
  kind        text not null,
  label       text not null,
  detail      text,
  every_days  integer check (every_days is null or every_days > 0),
  position    integer not null default 0,
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table care_tasks enable row level security;

drop policy if exists "care_tasks_own_or_space" on care_tasks;
create policy "care_tasks_own_or_space" on care_tasks
  for all to authenticated
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists care_tasks_subject_idx on care_tasks (subject, position);
create index if not exists care_tasks_space_idx   on care_tasks (space_id);
