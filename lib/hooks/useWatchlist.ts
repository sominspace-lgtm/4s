'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type WatchlistDomain = 'media' | 'game'
export type WatchlistStatus = 'watchlist' | 'watching' | 'finished' | 'dropped'

export interface WatchlistItem {
  id: string
  space_id: string | null
  domain: WatchlistDomain
  title: string
  subtype: string | null
  status: WatchlistStatus
  created_at: string
  updated_at: string
}

// Games backlog + shows/movies watchlist (2026-08-22) — same table and
// status vocabulary the Discord bot's /track command already writes
// through to (household_watchlist, see lib/household/resources.ts).
// This is deliberately a separate concept from useLists: a list item is
// either done or not, but "what are we watching" needs a real status
// (watchlist → watching → finished, or dropped) — same shape as the
// bot's TrackedStatus enum, kept in sync on purpose.
export function useWatchlist(spaceId: string | null) {
  const supabase = createClient()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const scope = spaceId
      ? supabase.from('household_watchlist').select('*').eq('space_id', spaceId)
      : supabase.from('household_watchlist').select('*').is('space_id', null)
    const { data } = await scope.order('created_at')
    setItems((data as WatchlistItem[] | null) ?? [])
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  async function addItem(domain: WatchlistDomain, title: string, subtype?: string): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const { data, error } = await supabase.from('household_watchlist')
      .insert({ user_id: user.id, space_id: spaceId, domain, title, subtype: subtype || null })
      .select().single()
    if (error) return error.message
    setItems(prev => [...prev, data as WatchlistItem])
    return null
  }

  async function setStatus(id: string, status: WatchlistStatus) {
    const { error } = await supabase.from('household_watchlist')
      .update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) setItems(prev => prev.map(i => (i.id === id ? { ...i, status } : i)))
  }

  async function removeItem(id: string) {
    await supabase.from('household_watchlist').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return { items, loading, addItem, setStatus, removeItem }
}
