-- Check-in gets a required photo and an optional note (2026-09-08). The
-- photo is a small ritual — one image from the week, taken at the moment
-- you both sit down to check in — and the note is anything the questions
-- didn't cover.
--
-- Photos live in a private bucket, same convention as place-photos: path
-- `{space_id}/{week_of}/{user_id}.{ext}`, so a member of the space reads
-- all of them (both partners see each other's) and writes only their own.

alter table checkins add column if not exists photo_path text;
alter table checkins add column if not exists note text;

insert into storage.buckets (id, name, public)
values ('checkin-photos', 'checkin-photos', false)
on conflict (id) do nothing;

drop policy if exists "checkin_photos_select" on storage.objects;
create policy "checkin_photos_select" on storage.objects
  for select using (
    bucket_id = 'checkin-photos'
    and is_space_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

drop policy if exists "checkin_photos_insert" on storage.objects;
create policy "checkin_photos_insert" on storage.objects
  for insert with check (
    bucket_id = 'checkin-photos'
    and is_space_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

drop policy if exists "checkin_photos_delete" on storage.objects;
create policy "checkin_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'checkin-photos'
    and is_space_member((storage.foldername(name))[1]::uuid, auth.uid())
  );
