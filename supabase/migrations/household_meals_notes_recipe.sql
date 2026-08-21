-- Meals become clickable (2026-08-21): "This week's meals" showed a title
-- and who's cooking, with nowhere to put the actual recipe. These two
-- columns are what the new meal detail sheet reads and writes. Run in the
-- Supabase SQL Editor.

alter table household_meals add column if not exists notes text;
alter table household_meals add column if not exists recipe_url text;
