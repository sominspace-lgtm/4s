-- Contacts (2026-08-07): one record per person, instead of the same human
-- being written down in two unrelated places.
--
-- Before this, a birthday could live in EITHER:
--   people                      (Personal > People > Notes — a real table)
--   user_prefs.layout.giftEvents (Personal > Money > Gifts — a JSON blob)
-- Same person, same birthday, two stores, two UIs, neither aware of the
-- other. Add your sister to Gifts and she's invisible in Notes, and vice
-- versa. `people` wins because it's a real table with real RLS; giftEvents
-- was only ever JSON-in-a-column because it predated the table.
--
-- The one thing giftEvents had that people didn't is a budget, so that
-- column comes across. `recurring` does not: a birthday recurs by
-- definition, and the only non-recurring "gift events" are one-off
-- occasions, which are better expressed as a dated task than as a person.

alter table people add column if not exists gift_budget numeric;

-- One-time backfill. Dedupes case-insensitively on name so anyone already
-- in both places doesn't end up duplicated by the migration meant to fix
-- duplication. Safe to run more than once: the not-exists guard makes a
-- second run a no-op.
insert into people (user_id, name, relationship, birthday, gift_ideas, gift_budget)
select
  up.user_id,
  ge->>'name',
  nullif(ge->>'relation', ''),
  -- Stored as YYYY-MM-DD; a bad value shouldn't abort the whole migration.
  case when ge->>'date' ~ '^\d{4}-\d{2}-\d{2}$' then (ge->>'date')::date end,
  nullif(ge->>'giftIdea', ''),
  case when ge->>'budget' ~ '^\d+(\.\d+)?$' then (ge->>'budget')::numeric end
from user_prefs up
cross join lateral jsonb_array_elements(up.layout->'giftEvents') ge
where jsonb_typeof(up.layout->'giftEvents') = 'array'
  and coalesce(ge->>'name', '') <> ''
  and not exists (
    select 1 from people p
    where p.user_id = up.user_id
      and lower(p.name) = lower(ge->>'name')
  );

-- The giftEvents key is deliberately LEFT in user_prefs.layout. The backfill
-- above is the only thing that reads it, the app no longer does, and leaving
-- it costs nothing while giving you an untouched copy of the original data
-- if any of this needs checking. Drop it yourself later if you want:
--   update user_prefs set layout = layout - 'giftEvents';
