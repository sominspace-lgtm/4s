-- Village batch C (2026-09-02): guest info, keepsake links, series.
--   guest_info — set-once practical info for guests, shown in the portal:
--     { wifiName, wifiPassword, notes }. Space-level, persists across
--     gatherings.
--   gathering_memories.token — an unguessable id for a public read-only
--     keepsake page (/keepsake/<token>), served via the admin client the
--     same way /g/<token> is. RLS is unchanged (space members only for the
--     browser client).
--   gathering_memories.series — an optional label ("Sunday dinners") that
--     groups keepsakes together in the panel.

alter table shared_spaces     add column if not exists guest_info jsonb not null default '{}'::jsonb;
alter table gathering_memories add column if not exists token text;
alter table gathering_memories add column if not exists series text;

update gathering_memories
  set token = translate(encode(gen_random_bytes(12), 'base64'), '+/=', '-_')
  where token is null;

create unique index if not exists idx_gathering_memories_token on gathering_memories(token);
