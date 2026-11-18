-- Spotify (2026-11-18): each of you can link your own Spotify, so the wall
-- iPad can show what is playing and play a playlist. Tokens are sealed
-- (encrypted) before they are stored, and only the server (service role)
-- can read this table: RLS is on with no policies. Run once in the
-- Supabase SQL Editor of the SS project.

create table if not exists spotify_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table spotify_links enable row level security;
