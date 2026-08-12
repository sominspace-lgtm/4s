-- domain_touched — backfilled into the repo 2026-08-11 (see
-- household_rules_inventory.sql for why this keeps happening: pasted into
-- the SQL editor directly and never committed).
--
-- Tracks the last day each Life-domain tile was opened, purely so DomainTile
-- can show "reviewed 3 days ago" instead of nothing. The unique constraint on
-- (user_id, domain_id) is not optional decoration — lib/hooks/useDomainTouched.ts
-- upserts with onConflict: 'user_id,domain_id', and without this constraint
-- that upsert has no conflict target to resolve against, so every touch
-- inserts a new row instead of updating the existing one.
--
-- If this table already exists live with a different shape, run only the
-- ALTER block below against it rather than the CREATE.

create table if not exists domain_touched (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  domain_id     text not null,
  last_touched  date not null,
  unique (user_id, domain_id)
);

alter table domain_touched enable row level security;

drop policy if exists "domain_touched_own" on domain_touched;
create policy "domain_touched_own" on domain_touched
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists domain_touched_user_idx on domain_touched(user_id);

-- Run this instead of the CREATE above if the table already exists without
-- the constraint the upsert needs:
--   alter table domain_touched add constraint domain_touched_user_domain_key unique (user_id, domain_id);
