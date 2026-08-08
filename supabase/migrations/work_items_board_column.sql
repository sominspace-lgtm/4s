-- Notice board (2026-08-07) — the physical board from the brief's Village
-- Notice Board vision: Small/Growing/Projects/Later columns instead of a
-- flat list. `board_column` is null by default; a task with no explicit
-- column falls back to a derived default (energy + due_date, see
-- lib/utils/boardColumn.ts) so existing tasks land somewhere sensible
-- without a backfill. It's only written when someone actually drags a card
-- or picks a column by hand — that's what makes it "yours" rather than
-- just another auto-sorted view.

alter table work_items add column if not exists board_column text
  check (board_column is null or board_column in ('small', 'growing', 'projects', 'later'));
