-- iPhone Shortcut key (2026-10-19): one per person, so a Shortcut on the lock
-- screen can add to 4S without a browser sign-in. Only a SHA-256 hash of the
-- key is stored; the key itself is shown once when it is made. Making a new
-- key replaces the old one, which then stops working.
create table if not exists quick_keys (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  key_hash    text not null unique,
  created_at  timestamptz not null default now(),
  last_used   timestamptz
);
alter table quick_keys enable row level security;
drop policy if exists "quick_keys_own" on quick_keys;
create policy "quick_keys_own" on quick_keys
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
