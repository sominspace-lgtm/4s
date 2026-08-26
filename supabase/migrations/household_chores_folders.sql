-- Chores get an optional folder (2026-08-26) — same free-text grouping idea
-- as household_shopping.category, but user-defined rather than a fixed
-- aisle list: chores are custom-named things ("Somi's Care") that don't
-- share one preset taxonomy the way grocery aisles do, so people need to
-- name their own ("Somi", "Car", "Seasonal") as they go.
alter table household_chores add column if not exists folder text;
