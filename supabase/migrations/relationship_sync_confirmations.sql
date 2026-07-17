-- Dual-partner verification for the Relationship tab's Companion sync
-- (check-ins, tracked items, date nights, on-this-day highlights pulled live
-- from the separate Companion Discord bot backend). One row per person per
-- item they've confirmed — visibility mirrors the existing `companions`
-- mutual-friend pattern (see companions_invite_visibility_fix.sql): you can
-- always see your own confirmations, and you can see a companion's
-- confirmations once you two are mutually accepted, so the UI can show
-- "You confirmed" / "Waiting on X" / "Both confirmed" without another table.
--
-- Run this once in the Supabase SQL editor. Additive only.

create table if not exists relationship_sync_confirmations (
  id            uuid primary key default gen_random_uuid(),
  item_type     text not null check (item_type in ('checkin', 'tracked_item', 'date_night', 'on_this_day')),
  item_id       text not null, -- matches the Companion backend's id (not necessarily a uuid)
  user_id       uuid not null references auth.users(id) on delete cascade,
  confirmed_at  timestamptz not null default now(),
  unique (item_type, item_id, user_id)
);

alter table relationship_sync_confirmations enable row level security;

-- Read your own confirmations, plus a mutually-accepted companion's —
-- exactly the pairing that makes "waiting on [partner]" meaningful.
drop policy if exists "confirmations_select" on relationship_sync_confirmations;
create policy "confirmations_select" on relationship_sync_confirmations
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from companions c
      where c.status = 'accepted'
        and (
          (c.inviter_id = auth.uid() and c.invitee_id = relationship_sync_confirmations.user_id)
          or (c.invitee_id = auth.uid() and c.inviter_id = relationship_sync_confirmations.user_id)
        )
    )
  );

-- You can only ever confirm as yourself.
drop policy if exists "confirmations_insert_self" on relationship_sync_confirmations;
create policy "confirmations_insert_self" on relationship_sync_confirmations
  for insert with check (user_id = auth.uid());

-- Un-confirming (misclick recovery) is yours to do, nobody else's.
drop policy if exists "confirmations_delete_self" on relationship_sync_confirmations;
create policy "confirmations_delete_self" on relationship_sync_confirmations
  for delete using (user_id = auth.uid());

create index if not exists relationship_sync_confirmations_item_idx
  on relationship_sync_confirmations(item_type, item_id);
