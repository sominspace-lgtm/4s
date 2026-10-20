-- Little wins and Things we own (2026-10-20).
-- Wins: a shared feed of what got done (chores, routines, meals cooked, and
-- lines you add by hand). Things: what the house owns, with the receipt or a
-- photo, and when the warranty ends. Safe to run twice.

create table if not exists household_wins (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references shared_spaces(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null default 'win',
  title      text not null,
  created_at timestamptz not null default now()
);
create index if not exists household_wins_space_idx on household_wins(space_id, created_at desc);
alter table household_wins enable row level security;

drop policy if exists hw_select on household_wins;
create policy hw_select on household_wins for select using (is_space_member(space_id, auth.uid()));
drop policy if exists hw_insert on household_wins;
create policy hw_insert on household_wins for insert with check (user_id = auth.uid() and is_space_member(space_id, auth.uid()));
drop policy if exists hw_delete on household_wins;
create policy hw_delete on household_wins for delete using (user_id = auth.uid());

create table if not exists household_things (
  id             uuid primary key default gen_random_uuid(),
  space_id       uuid not null references shared_spaces(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  brand          text,
  model          text,
  store          text,
  purchased_on   date,
  price          numeric,
  warranty_until date,
  notes          text,
  photo_paths    text[] not null default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists household_things_space_idx on household_things(space_id);
alter table household_things enable row level security;

drop policy if exists ht_select on household_things;
create policy ht_select on household_things for select using (is_space_member(space_id, auth.uid()));
drop policy if exists ht_insert on household_things;
create policy ht_insert on household_things for insert with check (user_id = auth.uid() and is_space_member(space_id, auth.uid()));
drop policy if exists ht_update on household_things;
create policy ht_update on household_things for update using (is_space_member(space_id, auth.uid())) with check (is_space_member(space_id, auth.uid()));
drop policy if exists ht_delete on household_things;
create policy ht_delete on household_things for delete using (is_space_member(space_id, auth.uid()));

-- Photos live in a private bucket, one folder per thing: {thing_id}/{file}.
insert into storage.buckets (id, name, public)
values ('thing-photos', 'thing-photos', false)
on conflict (id) do nothing;

drop policy if exists "thing_photos_select" on storage.objects;
create policy "thing_photos_select" on storage.objects for select using (
  bucket_id = 'thing-photos'
  and exists (select 1 from household_things t where t.id::text = (storage.foldername(name))[1] and is_space_member(t.space_id, auth.uid()))
);
drop policy if exists "thing_photos_insert" on storage.objects;
create policy "thing_photos_insert" on storage.objects for insert with check (
  bucket_id = 'thing-photos'
  and exists (select 1 from household_things t where t.id::text = (storage.foldername(name))[1] and is_space_member(t.space_id, auth.uid()))
);
drop policy if exists "thing_photos_delete" on storage.objects;
create policy "thing_photos_delete" on storage.objects for delete using (
  bucket_id = 'thing-photos'
  and exists (select 1 from household_things t where t.id::text = (storage.foldername(name))[1] and is_space_member(t.space_id, auth.uid()))
);
