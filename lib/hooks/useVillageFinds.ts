'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { newFinds, parseFinds, type FindsState } from '@/lib/village/finds'

const LOCAL_KEY = 'village-finds'

function readLocal(now: Date): FindsState {
  try { return parseFinds(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? 'null'), now) } catch { return newFinds(now) }
}
function writeLocal(s: FindsState) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(s)) } catch { /* private mode */ }
}

/**
 * The village's little finds and the collection (2026-11-05), shared by the
 * couple the same way the village layout is: one row per shared space in
 * `village_idle` (supabase/migrations/village_idle.sql), live between both
 * screens. With no shared space, or before that migration, it saves on this
 * device instead.
 *
 * `now` ticks every minute so a find that comes due turns up on its own.
 */
export function useVillageFinds(userId: string) {
  const supabase = createClient()
  const { spaces, members } = useSharedSpaces(userId)
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id ?? null

  const [state, setState] = useState<FindsState | null>(null)
  const [now, setNow] = useState(() => new Date())
  const sharedRef = useRef(false)
  const lastWriteRef = useRef('')

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    const onVisible = () => { if (!document.hidden) setNow(new Date()) }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  useEffect(() => {
    let alive = true
    sharedRef.current = false
    if (!spaceId) { setState(readLocal(new Date())); return }
    ;(async () => {
      const { data, error } = await supabase.from('village_idle').select('state').eq('space_id', spaceId).maybeSingle()
      if (!alive) return
      if (error) { setState(readLocal(new Date())); return }
      sharedRef.current = true
      setState(data?.state ? parseFinds(data.state, new Date()) : readLocal(new Date()))
    })()
    const ch = supabase
      .channel(`village_idle:${spaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'village_idle', filter: `space_id=eq.${spaceId}` }, payload => {
        const next = (payload.new as { state?: unknown } | null)?.state
        if (!alive || !next || JSON.stringify(next) === lastWriteRef.current) return
        setState(parseFinds(next, new Date()))
      })
      .subscribe()
    return () => { alive = false; supabase.removeChannel(ch) }
  }, [supabase, spaceId])

  const save = useCallback((next: FindsState) => {
    setState(next)
    writeLocal(next)
    if (sharedRef.current && spaceId) {
      lastWriteRef.current = JSON.stringify(next)
      void supabase.from('village_idle')
        .upsert({ space_id: spaceId, state: next, updated_by: userId, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error('[4s] village finds save failed:', error.message) })
    }
  }, [supabase, spaceId, userId])

  return { state, now, save }
}
