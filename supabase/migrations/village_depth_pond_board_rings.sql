-- Village depth pass (2026-09-08): trip photo albums, a one-line partner
-- note on the notice board, and dated rings on the archive tree.

-- 1. A photo-album link per trip. The postcard rack in the village shows
--    real trips now; a trip with a link opens it.
alter table trips add column if not exists photo_album_url text;

-- 2. One line a partner leaves the other on the notice board. Not guest
--    house info (that lives in shared_spaces.guest_info) — a private note
--    between the two members, shown on the board in home view only.
alter table shared_spaces add column if not exists board_note text;
alter table shared_spaces add column if not exists board_note_by uuid references auth.users(id) on delete set null;
alter table shared_spaces add column if not exists board_note_at timestamptz;

-- 3. The archive tree carves a dated ring per year. One row per year the
--    household wants to mark; the note is what happened. Sylvia writes
--    these herself from the Archive view.
create table if not exists village_rings (
  id           uuid primary key default gen_random_uuid(),
  space_id     uuid not null references shared_spaces(id) on delete cascade,
  year         int  not null,
  note         text not null,
  happened_on  date,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (space_id, year)
);

alter table village_rings enable row level security;

drop policy if exists "village_rings_space_member" on village_rings;
create policy "village_rings_space_member" on village_rings
  for all
  using (is_space_member(space_id, auth.uid()))
  with check (is_space_member(space_id, auth.uid()));

create index if not exists village_rings_space_idx on village_rings(space_id);
