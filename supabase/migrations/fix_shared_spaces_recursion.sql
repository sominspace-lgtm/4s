-- Fixes "infinite recursion detected in policy for relation
-- shared_space_members" — shared_spaces' SELECT policy queried
-- shared_space_members, and shared_space_members' SELECT policy queried
-- back into shared_spaces, forming a cycle Postgres can't evaluate.
--
-- Fix: a SECURITY DEFINER function reads shared_space_members directly
-- (bypassing RLS, since it runs as the function owner), so shared_spaces'
-- policy no longer re-triggers shared_space_members' policy.

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
  );
$$;

grant execute on function is_space_member(uuid, uuid) to authenticated;

alter policy "spaces_select_owner_or_member" on shared_spaces
  using (
    owner_id = auth.uid()
    or is_space_member(shared_spaces.id, auth.uid())
  );
