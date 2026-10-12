-- Password vault (2026-10-12).
--
-- Zero-knowledge: the browser encrypts every entry with a key derived from a
-- passphrase that never leaves the device (see lib/vault/crypto.ts). These
-- tables hold only the salt, a verifier used to check the passphrase, and
-- ciphertext. Losing the passphrase means losing the vault, by design.
-- Personal only: no space_id, no sharing.

create table if not exists vault_keys (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  salt        text not null,
  verifier    text not null,
  iterations  int  not null default 600000,
  created_at  timestamptz not null default now()
);

create table if not exists vault_entries (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  ciphertext  text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists vault_entries_user_idx on vault_entries(user_id);

alter table vault_keys enable row level security;
alter table vault_entries enable row level security;

drop policy if exists "vault_keys_owner" on vault_keys;
create policy "vault_keys_owner" on vault_keys
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "vault_entries_owner" on vault_entries;
create policy "vault_entries_owner" on vault_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
