-- Our photos (2026-10-24): the household's own album. Add photos from a
-- phone or from Google Photos (yours or the shared account). Each photo can
-- be marked "guests can see"; in guest mode the village and the album show
-- only those. Photos live in a private bucket, one folder per household.
-- Safe to run twice.

create table if not exists household_photos (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references shared_spaces(id) on delete cascade,
  added_by    uuid references auth.users(id) on delete set null,
  path        text not null,
  caption     text,
  show_guests boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists household_photos_space_idx on household_photos(space_id, created_at desc);
alter table household_photos enable row level security;

drop policy if exists hp_select on household_photos;
create policy hp_select on household_photos for select using (is_space_member(space_id, auth.uid()));
drop policy if exists hp_insert on household_photos;
create policy hp_insert on household_photos for insert with check (is_space_member(space_id, auth.uid()) and added_by = auth.uid());
drop policy if exists hp_update on household_photos;
create policy hp_update on household_photos for update using (is_space_member(space_id, auth.uid())) with check (is_space_member(space_id, auth.uid()));
drop policy if exists hp_delete on household_photos;
create policy hp_delete on household_photos for delete using (is_space_member(space_id, auth.uid()));

insert into storage.buckets (id, name, public)
values ('household-photos', 'household-photos', false)
on conflict (id) do nothing;

-- Path: {space_id}/{file}
drop policy if exists "household_photos_select" on storage.objects;
create policy "household_photos_select" on storage.objects for select using (
  bucket_id = 'household-photos' and is_space_member((storage.foldername(name))[1]::uuid, auth.uid())
);
drop policy if exists "household_photos_insert" on storage.objects;
create policy "household_photos_insert" on storage.objects for insert with check (
  bucket_id = 'household-photos' and is_space_member((storage.foldername(name))[1]::uuid, auth.uid())
);
drop policy if exists "household_photos_delete" on storage.objects;
create policy "household_photos_delete" on storage.objects for delete using (
  bucket_id = 'household-photos' and is_space_member((storage.foldername(name))[1]::uuid, auth.uid())
);
