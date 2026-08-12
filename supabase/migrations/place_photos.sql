-- Photos on Places pins (user request, 2026-08-12). First use of Supabase
-- Storage in this app — private bucket, RLS-gated same as every other table
-- here, path convention `{place_id}/{filename}` so ownership can be checked
-- by joining back to `places` (own-or-space, same rule places itself uses).
-- URLs are never public: the client requests short-lived signed URLs.

insert into storage.buckets (id, name, public)
values ('place-photos', 'place-photos', false)
on conflict (id) do nothing;

alter table places add column if not exists photo_paths text[] not null default '{}';

drop policy if exists "place_photos_select" on storage.objects;
create policy "place_photos_select" on storage.objects
  for select
  using (
    bucket_id = 'place-photos'
    and exists (
      select 1 from places p
      where p.id::text = (storage.foldername(name))[1]
        and (p.user_id = auth.uid() or (p.space_id is not null and is_space_member(p.space_id, auth.uid())))
    )
  );

drop policy if exists "place_photos_insert" on storage.objects;
create policy "place_photos_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'place-photos'
    and exists (
      select 1 from places p
      where p.id::text = (storage.foldername(name))[1]
        and (p.user_id = auth.uid() or (p.space_id is not null and is_space_member(p.space_id, auth.uid())))
    )
  );

drop policy if exists "place_photos_delete" on storage.objects;
create policy "place_photos_delete" on storage.objects
  for delete
  using (
    bucket_id = 'place-photos'
    and exists (
      select 1 from places p
      where p.id::text = (storage.foldername(name))[1]
        and (p.user_id = auth.uid() or (p.space_id is not null and is_space_member(p.space_id, auth.uid())))
    )
  );
