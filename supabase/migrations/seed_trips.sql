-- Starter trips (2026-10-15): places we want to go, as "dreaming" trips on
-- the shared household space. Safe to run twice: a trip with the same title
-- is not added again.
insert into trips (user_id, space_id, title, destination, status, notes)
select u.id,
       (select m.space_id from shared_space_members m
         where m.member_id = u.id and m.status = 'accepted'
         order by m.created_at limit 1),
       t.title, t.destination, 'dreaming', t.notes
from auth.users u
cross join (values
  ('Japan',            'Tokyo, Kyoto, Osaka', 'Cherry blossoms in spring or leaves in fall. Tokyo, then the train to Kyoto and Osaka.'),
  ('Los Angeles',      'Los Angeles, CA',     'Beaches, tacos, a day in Malibu, the Getty.'),
  ('Kenya',            'Nairobi, Maasai Mara', 'Safari in the Maasai Mara, then the coast at Diani.'),
  ('Philippines',      'Manila, Palawan, Cebu', 'Manila, then the islands: El Nido, Coron, Cebu.'),
  ('South Korea',      'Seoul, Busan',         'Food markets, cafes, skincare shopping, Busan by the sea.'),
  ('Italy',            'Rome, Florence, Amalfi Coast', 'Pasta, gelato, Florence, a few slow days on the coast.')
) as t(title, destination, notes)
where u.email = 'sylviaso2001@gmail.com'
  and not exists (select 1 from trips x where x.user_id = u.id and x.title = t.title);
