-- Village idle game (2026-11-05): the donuts and place levels, one row per
-- shared space so Sylvia and Harry play the same village. Same shape and
-- policy as village_layout.sql.

create table if not exists village_idle (
  space_id    uuid primary key references shared_spaces(id) on delete cascade,
  state       jsonb not null default '{}'::jsonb,
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table village_idle enable row level security;

drop policy if exists "village_idle_space" on village_idle;
create policy "village_idle_space" on village_idle
  for all
  using (space_id is not null and is_space_member(space_id, auth.uid()))
  with check (space_id is not null and is_space_member(space_id, auth.uid()));

alter publication supabase_realtime add table village_idle;
