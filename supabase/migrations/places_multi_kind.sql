-- A pin can carry more than one category now (2026-08-25) — e.g. a place
-- that's both a gym and a cafe. `kind` stays as-is (single text column,
-- still the "primary" category every existing consumer — the map pin icon/
-- color, PinFilters, PlaceKindFields — reads unchanged), and `kinds` is the
-- new source of truth for the multi-select add/edit UI. Backfilled from the
-- existing single kind so nothing looks uncategorized on upgrade.
alter table places add column if not exists kinds text[] not null default '{}';

update places set kinds = array[kind] where kinds = '{}' and kind is not null;
