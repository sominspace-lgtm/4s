-- Fixes the friend-invite/accept flow: a pending invite has invitee_id = NULL
-- (it's only set when the recipient accepts), so if your existing RLS
-- policies on `companions` only allow SELECT/UPDATE when invitee_id =
-- auth.uid(), the recipient can never see their own pending invite to
-- accept it — invitee_email is the only thing that identifies them before
-- they've accepted.
--
-- Additive only (Postgres RLS is OR-of-policies) — does not remove or
-- replace your existing owner/invitee-id policies.

create policy "companions_select_by_invite_email" on companions
  for select using (invitee_email = (auth.jwt() ->> 'email'));

create policy "companions_update_by_invite_email" on companions
  for update using (invitee_email = (auth.jwt() ->> 'email'));
