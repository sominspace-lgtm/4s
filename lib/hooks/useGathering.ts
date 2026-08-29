'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'

// Guest Mode (2026-08-29, "4S VILLAGE — GUEST MODE"). One row in `gatherings`
// with active=true, per shared space, IS "the village is open to guests".
// Guests never hold a Supabase session — their writes come through
// /api/g/[token] with the admin client, and land in `guest_contributions`.
// The household side (this hook) reads/writes with the browser client; the
// RLS `_space` policies let any accepted member do so.
//
// Modeled on useSharedVillageLayout: same space-resolution rule, a realtime
// channel per space, and every write is awaited (the round-69 lazy-builder
// bug — `void supabase.from().insert()` silently never fires).

export interface Gathering {
  id: string
  space_id: string
  title: string
  token: string
  music_url: string | null
  active: boolean
  started_at: string
  closes_at: string | null
}

export interface GuestContribution {
  id: string
  gathering_id: string
  space_id: string
  kind: 'photo' | 'thank_you' | 'guestbook' | 'note' | 'song' | 'from' | 'fridge'
  guest_name: string | null
  body: string | null
  media_path: string | null
  meta: Record<string, unknown>
  upvotes: number
  status: 'visible' | 'hidden'
  created_at: string
}

function makeToken(): string {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export interface UseGathering {
  /** null = Guest Mode is off (or no shared space / migration not run). */
  gathering: Gathering | null
  contributions: GuestContribution[]
  ready: boolean
  startGathering: (title: string) => Promise<void>
  closeGathering: () => Promise<void>
  setMusicUrl: (url: string) => Promise<void>
  moderate: (id: string, status: 'visible' | 'hidden') => Promise<void>
  removeContribution: (id: string) => Promise<void>
}

export function useGathering(userId: string): UseGathering {
  const supabase = createClient()
  const { spaces, members } = useSharedSpaces(userId)
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id ?? null

  const [gathering, setGathering] = useState<Gathering | null>(null)
  const [contributions, setContributions] = useState<GuestContribution[]>([])
  const [ready, setReady] = useState(false)
  const spaceRef = useRef<string | null>(null)
  const gatheringRef = useRef<Gathering | null>(null)
  gatheringRef.current = gathering

  const loadContributions = useCallback(async (gatheringId: string) => {
    const { data } = await supabase
      .from('guest_contributions')
      .select('*')
      .eq('gathering_id', gatheringId)
      .order('created_at', { ascending: true })
    setContributions((data as GuestContribution[] | null) ?? [])
  }, [supabase])

  useEffect(() => {
    spaceRef.current = spaceId
    if (!spaceId) { setGathering(null); setContributions([]); setReady(true); return }
    let alive = true

    ;(async () => {
      const { data, error } = await supabase
        .from('gatherings')
        .select('*')
        .eq('space_id', spaceId)
        .eq('active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!alive) return
      if (error) { setGathering(null); setReady(true); return } // migration not run
      const g = (data as Gathering | null) ?? null
      setGathering(g)
      if (g) await loadContributions(g.id)
      setReady(true)
    })()

    const ch = supabase
      .channel(`gatherings:${spaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gatherings', filter: `space_id=eq.${spaceId}` },
        payload => {
          if (!alive) return
          const row = (payload.new as Gathering | null)
          if (row && row.active) { setGathering(row); void loadContributions(row.id) }
          else setGathering(prev => (prev && row && prev.id === row.id ? null : prev))
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guest_contributions', filter: `space_id=eq.${spaceId}` },
        payload => {
          if (!alive) return
          const g = gatheringRef.current
          if (!g) return
          const row = payload.new as GuestContribution | null
          const old = payload.old as { id?: string } | null
          if (payload.eventType === 'DELETE') {
            setContributions(prev => prev.filter(c => c.id !== old?.id))
            return
          }
          if (!row || row.gathering_id !== g.id) return
          setContributions(prev => {
            const rest = prev.filter(c => c.id !== row.id)
            return [...rest, row].sort((a, b) => a.created_at.localeCompare(b.created_at))
          })
        },
      )
      .subscribe()

    return () => { alive = false; supabase.removeChannel(ch) }
  }, [supabase, spaceId, loadContributions])

  const startGathering = useCallback(async (title: string) => {
    const sid = spaceRef.current
    if (!sid) return
    const { data, error } = await supabase
      .from('gatherings')
      .insert({ space_id: sid, created_by: userId, title: title.trim() || 'Our gathering', token: makeToken() })
      .select('*')
      .single()
    if (error) { console.error('[4s] startGathering failed:', error.message); return }
    setGathering(data as Gathering)
    setContributions([])
  }, [supabase, userId])

  const closeGathering = useCallback(async () => {
    const g = gatheringRef.current
    if (!g) return
    const { error } = await supabase.from('gatherings').update({ active: false }).eq('id', g.id)
    if (error) { console.error('[4s] closeGathering failed:', error.message); return }
    setGathering(null)
  }, [supabase])

  const setMusicUrl = useCallback(async (url: string) => {
    const g = gatheringRef.current
    if (!g) return
    const clean = url.trim() || null
    const { error } = await supabase.from('gatherings').update({ music_url: clean }).eq('id', g.id)
    if (!error) setGathering(prev => (prev ? { ...prev, music_url: clean } : prev))
  }, [supabase])

  const moderate = useCallback(async (id: string, status: 'visible' | 'hidden') => {
    const { error } = await supabase.from('guest_contributions').update({ status }).eq('id', id)
    if (!error) setContributions(prev => prev.map(c => (c.id === id ? { ...c, status } : c)))
  }, [supabase])

  const removeContribution = useCallback(async (id: string) => {
    const { error } = await supabase.from('guest_contributions').delete().eq('id', id)
    if (!error) setContributions(prev => prev.filter(c => c.id !== id))
  }, [supabase])

  return { gathering, contributions, ready, startGathering, closeGathering, setMusicUrl, moderate, removeContribution }
}
