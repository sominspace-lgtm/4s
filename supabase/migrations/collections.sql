-- Collections (2026-10-12): small databases you define yourself, to track
-- anything. A collection has named, typed properties (text, number, date,
-- checkbox, select, link) and rows, shown as a table or a board.
-- Personal by default; set space_id to share a collection with the household,
-- where both partners can add and edit rows.

create table if not exists collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid references shared_spaces(id) on delete set null,
  name        text not null,
  icon        text,
  props       jsonb not null default '[]',
  view        text not null default 'table' check (view in ('table', 'board')),
  board_prop  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists collection_rows (
  id             uuid primary key default gen_random_uuid(),
  collection_id  uuid not null references collections(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  cells          jsonb not null default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists collections_user_idx      on collections(user_id);
create index if not exists collections_space_idx     on collections(space_id);
create index if not exists collection_rows_coll_idx  on collection_rows(collection_id);

alter table collections enable row level security;
alter table collection_rows enable row level security;

drop policy if exists collections_access on collections;
create policy collections_access on collections for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

drop policy if exists collection_rows_access on collection_rows;
create policy collection_rows_access on collection_rows for all
  using (exists (
    select 1 from collections c where c.id = collection_rows.collection_id
      and (c.user_id = auth.uid() or (c.space_id is not null and is_space_member(c.space_id, auth.uid())))
  ))
  with check (exists (
    select 1 from collections c where c.id = collection_rows.collection_id
      and (c.user_id = auth.uid() or (c.space_id is not null and is_space_member(c.space_id, auth.uid())))
  ));
