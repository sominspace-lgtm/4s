-- Lets recipients read shared captures/wishlist_items — same additive
-- pattern as work_items_select_if_shared / buy_items_select_if_shared in
-- the earlier migrations. Requires shared_spaces_and_item_sharing.sql to
-- have already been run (references shared_item_links, shared_space_members).

create policy "captures_select_if_shared" on captures
  for select using (
    exists (
      select 1 from shared_item_links l
      where l.item_type = 'capture'
        and l.item_id = captures.id
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

create policy "watch_items_select_if_shared" on watch_items
  for select using (
    exists (
      select 1 from shared_item_links l
      where l.item_type = 'wishlist_item'
        and l.item_id = watch_items.id
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
