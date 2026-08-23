'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UnderstandingEntry {
  id: string
  user_id: string
  space_id: string
  area: string
  topic: string
  answer: string
  created_at: string
  updated_at: string
}

// "Understanding each other" (2026-08-22) — how you each show care,
// communicate, handle conflict, recharge. Same read-both/write-own shape as
// useCheckins: you can see your partner's answers, but setAnswer() can only
// ever write your own row (relationship_understanding's RLS enforces this
// server-side too — this is convenience, not the actual boundary).
export function useUnderstanding(spaceId: string | null) {
  const supabase = createClient()
  const [entries, setEntries] = useState<UnderstandingEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!spaceId) { setEntries([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('relationship_understanding')
      .select('*').eq('space_id', spaceId).order('area').order('topic')
    setEntries((data as UnderstandingEntry[] | null) ?? [])
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  // Upserts on (space_id, user_id, area, topic) — re-answering a topic
  // refines it in place, matching the table's own unique constraint.
  async function setAnswer(area: string, topic: string, answer: string): Promise<string | null> {
    if (!spaceId) return 'No shared space'
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const { data, error } = await supabase.from('relationship_understanding')
      .upsert(
        { user_id: user.id, space_id: spaceId, area, topic, answer, updated_at: new Date().toISOString() },
        { onConflict: 'space_id,user_id,area,topic' },
      )
      .select().single()
    if (error) return error.message
    setEntries(prev => {
      const next = prev.filter(e => !(e.user_id === user.id && e.area === area && e.topic === topic))
      return [...next, data as UnderstandingEntry]
    })
    return null
  }

  async function removeAnswer(id: string) {
    await supabase.from('relationship_understanding').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  return { entries, loading, setAnswer, removeAnswer }
}
