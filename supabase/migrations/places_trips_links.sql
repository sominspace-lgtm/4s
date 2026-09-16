-- Saved links on pins and trips (2026-09-24) — paste a link from Instagram,
-- TikTok, a blog, a restaurant's own site, anything, and keep it attached to
-- the place or trip it's about, instead of losing it in your camera roll or
-- a chat thread. jsonb array, same client-owned shape household_lists.items
-- already uses: [{"id": uuid, "url": text, "title": text|null,
-- "image": text|null, "added_at": text}]. Additive only.

alter table places add column if not exists links jsonb not null default '[]'::jsonb;
alter table trips  add column if not exists links jsonb not null default '[]'::jsonb;
