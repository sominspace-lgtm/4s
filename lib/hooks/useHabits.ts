'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

export interface Habit {
  id: string
  name: string
  category: string | null
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const [{ data: h }, { data: c }] = await Promise.all([
      supabase.from('habits').select('*').order('created_at'),
      supabase.from('habit_completions').select('habit_id, completed_date'),
    ])
    if (h) setHabits(h)
    setLoading(false)
    if (c) {
      const map: Record<string, string[]> = {}
      c.forEach(({ habit_id, completed_date }) => {
        if (!map[habit_id]) map[habit_id] = []
        map[habit_id].push(completed_date)
      })
      setCompletions(map)
    }
  }, [supabase])

  useEffect(() => { fetch() }, [fetch])

  async function toggleDay(habitId: string, dateStr: string) {
    const dates = completions[habitId] || []
    const done = dates.includes(dateStr)

    if (done) {
      await supabase.from('habit_completions')
        .delete()
        .eq('habit_id', habitId)
        .eq('completed_date', dateStr)
      setCompletions(prev => ({ ...prev, [habitId]: prev[habitId].filter(d => d !== dateStr) }))
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('habit_completions').insert({ habit_id: habitId, completed_date: dateStr, user_id: user.id })
      setCompletions(prev => ({ ...prev, [habitId]: [...(prev[habitId] || []), dateStr] }))
      window.dispatchEvent(new CustomEvent('4s:xp', { detail: 10 }))
    }
  }

  async function addHabit(name: string, category: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('habits').insert({ name, category: category || null, user_id: user.id }).select().single()
    if (data) setHabits(prev => [...prev, data])
  }

  async function deleteHabit(id: string) {
    await supabase.from('habits').delete().eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
    setCompletions(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  return { habits, completions, loading, toggleDay, addHabit, deleteHabit }
}
