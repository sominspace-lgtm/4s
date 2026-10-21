-- Away mode (2026-10-21): pause every chore while you are both away. While
-- it is on, chores freeze where they were the day you left, and no chore
-- reminders go out. When you come back (tap "We're back", or the end date
-- passes) each chore's last-done date moves forward by the days you were
-- gone, so nothing comes back overdue just because you were away.
-- Safe to run twice.

alter table shared_spaces add column if not exists away_from date;
alter table shared_spaces add column if not exists away_until date;

-- Either of you can turn it on. If it is already running, only the end date
-- changes, so the start (and the pause so far) is kept.
create or replace function household_set_away(p_space uuid, p_from date, p_until date)
returns void
language plpgsql security definer set search_path = public
as $$
declare today date := (now() at time zone 'America/Los_Angeles')::date;
begin
  if not is_space_member(p_space, auth.uid()) then raise exception 'not a member'; end if;
  if p_until is null or p_from is null or p_until < p_from then raise exception 'end must be on or after start'; end if;
  update shared_spaces
     set away_from = case when away_from is not null and away_from <= today then away_from else p_from end,
         away_until = p_until
   where id = p_space;
end $$;

-- End it: shift every chore forward by the days paused, then clear it.
-- Called by the app ("We're back", or when it sees the end date has passed)
-- and by the daily job, so it works even if nobody opens the app.
create or replace function household_back(p_space uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  today date := (now() at time zone 'America/Los_Angeles')::date;
  s record;
  d int;
begin
  -- No signed-in user means the server's own key (anon cannot call this).
  if auth.uid() is not null and not is_space_member(p_space, auth.uid()) then raise exception 'not a member'; end if;
  select away_from, away_until into s from shared_spaces where id = p_space for update;
  if s.away_from is null then return; end if;
  if s.away_from <= today then
    d := least(today, s.away_until + 1) - s.away_from;
    if d > 0 then
      update household_chores
         set last_done_at = least(last_done_at + d, today)
       where space_id = p_space and last_done_at is not null;
    end if;
  end if;
  update shared_spaces set away_from = null, away_until = null where id = p_space;
end $$;

revoke all on function household_set_away(uuid, date, date) from public, anon;
revoke all on function household_back(uuid) from public, anon;
grant execute on function household_set_away(uuid, date, date) to authenticated, service_role;
grant execute on function household_back(uuid) to authenticated, service_role;
