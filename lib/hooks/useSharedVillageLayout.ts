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
 *
 * Round 69 fixes: the writes were `void supabase.from(...).upsert(...)` with
 * no `.then()`/`await` — a PostgREST builder is lazy, so those requests
 * never actually fired and `village_layout` stayed empty forever. Every
 * write now executes and is awaited, errors surface and fall back to the
 * personal save, drags are debounced, and the row is also mirrored into the
 * personal blob so a lost/empty shared row can always be re-seeded.
 */
export function useSharedVillageLayout(
  userId: string,
  fallbackLayout: VillageLayout,
  saveFallback: (next: VillageLayout) => void | Promise<void>,
): { layout: VillageLayout; setLayout: (next: VillageLayout) => void; shared: boolean } {
  const supabase = createClient()
  const { spaces, members } = useSharedSpaces(userId)

  // The couple's space — the first one with an accepted member, exactly the
  // rule HouseholdHub uses, so the village and the household share a space.
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id ?? null

  const [shared, setShared] = useState<VillageLayout | null>(null)
  const spaceRef = useRef<string | null>(null)
  const saveFallbackRef = useRef(saveFallback)
  saveFallbackRef.current = saveFallback
  // Latest personal layout, so a fresh shared row can always be seeded from
  // it (not just from a snapshot taken at first render).
  const fallbackRef = useRef(fallbackLayout)
  fallbackRef.current = fallbackLayout
  // Serialised copy of what we last wrote, so the realtime channel doesn't
  // echo our own write straight back and clobber a newer local edit.
  const lastWriteRef = useRef<string>('')
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<VillageLayout | null>(null)

  const writeShared = useCallback(async (sid: string, next: VillageLayout) => {
    lastWriteRef.current = JSON.stringify(next)
    const { error } = await supabase.from('village_layout').upsert({
      space_id: sid, layout: next, updated_by: userId, updated_at: new Date().toISOString(),
    })
    if (error) {
      console.error('[4s] village layout shared save failed, falling back to personal:', error.message)
      await saveFallbackRef.current(next)
    } else {
      // Mirror into the personal blob too — cheap insurance so the shared
      // row can be re-seeded if it's ever cleared.
      void saveFallbackRef.current(next)
    }
  }, [supabase, userId])

  useEffect(() => {
    spaceRef.current = spaceId
    if (!spaceId) { setShared(null); return }
    let alive = true
    ;(async () => {
      const { data, error } = await supabase
        .from('village_layout').select('layout').eq('space_id', spaceId).maybeSingle()
      if (!alive) return
      if (error) { setShared(null); return } // migration not run — stay on fallback
      const row = data?.layout as VillageLayout | undefined
      if (row && Object.keys(row).length) {
        setShared(row)
      } else {
        // No usable shared row yet — seed it from whatever this person
        // already had arranged personally, so switching to the shared model
        // never silently resets the village to defaults.
        const seed = fallbackRef.current && Object.keys(fallbackRef.current).length ? fallbackRef.current : {}
        setShared(seed)
        if (Object.keys(seed).length) await writeShared(spaceId, seed)
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
          if (!next) return
          // Skip the echo of our own most recent write.
          if (JSON.stringify(next) === lastWriteRef.current) return
          setShared(next)
        },
      )
      .subscribe()
    return () => { alive = false; supabase.removeChannel(ch); if (flushTimer.current) clearTimeout(flushTimer.current) }
  }, [supabase, spaceId, writeShared])

  const setLayout = useCallback((next: VillageLayout) => {
    const sid = spaceRef.current
    if (!sid) { void saveFallbackRef.current(next); return }
    // Optimistic local update, debounced remote write so a drag (dozens of
    // calls) collapses into one or two round-trips.
    setShared(next)
    pendingRef.current = next
    if (flushTimer.current) clearTimeout(flushTimer.current)
    flushTimer.current = setTimeout(() => {
      const p = pendingRef.current
      pendingRef.current = null
      if (p) void writeShared(sid, p)
    }, 400)
  }, [writeShared])

  return {
    layout: spaceId && shared !== null ? shared : fallbackLayout,
    setLayout,
    shared: !!spaceId && shared !== null,
  }
}
