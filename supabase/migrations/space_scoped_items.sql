-- Retire per-item sharing (shared_item_links + the ⇆ ShareMenu) in favour of
-- plain space scoping: a task or event carries the household space's id, and
-- every accepted member of that space can read it. No more per-row toggle.
--
-- The shared_item_links table and the companions table are left in place but
-- unused — same way this app retires tables (see the events/refill sharing
-- migrations it replaces). Nothing writes them after this.

-- 1. space_id on the two tables the Household calendar reads.
alter table work_items add column if not exists space_id uuid references shared_spaces(id) on delete set null;
alter table events     add column if not exists space_id uuid references shared_spaces(id) on delete set null;

create index if not exists idx_work_items_space on work_items(space_id);
create index if not exists idx_events_space     on events(space_id);

-- 2. Carry over anything that was already shared per-item so it doesn't vanish
--    from the Household calendar on deploy.
update work_items w set space_id = l.space_id
  from shared_item_links l
  where l.item_type = 'work_item' and l.item_id = w.id
    and l.space_id is not null and w.space_id is null;

update events e set space_id = l.space_id
  from shared_item_links l
  where l.item_type = 'event' and l.item_id = e.id
    and l.space_id is not null and e.space_id is null;

-- 3. Replace the per-item "read if a share row exists" policies with plain
--    space membership.
drop policy if exists work_items_select_if_shared on work_items;
drop policy if exists events_select_if_shared     on events;
drop policy if exists buy_items_select_if_shared  on buy_items;
drop policy if exists captures_select_if_shared   on captures;
drop policy if exists watch_items_select_if_shared on watch_items;

create policy work_items_select_space on work_items for select using (
  space_id is not null and exists (
    select 1 from shared_space_members m
    where m.space_id = work_items.space_id
      and m.status = 'accepted'
      and m.member_id = auth.uid()
  )
);

create policy events_select_space on events for select using (
  space_id is not null and exists (
    select 1 from shared_space_members m
    where m.space_id = events.space_id
      and m.status = 'accepted'
      and m.member_id = auth.uid()
  )
);
