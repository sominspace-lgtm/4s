-- A place can be flagged as having a bathroom without saving a code for it
-- (2026-09-17) — PlaceBathroomCode.tsx already covers "save the code"; this
-- is the lighter case, a park or a store where there's a bathroom but
-- nothing to remember about it. Independent of any code: this can be true
-- with no code saved, and a code can exist without this ever being
-- checked (PlaceBathroomCode sets it automatically when a code is saved,
-- so the two stay consistent without forcing the checkbox on someone who
-- only wants the code).

alter table places add column if not exists has_bathroom boolean not null default false;
