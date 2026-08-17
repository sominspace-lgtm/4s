-- Personal preferences (user request, 2026-08-13) — structured like/dislike/
-- decision capture, distinct from freeform notes and from household_rules
-- (a rule is a standing behavioral convention; a preference is a taste or a
-- past decision, nobody's expected to "follow" it). Personal-first: primary
-- UI lives under Personal, not Household — 4S is a personal OS before it's
-- a couple's tool, and a preference doesn't need a shared space to exist.
-- space_id stays nullable so one CAN be shared to a household later, same
-- own-or-space shape every other table here already uses.
--
-- Category shape mirrors the companion bot's own local HouseholdMemoryCategory
-- (src/household/types.ts) minus 'rule' — that already has its own table.

create table if not exists preferences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  category    text not null default 'general'
                check (category in ('preference', 'like', 'dislike', 'decision', 'general')),
  text        text not null,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table preferences enable row level security;

drop policy if exists "preferences_own_or_space" on preferences;
create policy "preferences_own_or_space" on preferences
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists preferences_space_idx    on preferences(space_id);
create index if not exists preferences_category_idx on preferences(category);
