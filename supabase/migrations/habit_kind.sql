-- Things to avoid (2026-10-27). A habit with kind 'avoid' is something to
-- stay away from; its habit_completions rows are slips. Additive: every
-- existing habit keeps the default 'build'.
alter table habits add column if not exists kind text not null default 'build'
  check (kind in ('build', 'avoid'));
notify pgrst, 'reload schema';
