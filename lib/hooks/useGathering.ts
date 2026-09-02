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

export interface PrepItem { id: string; text: string; done: boolean }

export interface Gathering {
  id: string
  space_id: string
  title: string
  token: string
  music_url: string | null
  photo_album_url: string | null
  active: boolean
  /** 'prep' = hosts getting ready (calm scene, prep checklist on the wall);
   *  'live' = doors open (welcome QR, warm scene). */
  phase: 'prep' | 'live'
  starts_at: string | null
  prep: PrepItem[]
  started_at: string
  closes_at: string | null
}

const DEFAULT_PREP: Omit<PrepItem, 'id'>[] = [
  { text: 'Tidy the main rooms', done: false },
  { text: 'Set the table', done: false },
  { text: 'Start the playlist', done: false },
  { text: 'Make the photo album', done: false },
  { text: 'Chill the drinks', done: false },
]

export interface GuestInfo {
  wifiName?: string
  wifiPassword?: string
  /** Free text: bathroom, help yourself to drinks, house rules, etc. */
  notes?: string
}

export interface GatheringMemory {
  id: string
  space_id: string
  gathering_id: string | null
  title: string
  happened_on: string
  /** Unguessable id for the public /keepsake/<token> page. */
  token: string | null
  /** Optional grouping label, e.g. "Sunday dinners". */
  series: string | null
  summary: {
    guests?: string[]
    songs?: string[]
    messages?: { name: string | null; text: string }[]
    fromPlaces?: string[]
    photoAlbumUrl?: string | null
    photoCount?: number
  }
  status: 'visible' | 'hidden'
  created_at: string
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
  /** "Tonight at the Village" keepsakes from gatherings that have ended. */
  memories: GatheringMemory[]
  ready: boolean
  startGathering: (title: string, opts?: { startsAt?: string | null; phase?: 'prep' | 'live' }) => Promise<void>
  /** Replace the prep checklist. */
  updatePrep: (items: PrepItem[]) => Promise<void>
  /** Move a prep gathering to 'live' — the doors are open. */
  openDoors: () => Promise<void>
  /** Ends the gathering AND writes a keepsake snapshot. Returns the memory
   *  so the host can open it straight into an editor. */
  closeGathering: () => Promise<GatheringMemory | null>
  setMusicUrl: (url: string) => Promise<void>
  setPhotoAlbumUrl: (url: string) => Promise<void>
  moderate: (id: string, status: 'visible' | 'hidden') => Promise<void>
  removeContribution: (id: string) => Promise<void>
  updateMemory: (id: string, patch: Partial<Pick<GatheringMemory, 'title' | 'summary' | 'status' | 'series'>>) => Promise<void>
  deleteMemory: (id: string) => Promise<void>
  /** Set-once info shown to guests in the portal (wifi, house notes). */
  guestInfo: GuestInfo
  setGuestInfo: (info: GuestInfo) => Promise<void>
}

export function useGathering(userId: string): UseGathering {
  const supabase = createClient()
  const { spaces, members } = useSharedSpaces(userId)
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id ?? null

  const [gathering, setGathering] = useState<Gathering | null>(null)
  const [contributions, setContributions] = useState<GuestContribution[]>([])
  const [memories, setMemories] = useState<GatheringMemory[]>([])
  const [guestInfo, setGuestInfoState] = useState<GuestInfo>({})
  const [ready, setReady] = useState(false)
  const contribRef = useRef<GuestContribution[]>([])
  contribRef.current = contributions
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
    if (!spaceId) { setGathering(null); setContributions([]); setMemories([]); setReady(true); return }
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
      const { data: mem } = await supabase
        .from('gathering_memories')
        .select('*')
        .eq('space_id', spaceId)
        .order('happened_on', { ascending: false })
      if (alive) setMemories((mem as GatheringMemory[] | null) ?? [])
      const { data: sp } = await supabase.from('shared_spaces').select('guest_info').eq('id', spaceId).maybeSingle()
      if (alive) setGuestInfoState(((sp as { guest_info?: GuestInfo } | null)?.guest_info as GuestInfo | undefined) ?? {})
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
          // A guest showed up while we were still in prep — the doors are
          // effectively open, so flip the wall over to welcome mode.
          if (g.phase === 'prep') {
            setGathering(prev => (prev ? { ...prev, phase: 'live' } : prev))
            void supabase.from('gatherings').update({ phase: 'live' }).eq('id', g.id)
          }
        },
      )
      .subscribe()

    return () => { alive = false; supabase.removeChannel(ch) }
  }, [supabase, spaceId, loadContributions])

  const startGathering = useCallback(async (title: string, opts?: { startsAt?: string | null; phase?: 'prep' | 'live' }) => {
    const sid = spaceRef.current
    if (!sid) return
    const phase = opts?.phase ?? 'live'
    const { data, error } = await supabase
      .from('gatherings')
      .insert({
        space_id: sid, created_by: userId, title: title.trim() || 'Our gathering', token: makeToken(),
        phase, starts_at: opts?.startsAt ?? null,
        prep: phase === 'prep' ? DEFAULT_PREP.map(p => ({ ...p, id: crypto.randomUUID() })) : [],
      })
      .select('*')
      .single()
    if (error) { console.error('[4s] startGathering failed:', error.message); return }
    setGathering(data as Gathering)
    setContributions([])
  }, [supabase, userId])

  const updatePrep = useCallback(async (items: PrepItem[]) => {
    const g = gatheringRef.current
    if (!g) return
    setGathering(prev => (prev ? { ...prev, prep: items } : prev))
    const { error } = await supabase.from('gatherings').update({ prep: items }).eq('id', g.id)
    if (error) console.error('[4s] updatePrep failed:', error.message)
  }, [supabase])

  const openDoors = useCallback(async () => {
    const g = gatheringRef.current
    if (!g || g.phase === 'live') return
    setGathering(prev => (prev ? { ...prev, phase: 'live' } : prev))
    const { error } = await supabase.from('gatherings').update({ phase: 'live' }).eq('id', g.id)
    if (error) console.error('[4s] openDoors failed:', error.message)
  }, [supabase])

  const closeGathering = useCallback(async (): Promise<GatheringMemory | null> => {
    const g = gatheringRef.current
    if (!g) return null
    const cs = contribRef.current.filter(c => c.status === 'visible')
    const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])]
    const summary: GatheringMemory['summary'] = {
      guests: uniq(cs.map(c => c.guest_name)),
      songs: uniq(cs.filter(c => c.kind === 'song').map(c => (c.meta.title as string) || c.body || '')),
      messages: cs
        .filter(c => (c.kind === 'thank_you' || c.kind === 'guestbook' || c.kind === 'note') && c.body)
        .slice(0, 12)
        .map(c => ({ name: c.guest_name, text: c.body as string })),
      fromPlaces: uniq(cs.filter(c => c.kind === 'from').map(c => (c.meta.place as string) || c.body || '')),
      photoAlbumUrl: g.photo_album_url,
      photoCount: cs.filter(c => c.kind === 'photo').length,
    }
    const { error } = await supabase.from('gatherings').update({ active: false, closes_at: new Date().toISOString() }).eq('id', g.id)
    if (error) { console.error('[4s] closeGathering failed:', error.message); return null }
    setGathering(null)

    const on = new Date().toISOString().slice(0, 10)
    const token = crypto.randomUUID().replace(/-/g, '')
    const { data: mem, error: memErr } = await supabase
      .from('gathering_memories')
      .insert({ space_id: g.space_id, gathering_id: g.id, title: `Tonight at the Village — ${g.title}`, happened_on: on, summary, token })
      .select('*')
      .single()
    if (memErr) { console.error('[4s] memory save failed:', memErr.message); return null }
    const row = mem as GatheringMemory
    setMemories(prev => [row, ...prev])
    return row
  }, [supabase])

  const setMusicUrl = useCallback(async (url: string) => {
    const g = gatheringRef.current
    if (!g) return
    const clean = url.trim() || null
    const { error } = await supabase.from('gatherings').update({ music_url: clean }).eq('id', g.id)
    if (!error) setGathering(prev => (prev ? { ...prev, music_url: clean } : prev))
  }, [supabase])

  const setPhotoAlbumUrl = useCallback(async (url: string) => {
    const g = gatheringRef.current
    if (!g) return
    const clean = url.trim() || null
    const { error } = await supabase.from('gatherings').update({ photo_album_url: clean }).eq('id', g.id)
    if (!error) setGathering(prev => (prev ? { ...prev, photo_album_url: clean } : prev))
  }, [supabase])

  const moderate = useCallback(async (id: string, status: 'visible' | 'hidden') => {
    const { error } = await supabase.from('guest_contributions').update({ status }).eq('id', id)
    if (!error) setContributions(prev => prev.map(c => (c.id === id ? { ...c, status } : c)))
  }, [supabase])

  const removeContribution = useCallback(async (id: string) => {
    const { error } = await supabase.from('guest_contributions').delete().eq('id', id)
    if (!error) setContributions(prev => prev.filter(c => c.id !== id))
  }, [supabase])

  const updateMemory = useCallback(async (id: string, patch: Partial<Pick<GatheringMemory, 'title' | 'summary' | 'status' | 'series'>>) => {
    const { error } = await supabase.from('gathering_memories').update(patch).eq('id', id)
    if (!error) setMemories(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)))
  }, [supabase])

  const setGuestInfo = useCallback(async (info: GuestInfo) => {
    const sid = spaceRef.current
    if (!sid) return
    setGuestInfoState(info)
    const { error } = await supabase.from('shared_spaces').update({ guest_info: info }).eq('id', sid)
    if (error) console.error('[4s] setGuestInfo failed:', error.message)
  }, [supabase])

  const deleteMemory = useCallback(async (id: string) => {
    const { error } = await supabase.from('gathering_memories').delete().eq('id', id)
    if (!error) setMemories(prev => prev.filter(m => m.id !== id))
  }, [supabase])

  return {
    gathering, contributions, memories, ready,
    startGathering, updatePrep, openDoors, closeGathering, setMusicUrl, setPhotoAlbumUrl,
    moderate, removeContribution, updateMemory, deleteMemory,
    guestInfo, setGuestInfo,
  }
}
