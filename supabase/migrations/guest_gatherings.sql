-- Guest Layer / Guest Mode (2026-08-29) — "when we host, guests scan one QR
-- and leave a photo, a thank-you, a guestbook signature, a note, a song,
-- where they're from, something for the fridge. Each lands in the Village as
-- a physical object. When it ends, the Village keeps a small memory of it."
--
-- Guests have NO account and NO Supabase session. Every guest write goes
-- through /api/g/[token] with the service-role (admin) client — the random
-- `token` (printed on the welcome sign) is the boundary, and the API pins
-- every write to the gathering's own space_id. The tables below are only
-- ever read/written directly by the household (RLS = is_space_member).
--
-- Requires: shared_spaces_and_item_sharing.sql, fix_shared_spaces_recursion.sql,
-- is_space_member_include_owner.sql (the SECURITY DEFINER is_space_member helper).
--
-- Run once in the Supabase SQL Editor. Additive only.

-- One row per gathering. active = true for a space IS "Guest Mode on".
create table if not exists gatherings (
  id           uuid primary key default gen_random_uuid(),
  space_id     uuid not null references shared_spaces(id) on delete cascade,
  created_by   uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  token        text not null unique,
  music_url    text,                          -- host's Spotify/YouTube playlist embed
  photo_album_url text,                        -- shared album guests add photos to (Google Photos etc.)
  active       boolean not null default true,
  started_at   timestamptz not null default now(),
  closes_at    timestamptz,
  created_at   timestamptz not null default now()
);

-- Everything a guest leaves. One table, `kind` discriminator — the same
-- single-table split household_meals/household_routines use.
create table if not exists guest_contributions (
  id            uuid primary key default gen_random_uuid(),
  gathering_id  uuid not null references gatherings(id) on delete cascade,
  space_id      uuid not null references shared_spaces(id) on delete cascade, -- denormalised for RLS + realtime filter
  kind          text not null check (kind in ('photo','thank_you','guestbook','note','song','from','fridge')),
  guest_name    text,
  body          text,
  media_path    text,                          -- storage path for kind = 'photo'
  meta          jsonb not null default '{}'::jsonb, -- song {title,url}; from {place,lat,lng}; fridge {kind}
  upvotes       integer not null default 0,
  status        text not null default 'visible' check (status in ('visible','hidden')),
  created_at    timestamptz not null default now()
);

-- The "Tonight at the Village" keepsake, generated when a gathering closes.
create table if not exists gathering_memories (
  id            uuid primary key default gen_random_uuid(),
  space_id      uuid not null references shared_spaces(id) on delete cascade,
  gathering_id  uuid references gatherings(id) on delete set null,
  title         text not null,
  happened_on   date not null default current_date,
  summary       jsonb not null default '{}'::jsonb, -- {guestCount, photoIds[], songs[], messages[], fromPlaces[]}
  status        text not null default 'visible' check (status in ('visible','hidden')),
  created_at    timestamptz not null default now()
);

alter table gatherings enable row level security;
alter table guest_contributions enable row level security;
alter table gathering_memories enable row level security;

-- Host side only. is_space_member() is SECURITY DEFINER so no recursion.
drop policy if exists "gatherings_own_or_space" on gatherings;
create policy "gatherings_own_or_space" on gatherings
  for all
  using (created_by = auth.uid() or is_space_member(space_id, auth.uid()))
  with check (created_by = auth.uid() or is_space_member(space_id, auth.uid()));

drop policy if exists "guest_contributions_space" on guest_contributions;
create policy "guest_contributions_space" on guest_contributions
  for all
  using (is_space_member(space_id, auth.uid()))
  with check (is_space_member(space_id, auth.uid()));

drop policy if exists "gathering_memories_space" on gathering_memories;
create policy "gathering_memories_space" on gathering_memories
  for all
  using (is_space_member(space_id, auth.uid()))
  with check (is_space_member(space_id, auth.uid()));

create index if not exists gatherings_space_active_idx on gatherings(space_id, active);
create index if not exists gatherings_token_idx on gatherings(token);
create index if not exists guest_contributions_gathering_idx on guest_contributions(gathering_id, created_at desc);
create index if not exists guest_contributions_space_idx on guest_contributions(space_id);
create index if not exists gathering_memories_space_idx on gathering_memories(space_id, happened_on desc);

-- Private bucket for guest photos — same shape as place-photos. Uploads are
-- done server-side with the admin client, so no insert policy is needed;
-- display uses short-lived signed URLs, gated by the select policy below.
insert into storage.buckets (id, name, public)
values ('guest-photos', 'guest-photos', false)
on conflict (id) do nothing;

drop policy if exists "guest_photos_select" on storage.objects;
create policy "guest_photos_select" on storage.objects
  for select
  using (
    bucket_id = 'guest-photos'
    and exists (
      select 1 from guest_contributions c
      where c.id::text = (storage.foldername(name))[1]
        and is_space_member(c.space_id, auth.uid())
    )
  );

drop policy if exists "guest_photos_delete" on storage.objects;
create policy "guest_photos_delete" on storage.objects
  for delete
  using (
    bucket_id = 'guest-photos'
    and exists (
      select 1 from guest_contributions c
      where c.id::text = (storage.foldername(name))[1]
        and is_space_member(c.space_id, auth.uid())
    )
  );

-- Realtime so the host's Village picks up new guest contributions live
-- (same mechanism village_layout relies on — publication membership, not
-- the writing role, is what triggers the broadcast, so admin-client guest
-- inserts still reach the subscription).
alter publication supabase_realtime add table gatherings;
alter publication supabase_realtime add table guest_contributions;

-- Phase 3/4 additions (2026-08-29) — safe to run on top of an earlier
-- version of this file. `photo_album_url` lets the photo-booth action just
-- open a shared album instead of hosting uploads.
alter table gatherings add column if not exists photo_album_url text;
