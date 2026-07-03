-- Alexa account linking: one opaque token per user, issued by
-- /api/alexa/authorize (implicit grant) and validated by /api/alexa on every
-- skill request. Tokens map an Alexa session back to a 4S user without
-- exposing Supabase auth to Amazon.
create table if not exists alexa_links (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  token      text unique not null,
  created_at timestamptz not null default now()
);

alter table alexa_links enable row level security;

-- Users may see (and revoke) their own link; the token itself is only ever
-- read server-side via the service-role client in the skill webhook, so no
-- broad select policy is needed. A user can delete their own row to unlink.
drop policy if exists "own alexa link select" on alexa_links;
create policy "own alexa link select" on alexa_links
  for select using (auth.uid() = user_id);

drop policy if exists "own alexa link delete" on alexa_links;
create policy "own alexa link delete" on alexa_links
  for delete using (auth.uid() = user_id);
