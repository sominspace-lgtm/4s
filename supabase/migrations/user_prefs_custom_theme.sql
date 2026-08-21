-- Custom themes (2026-08-21): replaces "pick one of 6 presets" with a real
-- color + font editor (see lib/constants/themes.ts's buildCustomVars). The
-- seed is small on purpose — six colors and a font pairing, not a raw
-- 36-variable dump — everything else is derived at render time. Run in the
-- Supabase SQL Editor.
--
-- theme = 'custom' is what tells the app to read this column instead of a
-- THEMES preset; that value works today even before this migration runs
-- (normalizeTheme() already recognises it), it just has nothing to read
-- until this column exists.

alter table user_prefs add column if not exists custom_theme jsonb;
