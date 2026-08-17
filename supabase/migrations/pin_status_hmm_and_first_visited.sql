-- Pin redesign (user request, 2026-08-13): add a real middle ground between
-- good and bad, and track when a place was first actually visited (distinct
-- from created_at, which is just when the pin was saved).

alter table places add column if not exists first_visited_on date;

alter table places drop constraint if exists places_status_check;
alter table places add constraint places_status_check
  check (status in ('idea', 'hmm', 'good', 'bad', 'archived'));
