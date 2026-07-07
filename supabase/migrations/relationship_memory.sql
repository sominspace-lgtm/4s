-- Relationship Memory — private per-user notes about the people who matter:
-- relationship, birthday, last contact, things to remember, gift ideas.
-- Run once in the Supabase SQL Editor. Private by default (RLS: owner only).

create table if not exists people (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  relationship  text,
  birthday      date,
  last_contact  date,
  notes         text,
  gift_ideas    text,
  created_at    timestamptz not null default now()
);

alter table people enable row level security;

drop policy if exists "people_owner_all" on people;
create policy "people_owner_all" on people
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists people_user_idx on people(user_id);
