-- Memories link (user request, 2026-08-12): a shared space can point at an
-- external Google Drive folder or Google Photos album for household/couple
-- photos. Deliberately just a link-out, not an embed — Google Photos' API
-- mostly only exposes photos an app uploaded itself as of 2025's
-- restrictions, so pulling in an existing album's contents isn't reliably
-- possible without re-uploading through this app. A saved link plus a
-- themed "open" tile is the honest useful slice.
alter table shared_spaces add column memories_url text;
