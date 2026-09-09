-- Village follow-ups (2026-09-08): a host's pinned line on the info board,
-- and guests recommending a place.

-- 1. One short line the host pins to the info board for the night ("cake in
--    10", "we're in the backyard"). Per-gathering, so it's gone when the
--    party ends.
alter table gatherings add column if not exists pinned_note text;

-- 2. A guest can recommend a place they love. Same guest-contribution table
--    as every other guest write; just a new kind. Rebuild the check so it
--    covers everything shipped so far plus 'spot'.
alter table guest_contributions drop constraint if exists guest_contributions_kind_check;
alter table guest_contributions add constraint guest_contributions_kind_check
  check (kind in ('photo','thank_you','guestbook','note','song','from','fridge','wish','spot'));
