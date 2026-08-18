-- Generic shared lists (user request, 2026-08-13) — additive, not a
-- migration of shopping/movein_items/watchlist/date_ideas, which stay
-- exactly as they are: each already works, and moving live data into a
-- generic shape for zero new capability is the wrong trade. This exists so
-- a *new* ad-hoc list ("things to research", "gift ideas for Mom") doesn't
-- need its own bespoke table + RLS + RESOURCES entry + hook + UI block
-- every time going forward.
--
-- items is jsonb, same shape household_routines already uses:
-- [{"id": uuid, "label": text, "done": bool}] — client-owned, not schema-
-- enforced, so the whole row round-trips through the generic
-- /api/household/[resource] routes with no bespoke nested-resource route.

create table if not exists household_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete cascade,
  name        text not null,
  items       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

alter table household_lists enable row level security;

drop policy if exists "lists_own_or_space" on household_lists;
create policy "lists_own_or_space" on household_lists
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists household_lists_space_idx on household_lists(space_id);
