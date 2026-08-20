'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const HEARTBEAT_MS = 60_000
// A little over two heartbeats — one missed beat (a slow network, a tab
// throttled in the background) shouldn't flip someone from "online" to
// "gone", but two genuinely should.
const ONLINE_WITHIN_MS = 150_000

/**
 * Writes a heartbeat while mounted and enabled. Deliberately NOT run during
 * sharedMode: that session is backed by one real account regardless of who's
 * actually looking at the shared-device screen, so a heartbeat there would
 * misrepresent that specific person as "online" whenever anyone's glancing
 * at the household view — the opposite of what presence is supposed to mean.
 */
export function usePresenceHeartbeat(userId: string, spaceId: string | null, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !spaceId) return
    const supabase = createClient()
    const beat = () => {
      supabase.from('presence').upsert(
        { user_id: userId, space_id: spaceId, last_active_at: new Date().toISOString() },
        { onConflict: 'user_id,space_id' },
      )
    }
    beat()
    const id = setInterval(beat, HEARTBEAT_MS)
    // Also beat on return to the tab — otherwise someone who's been away
    // reads as "online" for up to a minute before the next scheduled beat.
    const onVisible = () => { if (!document.hidden) beat() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, spaceId, enabled])
}

export interface PartnerPresence {
  userId: string
  online: boolean
  lastActiveAt: string | null
}

/** Reads everyone else's presence in this space — "everyone else" rather
 *  than a single hardcoded partner, since nothing about presence itself
 *  needs to assume exactly two people. */
export function usePartnerPresence(userId: string, spaceId: string | null): PartnerPresence[] {
  const [presence, setPresence] = useState<PartnerPresence[]>([])

  useEffect(() => {
    if (!spaceId) { setPresence([]); return }
    const supabase = createClient()
    let cancelled = false

    async function load() {
      const { data } = await supabase
        .from('presence')
        .select('user_id, last_active_at')
        .eq('space_id', spaceId)
        .neq('user_id', userId)
      if (cancelled) return
      const now = Date.now()
      setPresence(((data as { user_id: string; last_active_at: string }[] | null) ?? []).map(r => ({
        userId: r.user_id,
        online: now - new Date(r.last_active_at).getTime() < ONLINE_WITHIN_MS,
        lastActiveAt: r.last_active_at,
      })))
    }

    load()
    // Re-derive "online" against the clock even if nothing in the DB
    // changed — the whole point of the window is that it expires on its own.
    const id = setInterval(load, HEARTBEAT_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [userId, spaceId])

  return presence
}
