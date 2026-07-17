'use client'

import { useCallback, useEffect, useState } from 'react'

export interface SyncItem {
  id: string
  youConfirmed: boolean
  partnerConfirmed: boolean
}
export interface Checkin extends SyncItem { weekOf: string; status: 'completed' | 'pending'; completedBy: string[]; summary: string; date: string }
export interface TrackedItem extends SyncItem { title: string; type: 'watchlist' | 'gaming'; status: string }
export interface DateNightIdea extends SyncItem { title: string; notes: string; createdAt: string }
export interface OnThisDay extends SyncItem { text: string; date: string; yearsAgo: number }
export interface Photo { id: string; url: string; caption: string; date: string; source: string }

export type ConfirmableType = 'checkin' | 'tracked_item' | 'date_night' | 'on_this_day'

interface SummaryResponse {
  mocked?: boolean
  degraded?: boolean
  partner: { id: string; email: string } | null
  checkins: Checkin[]
  trackedItems: TrackedItem[]
  dateNightIdeas: DateNightIdea[]
  onThisDay: OnThisDay[]
  photos: Photo[]
}

const EMPTY: SummaryResponse = {
  degraded: true, partner: null,
  checkins: [], trackedItems: [], dateNightIdeas: [], onThisDay: [], photos: [],
}

export function useCompanionSync() {
  const [data, setData] = useState<SummaryResponse>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/companion/summary')
      if (!res.ok) { setData(EMPTY); setLoading(false); return }
      setData(await res.json())
    } catch {
      setData(EMPTY)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function confirm(itemType: ConfirmableType, itemId: string) {
    setConfirming(itemId)
    // Optimistic — flip youConfirmed locally so the click feels instant,
    // then reconcile with the server on the next load.
    setData(prev => ({
      ...prev,
      checkins: itemType === 'checkin' ? prev.checkins.map(i => i.id === itemId ? { ...i, youConfirmed: true } : i) : prev.checkins,
      trackedItems: itemType === 'tracked_item' ? prev.trackedItems.map(i => i.id === itemId ? { ...i, youConfirmed: true } : i) : prev.trackedItems,
      dateNightIdeas: itemType === 'date_night' ? prev.dateNightIdeas.map(i => i.id === itemId ? { ...i, youConfirmed: true } : i) : prev.dateNightIdeas,
      onThisDay: itemType === 'on_this_day' ? prev.onThisDay.map(i => i.id === itemId ? { ...i, youConfirmed: true } : i) : prev.onThisDay,
    }))
    try {
      await fetch('/api/companion/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType, itemId }),
      })
    } finally {
      setConfirming(null)
      load()
    }
  }

  return { ...data, loading, confirming, confirm, reload: load }
}
