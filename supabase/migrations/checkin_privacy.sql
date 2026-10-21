-- Check-in privacy (2026-10-21): you can't read your partner's weekly
-- check-in (answers, note or photo) until you have checked in that week too,
-- or the week is over. Your own is always yours to read. Enforced here in the
-- database, so no screen can show it early. Safe to run twice.

-- Is a check-in for (space, week) open to the person asking? Security definer
-- so it can look at the asker's own row without the policy calling itself.
create or replace function checkin_unlocked(p_space uuid, p_week date)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_week + 7 <= (now() at time zone 'America/Los_Angeles')::date
      or exists (
        select 1 from checkins c
        where c.space_id = p_space and c.user_id = auth.uid()
          and c.week_of between p_week - 6 and p_week + 6
      )
$$;

-- Who has checked in this week, names only, never the answers. Lets the app
-- say "Harry has checked in" before you have.
create or replace function checkin_week_done(p_space uuid, p_week date)
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select c.user_id from checkins c
  where c.space_id = p_space and c.week_of >= p_week
    and is_space_member(p_space, auth.uid())
$$;

grant execute on function checkin_unlocked(uuid, date) to authenticated;
grant execute on function checkin_week_done(uuid, date) to authenticated;

drop policy if exists "checkins_select_own_or_space" on checkins;
create policy "checkins_select_own_or_space" on checkins
  for select
  using (
    user_id = auth.uid()
    or (is_space_member(space_id, auth.uid()) and checkin_unlocked(space_id, week_of))
  );

-- Photos: path is {space_id}/{week_of}/{user_id}.{ext}. Your own photo is
-- always readable; your partner's opens on the same rule as the answers.
drop policy if exists "checkin_photos_select" on storage.objects;
create policy "checkin_photos_select" on storage.objects
  for select using (
    bucket_id = 'checkin-photos'
    and is_space_member((storage.foldername(name))[1]::uuid, auth.uid())
    and (
      split_part(storage.filename(name), '.', 1) = auth.uid()::text
      or checkin_unlocked((storage.foldername(name))[1]::uuid, ((storage.foldername(name))[2])::date)
    )
  );
