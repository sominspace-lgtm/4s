-- Guides 9 → 5 consolidation (2026-07). Optional cleanup: the app normalizes
-- legacy values at read time (normalizeMode in lib/constants/modes.ts), so
-- nothing breaks if this never runs — it just keeps stored data tidy.
--
-- monk → peaceful, teacher → therapist, navigator → executive, butler → friend

update user_prefs set mode = 'peaceful'  where mode = 'monk';
update user_prefs set mode = 'therapist' where mode = 'teacher';
update user_prefs set mode = 'executive' where mode = 'navigator';
update user_prefs set mode = 'friend'    where mode = 'butler';
