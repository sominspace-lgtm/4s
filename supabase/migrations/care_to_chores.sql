-- Somi's care and the house's upkeep become chores (2026-10-19). The care
-- log's history is kept: for each thing you logged, a chore is made with the
-- day you last did it as its "last done", so due dates are right from the
-- start. Then Somi's usual chores that were never logged are added too, with
-- no "last done" yet (they show as due). Safe to run twice: a chore with the
-- same name in the same household is never added again. care_logs is left
-- untouched.

with latest as (
  select distinct on (space_id, subject, kind)
         space_id, subject, kind, user_id,
         (logged_at at time zone 'America/Los_Angeles')::date as day
  from care_logs
  where subject in ('somi', 'home') and space_id is not null
  order by space_id, subject, kind, logged_at desc
),
named(subject, kind, name, every_days) as (values
  ('somi', 'litter',       'Clean Somi''s litter',           1),
  ('somi', 'fed',          'Fresh water and food bowls',      1),
  ('somi', 'litter_deep',  'Deep-clean Somi''s litter box',  14),
  ('somi', 'nails',        'Trim Somi''s nails',             14),
  ('somi', 'flea_tick',    'Flea and tick treatment',        30),
  ('somi', 'bathe',        'Bathe Somi',                     60),
  ('somi', 'vet',          'Vet checkup',                   365),
  ('home', 'plants',       'Water the plants',                3),
  ('home', 'filters',      'Change the HVAC filter',         90),
  ('home', 'water_filter', 'Replace the water filter',       60),
  ('home', 'smoke',        'Test the smoke detectors',      180),
  ('home', 'gutters',      'Clean the gutters',             180),
  ('home', 'pest',         'Pest control',                   90),
  ('home', 'deep_clean',   'Deep clean',                     30),
  ('home', 'car',          'Car care',                       90)
)
insert into household_chores (user_id, space_id, name, cadence_days, folder, last_done_at, last_done_by)
select l.user_id, l.space_id,
       coalesce(n.name, initcap(replace(l.kind, '_', ' '))),
       coalesce(n.every_days, 7),
       case l.subject when 'somi' then 'Somi' else 'House' end,
       l.day, l.user_id
from latest l
left join named n on n.subject = l.subject and n.kind = l.kind
-- Repairs and appliance fixes were one-offs, not a rhythm.
where l.kind not in ('repair', 'appliance')
  and not exists (
    select 1 from household_chores c
    where c.space_id = l.space_id and lower(c.name) = lower(coalesce(n.name, initcap(replace(l.kind, '_', ' '))))
  );

-- Somi's usual chores that were never logged, for every household that has her.
insert into household_chores (user_id, space_id, name, cadence_days, folder)
select s.owner_id, s.id, t.name, t.every_days, 'Somi'
from shared_spaces s
cross join (values
  ('Clean Somi''s litter', 1), ('Fresh water and food bowls', 1), ('Brush Somi', 7),
  ('Deep-clean Somi''s litter box', 14), ('Trim Somi''s nails', 14),
  ('Flea and tick treatment', 30), ('Bathe Somi', 60), ('Vet checkup', 365)
) as t(name, every_days)
where exists (select 1 from care_logs l where l.space_id = s.id and l.subject = 'somi')
  and not exists (select 1 from household_chores c where c.space_id = s.id and lower(c.name) = lower(t.name));
