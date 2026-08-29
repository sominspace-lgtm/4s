'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import type { VillageLayout } from '@/lib/village/layout'

/**
 * The village layout, shared across the couple (round 62 — "the village
 * should be the same for everyone: if Sylvia rearranges or decorates it,
 * it shows like that on shared and on Harry's village too").
 *
 * It lives in `village_layout`, one row per shared space (see
 * supabase/migrations/shared_village_layout.sql), instead of per-user
 * `user_prefs.layout.villageLayout`. Both partners read and write the same
 * row, and a realtime subscription means one person's change appears on the
 * other's screen without a reload.
 *
 * When there's no shared space yet — or the migration hasn't been run — it
 * falls back to the personal layout + saver passed in, so nothing breaks.
 */
export function useSharedVillageLayout(
  userId: string,
  fallbackLayout: VillageLayout,
  saveFallback: (next: VillageLayout) => void | Promise<void>,
): { layout: VillageLayout; setLayout: (next: VillageLayout) => void; shared: boolean } {
  const supabase = createClient()
  const { spaces, members } = useSharedSpaces(userId)
  // Snapshot of whatever the person had arranged personally before the
  // village became shared — used once, to seed the space's first row so a
  // migration doesn't wipe their layout back to defaults.
  const seedRef = useRef(fallbackLayout)

  // The couple's space — the first one with an accepted member, exactly the
  // rule HouseholdHub uses, so the village and the household share a space.
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id ?? null

  const [shared, setShared] = useState<VillageLayout | null>(null)
  const spaceRef = useRef<string | null>(null)
  const saveFallbackRef = useRef(saveFallback)
  saveFallbackRef.current = saveFallback

  useEffect(() => {
    spaceRef.current = spaceId
    if (!spaceId) { setShared(null); return }
    let alive = true
    ;(async () => {
      const { data, error } = await supabase
        .from('village_layout').select('layout').eq('space_id', spaceId).maybeSingle()
      if (!alive) return
      if (error) { setShared(null); return } // migration not run — stay on fallback
      if (data?.layout) {
        setShared(data.layout as VillageLayout)
      } else {
        // No shared row yet — seed it from whatever this person already had
        // arranged personally, so switching to the shared model never
        // silently resets the village to defaults. Whoever opens it first
        // wins the seed; after that it's one shared row.
        const seed = seedRef.current && Object.keys(seedRef.current).length ? seedRef.current : {}
        setShared(seed)
        void supabase.from('village_layout').upsert({
          space_id: spaceId, layout: seed, updated_by: userId, updated_at: new Date().toISOString(),
        })
      }
    })()
    const ch = supabase
      .channel(`village_layout:${spaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'village_layout', filter: `space_id=eq.${spaceId}` },
        payload => {
          if (!alive) return
          const next = (payload.new as { layout?: VillageLayout } | null)?.layout
          if (next) setShared(next)
        },
      )
      .subscribe()
    return () => { alive = false; supabase.removeChannel(ch) }
  }, [supabase, spaceId])

  const setLayout = useCallback((next: VillageLayout) => {
    const sid = spaceRef.current
    if (sid) {
      setShared(next)
      void supabase.from('village_layout').upsert({
        space_id: sid, layout: next, updated_by: userId, updated_at: new Date().toISOString(),
      })
    } else {
      void saveFallbackRef.current(next)
    }
  }, [supabase, userId])

  return {
    layout: spaceId && shared !== null ? shared : fallbackLayout,
    setLayout,
    shared: !!spaceId && shared !== null,
  }
}
