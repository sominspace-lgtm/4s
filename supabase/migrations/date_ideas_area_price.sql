-- Areas/special-days grouping + price range for Date Ideas (2026-08-22) --
-- same "collapsible groups" shape Watchlist already uses for games/shows,
-- just grouped by a free-text `area` here instead of a fixed domain ("Special
-- Days", "Monterey Day", "Big Sur Day", whatever you want) since date-idea
-- groupings are inherently open-ended, not a fixed enum like game/media.
-- Run once in the Supabase SQL Editor.

alter table date_ideas add column if not exists area text;
alter table date_ideas add column if not exists price_range text
  check (price_range in ('$', '$$', '$$$', '$$$$'));

create index if not exists date_ideas_area_idx on date_ideas(space_id, area);
