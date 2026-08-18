-- Household permissions + fixing the invite-accept gap (user request,
-- 2026-08-13).
--
-- shared_space_members.status could reach 'accepted' in theory, but no RLS
-- policy ever let the INVITED person see or claim their own pending row —
-- member_id starts null until accepted, and every existing policy checked
-- member_id = auth.uid(), true only AFTER acceptance, never before. The
-- original migration's own comment ("or the invited person, to see/accept
-- their own invite") describes intent the actual policy never implemented.
-- This closes that gap: a pending row becomes visible/claimable by whoever's
-- authenticated email matches member_email, on top of everything that
-- already worked (owner, inviter, accepted member).
--
-- role is new: every accepted member becomes 'owner' — full parity with the
-- space creator on everything already possible today (this isn't a
-- capability-restriction system). The one place role actually matters,
-- space deletion, was already owner_id-gated (spaces_delete_owner) and is
-- untouched here.

alter table shared_space_members add column if not exists role text not null default 'member'
  check (role in ('owner', 'member'));

drop policy if exists "members_select" on shared_space_members;
create policy "members_select" on shared_space_members
  for select using (
    invited_by = auth.uid()
    or member_id = auth.uid()
    or lower(member_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or exists (select 1 from shared_spaces s where s.id = space_id and s.owner_id = auth.uid())
  );

drop policy if exists "members_update_self_or_owner" on shared_space_members;
create policy "members_update_self_or_owner" on shared_space_members
  for update using (
    member_id = auth.uid()
    or lower(member_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or exists (select 1 from shared_spaces s where s.id = space_id and s.owner_id = auth.uid())
  );

-- Also lets an accepted member remove themselves (leave the space) and a
-- pending invitee decline — previously delete was owner-only.
drop policy if exists "members_delete_owner" on shared_space_members;
create policy "members_delete_owner" on shared_space_members
  for delete using (
    member_id = auth.uid()
    or lower(member_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or exists (select 1 from shared_spaces s where s.id = space_id and s.owner_id = auth.uid())
  );
