-- Places status redesign + Discord reaction wiring (user request, 2026-08-13).
--
-- Status collapses from four states (idea/been/favourite/archived) to three
-- meaningful ones: 'idea' (want to go — unchanged), 'good' (been, would go
-- again), 'bad' (been, wouldn't go again). 'archived' stays as the soft-hide
-- state for removed pins. There's no reliable signal to split existing
-- 'been'/'favourite' rows between good/bad, so both collapse to 'good' —
-- the conservative default (neither one implies "avoid this place").
--
-- channel_id/discord_message_id mirror furniture_candidates: a place
-- captured or reacted to from Discord can be looked up by the message the
-- bot posted, so 👍/👎 reactions on that message can mark it good/bad,
-- the same voting UX furniture already uses.

alter table places add column if not exists channel_id text;
alter table places add column if not exists discord_message_id text;

create unique index if not exists places_message_idx
  on places (discord_message_id) where discord_message_id is not null;

update places set status = 'good' where status in ('been', 'favourite');

alter table places drop constraint if exists places_status_check;
alter table places add constraint places_status_check
  check (status in ('idea', 'good', 'bad', 'archived'));
