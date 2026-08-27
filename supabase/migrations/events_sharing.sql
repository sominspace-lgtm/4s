-- Event sharing (2026-08-27) — same generic shared_item_links pattern as
-- work_items (see shared_spaces_and_item_sharing.sql's own header: "the
-- same pattern... extends to captures/wishlist_items/buy_items/
-- subscriptions when you're ready to wire those up" — events is the next
-- one). Private by default (the existing "events_owner_all" policy is
-- untouched); this ADDS a second policy so a recipient can also read a row
-- a shared_item_links entry points at.
--
-- Run this in the Supabase SQL editor, after events_time.sql.

create policy "events_select_if_shared" on events
  for select using (
    exists (
      select 1 from shared_item_links l
      where l.item_type = 'event'
        and l.item_id = events.id
        and (
          l.shared_with_user_id = auth.uid()
          or exists (
            select 1 from shared_space_members m
            where m.space_id = l.space_id
              and m.status = 'accepted'
              and m.member_id = auth.uid()
          )
        )
    )
  );
