-- Household money glance (2026-10-19): the bills the two of you share, and a
-- simple "who paid" record so it stays even. Not budgeting. Both tables sit on
-- the shared space; either partner can read and add, same rule as care_logs.

create table if not exists household_bills (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  space_id    uuid not null references shared_spaces(id) on delete cascade,
  label       text not null,
  amount      numeric(12,2),
  due_day     integer not null check (due_day between 1 and 31),
  cadence     text not null default 'monthly' check (cadence in ('monthly', 'yearly')),
  due_month   integer check (due_month is null or due_month between 1 and 12),
  paid_month  text,
  created_at  timestamptz not null default now()
);

create table if not exists household_payments (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references shared_spaces(id) on delete cascade,
  paid_by     uuid not null references auth.users(id) on delete cascade,
  label       text not null,
  amount      numeric(12,2) not null check (amount > 0),
  kind        text not null default 'expense' check (kind in ('expense', 'settle')),
  paid_on     date not null default current_date,
  created_at  timestamptz not null default now()
);

alter table household_bills enable row level security;
alter table household_payments enable row level security;

drop policy if exists "household_bills_space" on household_bills;
create policy "household_bills_space" on household_bills
  for all to authenticated
  using (is_space_member(space_id, auth.uid()))
  with check (is_space_member(space_id, auth.uid()));

drop policy if exists "household_payments_space" on household_payments;
create policy "household_payments_space" on household_payments
  for all to authenticated
  using (is_space_member(space_id, auth.uid()))
  with check (is_space_member(space_id, auth.uid()));

create index if not exists household_bills_space_idx on household_bills (space_id);
create index if not exists household_payments_space_idx on household_payments (space_id, paid_on desc);
