-- Send a recipe to anyone by link (2026-10-13). No account needed to read it.
-- Only the owner can create or stop a link; the public page reads through the
-- server with the service role, scoped to that one recipe.

create table if not exists recipe_shares (
  token       text primary key,
  recipe_id   uuid not null references recipes(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists recipe_shares_recipe_idx on recipe_shares(recipe_id);
alter table recipe_shares enable row level security;
drop policy if exists recipe_shares_owner on recipe_shares;
create policy recipe_shares_owner on recipe_shares for all using (user_id = auth.uid()) with check (user_id = auth.uid());
