-- Plan the week (2026-10-26): who takes each chore this week. null means
-- either of you. Safe to run twice.
alter table household_chores add column if not exists assigned_to uuid references auth.users(id) on delete set null;
