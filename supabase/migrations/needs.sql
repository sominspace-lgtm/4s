-- "What do you need right now" — a private after-a-hard-day log (user
-- request, 2026-08-13). Deliberately its own table, not folded into
-- `preferences`: a need isn't a taste or a decision, and privacy-on-creation
-- is the whole point here in a way it isn't for preferences.
--
-- Own-or-space RLS shape like everywhere else, but `space_id` is NEVER set
-- at creation — every insert path (4S OS directly, or the bot's bespoke
-- /api/household/needs route) writes space_id = null, private to the
-- author. The only way a row becomes visible to a partner is an explicit
-- later `update` setting space_id — a real "share this" action, not a
-- default. This is why needs can't ride the generic RESOURCES bot pathway:
-- that always stamps the caller's household space_id on insert, which would
-- make every need shared by default — the opposite of the point.

create table if not exists needs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  text        text not null,
  created_at  timestamptz not null default now()
);

alter table needs enable row level security;

drop policy if exists "needs_own_or_space" on needs;
create policy "needs_own_or_space" on needs
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists needs_space_idx on needs(space_id);
