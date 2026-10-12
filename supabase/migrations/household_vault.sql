-- Household password vault (2026-10-12): the passwords you both need (Wi-Fi,
-- streaming, utilities). Same zero-knowledge design as the personal vault:
-- the browser encrypts with a key derived from a passphrase the two of you
-- agree on in person, and these tables hold only salt, verifier, ciphertext.
-- The key row is write-once: a partner cannot swap the passphrase out from
-- under the other. Either of you can read, add, edit and remove entries.

create table if not exists household_vault_keys (
  space_id    uuid primary key references shared_spaces(id) on delete cascade,
  created_by  uuid not null references auth.users(id) on delete cascade,
  salt        text not null,
  verifier    text not null,
  iterations  int  not null default 600000,
  created_at  timestamptz not null default now()
);

create table if not exists household_vault_entries (
  id          uuid primary key,
  space_id    uuid not null references shared_spaces(id) on delete cascade,
  created_by  uuid not null references auth.users(id) on delete cascade,
  ciphertext  text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists household_vault_entries_space_idx on household_vault_entries(space_id);

alter table household_vault_keys enable row level security;
alter table household_vault_entries enable row level security;

drop policy if exists hv_keys_select on household_vault_keys;
create policy hv_keys_select on household_vault_keys for select using (is_space_member(space_id, auth.uid()));
drop policy if exists hv_keys_insert on household_vault_keys;
create policy hv_keys_insert on household_vault_keys for insert with check (created_by = auth.uid() and is_space_member(space_id, auth.uid()));

drop policy if exists hv_entries_all on household_vault_entries;
drop policy if exists hv_entries_select on household_vault_entries;
create policy hv_entries_select on household_vault_entries for select using (is_space_member(space_id, auth.uid()));
drop policy if exists hv_entries_insert on household_vault_entries;
create policy hv_entries_insert on household_vault_entries for insert with check (is_space_member(space_id, auth.uid()) and created_by = auth.uid());
drop policy if exists hv_entries_update on household_vault_entries;
create policy hv_entries_update on household_vault_entries for update using (is_space_member(space_id, auth.uid())) with check (is_space_member(space_id, auth.uid()));
drop policy if exists hv_entries_delete on household_vault_entries;
create policy hv_entries_delete on household_vault_entries for delete using (is_space_member(space_id, auth.uid()));
