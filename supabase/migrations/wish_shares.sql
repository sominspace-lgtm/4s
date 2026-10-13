-- Share a wishlist with anyone by link (2026-10-12). No account needed to look;
-- a visitor can mark something "I'll get this" so it is not bought twice, and
-- the owner only ever sees that it is covered, not by whom. Only the share
-- row's owner can create or stop a link; the public page reads through the
-- server with the service role, scoped to that one owner (and list).

create table if not exists wish_shares (
  token       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  list        text,
  title       text not null,
  created_at  timestamptz not null default now()
);
create index if not exists wish_shares_user_idx on wish_shares(user_id);
alter table wish_shares enable row level security;
drop policy if exists wish_shares_owner on wish_shares;
create policy wish_shares_owner on wish_shares for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table wish_items add column if not exists claimed_name text;
alter table wish_items add column if not exists claim_key text;
