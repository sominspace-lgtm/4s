-- Fix: the space OWNER was never counted as a "member" for RLS purposes
-- (2026-08-22). is_space_member() only ever checked shared_space_members
-- (invited + accepted people) -- the owner has no row there, ownership is a
-- separate column on shared_spaces itself. Every "own_or_space" policy in
-- the app (chores, meals, lists, notes, checkins, task-sharing, and more --
-- 19 migration files reference this function) is built as
-- `user_id = auth.uid() or is_space_member(space_id, auth.uid())`, so the
-- owner could only ever see rows THEY personally created, never rows a
-- partner created under the same space -- while the partner (an actual row
-- in shared_space_members) could see everything correctly. This is why
-- Sylvia could never see Harry's check-ins even though Harry could see hers.
--
-- Purely additive: this only WIDENS who counts as a member (adds the owner),
-- it can only grant visibility that was wrongly missing, never take any away.
-- Run once in the Supabase SQL Editor.

create or replace function is_space_member(p_space_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from shared_space_members
    where space_id = p_space_id and member_id = p_user_id and status = 'accepted'
  ) or exists (
    select 1 from shared_spaces
    where id = p_space_id and owner_id = p_user_id
  );
$$;
