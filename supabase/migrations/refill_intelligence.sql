-- Refill Intelligence — extends the existing buy_items table (Money → Buy Again).
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Purely additive: every column is nullable or has a default, so existing
-- buy_items rows keep working unchanged as "Simple Interval" items.
--
-- REQUIRES supabase/migrations/shared_spaces_and_item_sharing.sql to have
-- already been run — the last policy below references shared_item_links and
-- shared_space_members from that migration. Run that one first if you
-- haven't already.

alter table buy_items add column if not exists category text default 'other';
alter table buy_items add column if not exists tracking_mode text not null default 'simple-interval'
  check (tracking_mode in ('simple-interval', 'smart-supply', 'manual-date'));

-- Smart Supply fields
alter table buy_items add column if not exists quantity numeric;
alter table buy_items add column if not exists serving_count numeric;
alter table buy_items add column if not exists serving_size text;
alter table buy_items add column if not exists usage_per_day numeric;
alter table buy_items add column if not exists opened_date date;
alter table buy_items add column if not exists estimated_runout_date date;

-- Manual Date mode
alter table buy_items add column if not exists reminder_date date;

-- Shared reminder/notify config
alter table buy_items add column if not exists notify_days_before integer not null default 3;
alter table buy_items add column if not exists store text;
alter table buy_items add column if not exists price numeric;
alter table buy_items add column if not exists image_url text;
alter table buy_items add column if not exists notes text;

-- Lifecycle
alter table buy_items add column if not exists status text not null default 'stocked'
  check (status in ('stocked', 'backup-stock', 'running-low', 'due-to-buy', 'overdue', 'snoozed', 'paused'));
alter table buy_items add column if not exists snoozed_until date;

-- Adaptive interval feedback ("too early / just right / too late")
alter table buy_items add column if not exists last_feedback text;

-- Let recipients read a buy_item's content once it's been shared via
-- shared_item_links (item_type = 'buy_item') — same additive pattern used
-- for work_items in shared_spaces_and_item_sharing.sql. This only ADDS a
-- policy (Postgres RLS is OR-of-policies); your existing owner-only policy
-- on buy_items is untouched, so private refill items stay private.
create policy "buy_items_select_if_shared" on buy_items
  for select using (
    exists (
      select 1 from shared_item_links l
      where l.item_type = 'buy_item'
        and l.item_id = buy_items.id
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
