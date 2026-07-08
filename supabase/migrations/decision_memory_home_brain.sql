-- Phase 2 finish: Decision Memory + Home Brain.
-- Owner-scoped, private by default (RLS). Run in the Supabase SQL Editor.

create table if not exists decisions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  options     text,
  reason      text,
  expected    text,
  outcome     text,
  created_at  timestamptz not null default now()
);

alter table decisions enable row level security;
drop policy if exists "decisions_owner_all" on decisions;
create policy "decisions_owner_all" on decisions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists decisions_user_idx on decisions(user_id);

create table if not exists home_facts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null,
  value       text not null,
  category    text,
  created_at  timestamptz not null default now()
);

alter table home_facts enable row level security;
drop policy if exists "home_facts_owner_all" on home_facts;
create policy "home_facts_owner_all" on home_facts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists home_facts_user_idx on home_facts(user_id);
