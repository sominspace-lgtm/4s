-- relationship_sync_confirmations.sql originally scoped visibility to any
-- mutually-accepted `companions` (friend) relationship. Now that
-- relationship_pairs.sql exists as the dedicated, dual-consent-gated
-- concept for Companion sync access specifically, re-point the policy at
-- that instead — a generic friend should not see check-in/photo
-- confirmations just because they accepted a task-sharing invite.
--
-- Depends on relationship_pairs.sql — run that one first, then this.
-- Run this once in the Supabase SQL editor.

drop policy if exists "confirmations_select" on relationship_sync_confirmations;
create policy "confirmations_select" on relationship_sync_confirmations
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from relationship_pairs p
      where p.status = 'confirmed'
        and (
          (p.requester_id = auth.uid() and p.partner_id = relationship_sync_confirmations.user_id)
          or (p.partner_id = auth.uid() and p.requester_id = relationship_sync_confirmations.user_id)
        )
    )
  );
