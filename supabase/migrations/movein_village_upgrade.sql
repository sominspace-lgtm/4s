-- Village + Move-In upgrade (2026-08-24). Three small additive changes;
-- everything else in this pass reuses tables that already exist
-- (household_movein_items, places, date_ideas, household_meals).
-- Run once in the Supabase SQL Editor.

-- 1. "Eating out" as a real meal option, not a fake recipe title.
-- `kind` defaults to 'cooking' so every existing row keeps its exact current
-- meaning with no backfill. place_id optionally links the night out to a real
-- pin — the restaurant is already in `places`, so this points at it rather
-- than storing its name a second time.
alter table household_meals add column if not exists kind text not null default 'cooking';
do $$ begin
  alter table household_meals add constraint household_meals_kind_check
    check (kind in ('cooking', 'eating_out'));
exception when duplicate_object then null; end $$;
alter table household_meals add column if not exists place_id uuid references places(id) on delete set null;

-- 2. Indoor/outdoor on a date idea — the one field from the spec's wishlist
-- date_ideas didn't already cover (name/location/description/category/cost/
-- status all exist as title/place_id/notes/area+tags/price_range/status).
alter table date_ideas add column if not exists indoor_outdoor text;
do $$ begin
  alter table date_ideas add constraint date_ideas_indoor_outdoor_check
    check (indoor_outdoor in ('indoor', 'outdoor', 'either'));
exception when duplicate_object then null; end $$;

-- 3. Nothing for "Nearby": it is places.tags @> ['nearby'] grouped by the
-- kind each place already has (trail -> Walking Paths, park -> Parks,
-- shop -> Stores) plus a 'hidden-gem' tag. A place has one kind but many
-- tags, so tagging is what lets a cafe be both "a cafe" and "a hidden gem
-- near home" without a second row. This index makes that filter cheap.
create index if not exists places_tags_idx on places using gin (tags);
