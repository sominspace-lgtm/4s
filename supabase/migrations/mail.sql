-- Household mail/inbox (2026-09-22) — a small async message board for the
-- people in a shared space, not a chat. There's no typing indicator, no
-- delivery receipt, no thread/reply structure: you leave a message, they
-- see it next time they open the mailbox or get the push, same shape as an
-- actual mailbox rather than a messaging app. If this needs real-time later
-- that's a Supabase Realtime subscription on this same table, no schema
-- change.
--
-- space_id is NOT NULL, unlike every other household_* table (where null
-- means "just me"): mail has no meaning without someone to send it to. The
-- UI hides the mailbox entirely when there's no shared space.
--
-- read_by is an array rather than a boolean, so this works correctly even
-- if a space ever has more than two members — "read" is per-person, not a
-- single flag that the first person to open it flips for everyone.
--
-- Requires shared_spaces_and_item_sharing.sql + fix_shared_spaces_recursion.sql.

create table if not exists mail_messages (
  id             uuid primary key default gen_random_uuid(),
  space_id       uuid not null references shared_spaces(id) on delete cascade,
  from_user_id   uuid not null references auth.users(id) on delete cascade,
  body           text not null,
  read_by        uuid[] not null default '{}',
  created_at     timestamptz not null default now()
);

alter table mail_messages enable row level security;

-- Any space member can read the mailbox and send into it. Only the sender
-- (checked via from_user_id = auth.uid() in the insert policy) can create a
-- message as themselves — nobody can send mail that appears to be from
-- someone else. Nobody can edit a sent message; marking read is a full-row
-- update from the client (existing read_by, plus your own id), covered by
-- the same "any member" update policy since read state isn't sender-owned.
drop policy if exists "mail_read" on mail_messages;
create policy "mail_read" on mail_messages
  for select using (is_space_member(space_id, auth.uid()));

drop policy if exists "mail_send" on mail_messages;
create policy "mail_send" on mail_messages
  for insert with check (from_user_id = auth.uid() and is_space_member(space_id, auth.uid()));

drop policy if exists "mail_mark_read" on mail_messages;
create policy "mail_mark_read" on mail_messages
  for update using (is_space_member(space_id, auth.uid()))
  with check (is_space_member(space_id, auth.uid()));

create index if not exists mail_messages_space_idx on mail_messages(space_id, created_at desc);
