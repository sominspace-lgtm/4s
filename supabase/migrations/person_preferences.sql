-- Person preferences — tagged likes/dislikes/preferences about a specific
-- person (partner, friend, family), distinct from the single freeform
-- `people.notes` blob. Mirrors the personal preferences table's category
-- shape (see preferences.sql) but scoped to one contact instead of one
-- space. Private by default: ownership follows the parent person row, so
-- these are exactly as visible as the person card is.
-- Run once in the Supabase SQL Editor.

create table if not exists person_preferences (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references people(id) on delete cascade,
  category    text not null check (category in ('preference', 'like', 'dislike', 'idea', 'general')),
  text        text not null,
  created_at  timestamptz not null default now()
);

alter table person_preferences enable row level security;

drop policy if exists "person_preferences_owner_all" on person_preferences;
create policy "person_preferences_owner_all" on person_preferences
  for all
  using (exists (select 1 from people p where p.id = person_id and p.user_id = auth.uid()))
  with check (exists (select 1 from people p where p.id = person_id and p.user_id = auth.uid()));

create index if not exists person_preferences_person_idx on person_preferences(person_id);
