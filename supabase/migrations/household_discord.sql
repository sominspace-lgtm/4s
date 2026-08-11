-- Discord ↔ 4S household link (2026-08-10) — backfilled into the repo
-- 2026-08-11 (see household_rules_inventory.sql for why).
--
-- Mirrors the Alexa code-linking flow: 4S issues a short code, each person
-- redeems it once from Discord with /connect.
--
-- Keyed on shared_spaces (a household), NOT relationship_pairs (a couple) —
-- companion_connections uses pairs, and reusing that here would bind
-- household data to the wrong membership concept.
--
-- One row per (guild, discord user) so writes are attributed to the person
-- who actually typed the command, rather than all landing on whoever set the
-- integration up. Only the space OWNER can issue a code or disconnect.

create table if not exists household_link_codes (
  code        text primary key,
  space_id    uuid not null references shared_spaces(id) on delete cascade,
  created_by  uuid not null references auth.users(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create table if not exists household_discord_links (
  id               uuid primary key default gen_random_uuid(),
  space_id         uuid not null references shared_spaces(id) on delete cascade,
  guild_id         text not null,
  discord_user_id  text not null,
  user_id          uuid not null references auth.users(id) on delete cascade,
  -- sha256 of the bearer token, never the token itself: a leaked database
  -- dump must not hand someone write access to the household.
  token_hash       text not null,
  notify           jsonb not null default '{"reminders":true,"tasks":true,"maintenance":true,"shopping":false}'::jsonb,
  created_at       timestamptz not null default now(),
  last_used_at     timestamptz,
  unique (guild_id, discord_user_id)
);

alter table household_link_codes    enable row level security;
alter table household_discord_links enable row level security;

drop policy if exists "link_codes_owner" on household_link_codes;
create policy "link_codes_owner" on household_link_codes
  for all
  using (exists (select 1 from shared_spaces s where s.id = space_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from shared_spaces s where s.id = space_id and s.owner_id = auth.uid()));

drop policy if exists "discord_links_read" on household_discord_links;
create policy "discord_links_read" on household_discord_links
  for select using (is_space_member(space_id, auth.uid()));

drop policy if exists "discord_links_owner_write" on household_discord_links;
create policy "discord_links_owner_write" on household_discord_links
  for all
  using (exists (select 1 from shared_spaces s where s.id = space_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from shared_spaces s where s.id = space_id and s.owner_id = auth.uid()));

create index if not exists household_discord_links_space_idx on household_discord_links(space_id);
