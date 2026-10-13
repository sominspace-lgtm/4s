-- The kitchen (2026-10-13): a recipe book you can import into, meals that link
-- to recipes, a calorie log and a daily goal.

create table if not exists recipes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  space_id      uuid references shared_spaces(id) on delete set null,
  title         text not null,
  source_url    text,
  source_name   text,
  image_url     text,
  servings      numeric not null default 2 check (servings > 0),
  prep_minutes  int,
  cook_minutes  int,
  ingredients   jsonb not null default '[]',
  steps         jsonb not null default '[]',
  notes         text,
  tags          text[] not null default '{}',
  calories      numeric,
  protein       numeric,
  carbs         numeric,
  fat           numeric,
  rating        smallint check (rating between 1 and 5),
  favorite      boolean not null default false,
  times_cooked  int not null default 0,
  last_cooked   date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists recipes_user_idx  on recipes(user_id);
create index if not exists recipes_space_idx on recipes(space_id);
alter table recipes enable row level security;

-- Yours, plus anything shared into a household you are in; either of you can edit shared ones.
drop policy if exists recipes_access on recipes;
create policy recipes_access on recipes for all
  using (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())))
  with check (user_id = auth.uid() or (space_id is not null and is_space_member(space_id, auth.uid())));

-- Meals can cook a saved recipe.
alter table household_meals add column if not exists recipe_id uuid references recipes(id) on delete set null;
alter table household_meals add column if not exists servings numeric;

-- A personal calorie log and goal.
create table if not exists food_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  day         date not null default current_date,
  slot        text not null default 'snack' check (slot in ('breakfast', 'lunch', 'dinner', 'snack')),
  name        text not null,
  calories    numeric not null default 0,
  protein     numeric,
  carbs       numeric,
  fat         numeric,
  recipe_id   uuid references recipes(id) on delete set null,
  servings    numeric,
  created_at  timestamptz not null default now()
);
create index if not exists food_log_user_day_idx on food_log(user_id, day);
alter table food_log enable row level security;
drop policy if exists food_log_owner on food_log;
create policy food_log_owner on food_log for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table user_prefs add column if not exists calorie_goal int;
