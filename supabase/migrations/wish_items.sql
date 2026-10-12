-- A real wishlist (2026-10-12): links with pictures and prices, lists, a
-- target price, "got it" history, and sharing with the household where a
-- partner can quietly claim something so it is not bought twice.
--
-- Replaces the one-line watch_items 'price' entries; those rows are copied
-- over below and the old table is left in place for its other types.

create table if not exists wish_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  space_id      uuid references shared_spaces(id) on delete set null,
  name          text not null,
  url           text,
  image_url     text,
  store         text,
  price         numeric,
  target_price  numeric,
  list          text not null default 'Someday',
  priority      smallint not null default 2 check (priority between 1 and 3),
  for_who       text,
  notes         text,
  status        text not null default 'wanted' check (status in ('wanted', 'bought', 'dropped')),
  bought_at     date,
  bought_price  numeric,
  reserved_by   uuid references auth.users(id) on delete set null,
  last_checked  date not null default current_date,
  created_at    timestamptz not null default now()
);

create index if not exists wish_items_user_idx  on wish_items(user_id);
create index if not exists wish_items_space_idx on wish_items(space_id);

alter table wish_items enable row level security;

drop policy if exists wish_items_owner on wish_items;
create policy wish_items_owner on wish_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Household members can read what is shared into their space.
drop policy if exists wish_items_select_space on wish_items;
create policy wish_items_select_space on wish_items
  for select using (space_id is not null and is_space_member(space_id, auth.uid()));

-- A partner claims (or un-claims) a shared wish without being able to edit it.
create or replace function claim_wish(wish_id uuid, claim boolean)
returns void language plpgsql security definer set search_path = public as $$
declare w wish_items;
begin
  select * into w from wish_items where id = wish_id;
  if w.id is null or w.space_id is null or w.user_id = auth.uid()
     or not is_space_member(w.space_id, auth.uid()) then
    raise exception 'not allowed';
  end if;
  if claim then
    update wish_items set reserved_by = auth.uid() where id = wish_id and reserved_by is null;
  else
    update wish_items set reserved_by = null where id = wish_id and reserved_by = auth.uid();
  end if;
end $$;

grant execute on function claim_wish(uuid, boolean) to authenticated;

-- Carry the old wishlist forward.
insert into wish_items (user_id, name, notes, last_checked, created_at)
select user_id, name, note, coalesce(last_checked::date, current_date), coalesce(created_at, now())
from watch_items
where type = 'price'
  and not exists (select 1 from wish_items w where w.user_id = watch_items.user_id and w.name = watch_items.name);
