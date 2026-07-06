-- Code-based Alexa linking (replaces reliance on Amazon's account-linking UI).
-- Every Alexa request carries a stable anonymous user id
-- (context.System.user.userId, an amzn1.ask.account.* string). The user links
-- once by speaking a short code shown in the app: the webhook matches the code
-- to a 4S user, then binds that Alexa user id to them.

-- Bind an Alexa account to a 4S user. (alexa_links may already exist from the
-- earlier OAuth attempt; add the column if so.)
create table if not exists alexa_links (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  token      text,
  created_at timestamptz not null default now()
);
alter table alexa_links add column if not exists alexa_user_id text;
alter table alexa_links alter column token drop not null;

-- one Alexa account maps to at most one 4S user
create unique index if not exists alexa_links_alexa_user_id_key
  on alexa_links (alexa_user_id) where alexa_user_id is not null;

alter table alexa_links enable row level security;
drop policy if exists "own alexa link select" on alexa_links;
create policy "own alexa link select" on alexa_links for select using (auth.uid() = user_id);
drop policy if exists "own alexa link delete" on alexa_links;
create policy "own alexa link delete" on alexa_links for delete using (auth.uid() = user_id);

-- Short-lived pairing codes generated in the app.
create table if not exists alexa_link_codes (
  code       text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table alexa_link_codes enable row level security;
-- The webhook reads codes with the service-role client; the app writes its own.
drop policy if exists "own alexa code all" on alexa_link_codes;
create policy "own alexa code all" on alexa_link_codes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
