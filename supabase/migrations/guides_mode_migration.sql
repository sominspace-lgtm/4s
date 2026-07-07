-- Migrate legacy personality "modes" to the 9 Guides.
-- Run once in the Supabase SQL Editor. Safe + idempotent: only rewrites the
-- six retired values; the four kept Guides (peaceful/teacher/friend/monk) and
-- NULL (new users default to Peaceful in the app) are left untouched.
--
-- Mapping:
--   balanced -> peaceful   (new calm default)
--   harsh    -> challenger (direct + accountable)
--   coach    -> executive  (action / high-signal)
--   ceo      -> executive
--   hype     -> friend      (warm + encouraging)
--   gamer    -> friend      (XP mode retired)

update user_prefs
set mode = case mode
  when 'balanced' then 'peaceful'
  when 'harsh'    then 'challenger'
  when 'coach'    then 'executive'
  when 'ceo'      then 'executive'
  when 'hype'     then 'friend'
  when 'gamer'    then 'friend'
  else mode
end
where mode in ('balanced', 'harsh', 'coach', 'ceo', 'hype', 'gamer');
