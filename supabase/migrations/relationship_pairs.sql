-- Relationship partner confirmation — a stricter, separate gate from the
-- general `companions` (friends) table. Companions controls task/habit
-- sharing; this controls access to the Relationship tab's Companion sync
-- (Discord bot check-ins, photos) specifically, because that data is more
-- sensitive and shouldn't be exposed just because someone accepted a
-- generic friend invite.
--
-- Same invite-by-email shape as `companions`, but confirmation can ONLY be
-- performed by the invited partner (matched on their JWT email), never by
-- the requester — see pairs_update_by_partner below. That's what makes this
-- a real dual-consent gate instead of a one-sided flag.
--
-- Run this once in the Supabase SQL editor. Additive only.

create table if not exists relationship_pairs (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references auth.users(id) on delete cascade,
  partner_email text not null,
  partner_id    uuid references auth.users(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'confirmed')),
  created_at    timestamptz not null default now(),
  unique (requester_id, partner_email)
);

alter table relationship_pairs enable row level security;

drop policy if exists "pairs_select" on relationship_pairs;
create policy "pairs_select" on relationship_pairs
  for select using (
    requester_id = auth.uid()
    or partner_id = auth.uid()
    or partner_email = (auth.jwt() ->> 'email')
  );

drop policy if exists "pairs_insert_requester" on relationship_pairs;
create policy "pairs_insert_requester" on relationship_pairs
  for insert with check (requester_id = auth.uid());

-- Only the invited partner can confirm — the requester cannot flip their
-- own pending invite to 'confirmed'. This is the actual consent boundary.
drop policy if exists "pairs_update_by_partner" on relationship_pairs;
create policy "pairs_update_by_partner" on relationship_pairs
  for update using (partner_email = (auth.jwt() ->> 'email'))
  with check (partner_email = (auth.jwt() ->> 'email'));

drop policy if exists "pairs_delete_either" on relationship_pairs;
create policy "pairs_delete_either" on relationship_pairs
  for delete using (requester_id = auth.uid() or partner_id = auth.uid());

create index if not exists relationship_pairs_partner_email_idx on relationship_pairs(partner_email);
