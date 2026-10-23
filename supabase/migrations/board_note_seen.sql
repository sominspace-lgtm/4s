-- Notice board note, fixed and with "seen" (2026-10-23).
-- 1. Either of you can post. Writing straight to shared_spaces only worked
--    for the household's owner (its update rule is owner-only), so the other
--    person's note silently never saved. Posting goes through this function.
-- 2. When the other one reads it, it is marked seen, so the one who wrote it
--    sees "Seen". A new note clears that again.
-- Safe to run twice.

alter table shared_spaces add column if not exists board_note_seen_by uuid references auth.users(id) on delete set null;
alter table shared_spaces add column if not exists board_note_seen_at timestamptz;

create or replace function set_board_note(p_space uuid, p_note text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_space_member(p_space, auth.uid()) then raise exception 'not a member'; end if;
  update shared_spaces
     set board_note = nullif(btrim(left(coalesce(p_note, ''), 160)), ''),
         board_note_by = auth.uid(),
         board_note_at = now(),
         board_note_seen_by = null,
         board_note_seen_at = null
   where id = p_space;
end $$;

create or replace function see_board_note(p_space uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_space_member(p_space, auth.uid()) then raise exception 'not a member'; end if;
  update shared_spaces
     set board_note_seen_by = auth.uid(), board_note_seen_at = now()
   where id = p_space
     and board_note is not null
     and board_note_by is distinct from auth.uid()
     and board_note_seen_at is null;
end $$;

revoke all on function set_board_note(uuid, text) from public, anon;
revoke all on function see_board_note(uuid) from public, anon;
grant execute on function set_board_note(uuid, text) to authenticated;
grant execute on function see_board_note(uuid) to authenticated;
