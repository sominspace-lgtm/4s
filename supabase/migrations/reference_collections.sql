-- Household Reference lists as collections (2026-10-12): date ideas, movies and
-- shows, and games get the same table/board views as any collection, with
-- columns you can add yourself. Their rows stay in their original tables so
-- Places, the Village, the guest wall and Discord keep working; added columns
-- are stored in each row's `extras`, and the view settings in a collections
-- row marked with a system_key. Additive only: nothing is moved or dropped.

alter table collections add column if not exists system_key text;
alter table collections add column if not exists guest_visible boolean not null default false;
create unique index if not exists collections_system_key_idx on collections(space_id, system_key) where system_key is not null;

alter table date_ideas add column if not exists extras jsonb not null default '{}';
alter table household_watchlist add column if not exists extras jsonb not null default '{}';
