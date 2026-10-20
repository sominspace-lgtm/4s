import type { SupabaseClient } from '@supabase/supabase-js'

// Little wins (2026-10-20): chores and routines only keep their LAST done
// date, so a feed needs its own log. Every "done" in a shared household
// writes one line here. It never blocks the thing you just did: a failure to
// log is swallowed.
export type WinKind = 'chore' | 'routine' | 'meal' | 'win'

export async function logWin(
  supabase: SupabaseClient, spaceId: string | null | undefined, userId: string, kind: WinKind, title: string,
): Promise<void> {
  if (!spaceId || !title.trim()) return
  try {
    const { error } = await supabase.from('household_wins').insert({ space_id: spaceId, user_id: userId, kind, title: title.trim().slice(0, 200) })
    if (!error && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('4s:wins-changed'))
  } catch { /* the feed is a nicety, never a blocker */ }
}
