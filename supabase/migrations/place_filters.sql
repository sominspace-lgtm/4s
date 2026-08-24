-- Custom pin filters (2026-08-24) -- "Near Our Home" and anything like it:
-- a saved, named radius around an existing pin (its center), so the map and
-- pin list can be switched to show only what's nearby. Centered on an
-- existing pin rather than a typed address so no new geocoding path is
-- needed -- the center pin's own lat/lng (already geocoded, same as every
-- other pin) is the source of truth. Shared "for all" access, same as
-- date_ideas/household_lists -- either of you can add or remove a filter.
-- Run once in the Supabase SQL Editor.

create table if not exists place_filters (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  space_id         uuid references shared_spaces(id) on delete cascade,

  label            text not null,
  center_place_id  uuid not null references places(id) on delete cascade,
  radius_km        double precision not null default 3 check (radius_km > 0),

  created_at       timestamptz not null default now()
);

alter table place_filters enable row level security;

drop policy if exists "place_filters_own_or_space" on place_filters;
create policy "place_filters_own_or_space" on place_filters
  for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

create index if not exists place_filters_space_idx on place_filters(space_id);
