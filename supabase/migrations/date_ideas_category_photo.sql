-- Date ideas get a category and a photo (2026-09-08). Category groups the
-- list into a few honest buckets — at home, cheap, a splurge — instead of
-- the fuzzy price/energy meta. Photo is added when an idea is marked done:
-- the list becomes a little album of dates you've actually had.
--
-- Photos: private bucket, path `{idea_id}/{filename}`, own-or-space via a
-- join back to date_ideas — same convention as place-photos.

alter table date_ideas add column if not exists category text
  check (category in ('home', 'cheap', 'splurge'));
alter table date_ideas add column if not exists photo_path text;

insert into storage.buckets (id, name, public)
values ('date-idea-photos', 'date-idea-photos', false)
on conflict (id) do nothing;

drop policy if exists "date_idea_photos_select" on storage.objects;
create policy "date_idea_photos_select" on storage.objects
  for select using (
    bucket_id = 'date-idea-photos'
    and exists (
      select 1 from date_ideas d
      where d.id::text = (storage.foldername(name))[1]
        and (d.user_id = auth.uid() or (d.space_id is not null and is_space_member(d.space_id, auth.uid())))
    )
  );

drop policy if exists "date_idea_photos_write" on storage.objects;
create policy "date_idea_photos_write" on storage.objects
  for all using (
    bucket_id = 'date-idea-photos'
    and exists (
      select 1 from date_ideas d
      where d.id::text = (storage.foldername(name))[1]
        and (d.user_id = auth.uid() or (d.space_id is not null and is_space_member(d.space_id, auth.uid())))
    )
  ) with check (
    bucket_id = 'date-idea-photos'
    and exists (
      select 1 from date_ideas d
      where d.id::text = (storage.foldername(name))[1]
        and (d.user_id = auth.uid() or (d.space_id is not null and is_space_member(d.space_id, auth.uid())))
    )
  );
