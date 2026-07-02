'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO, differenceInCalendarDays, addDays } from 'date-fns'

export type ScheduleType = 'daily' | 'interval' | 'weekly'

export interface Habit {
  id: string
  name: string
  category: string | null
  schedule_type: ScheduleType
  interval_days: number | null
  days_of_week: number[] | null
  paused: boolean
}

const DOW_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function scheduleSummary(habit: Habit): string {
  if (habit.paused) return 'Paused'
  if (habit.schedule_type === 'daily') return 'Every day'
  if (habit.schedule_type === 'weekly') {
    const days = habit.days_of_week ?? []
    if (days.length === 0) return 'Weekly'
    if (days.length === 1) return `Weekly · ${DOW_LABEL[days[0]]}`
    return days.slice().sort().map(d => DOW_LABEL[d]).join('/')
  }
  const n = habit.interval_days ?? 1
  if (n === 1) return 'Every day'
  if (n === 2) return 'Every other day'
  if (n === 7) return 'Every week'
  if (n === 14) return 'Every 2 weeks'
  return `Every ${n} days`
}

// Is this habit due on `dateStr` (yyyy-MM-dd), given its completion history?
export function isDueOn(habit: Habit, dateStr: string, completions: string[]): boolean {
  if (habit.paused) return false
  if (habit.schedule_type === 'daily') return true
  if (habit.schedule_type === 'weekly') {
    const dow = parseISO(dateStr).getDay()
    return (habit.days_of_week ?? []).includes(dow)
  }
  // interval: due if never completed, or if enough days have passed since
  // the most recent completion before (or on) this date.
  const n = habit.interval_days ?? 1
  const priorCompletions = completions.filter(d => d <= dateStr).sort()
  const last = priorCompletions[priorCompletions.length - 1]
  if (!last) return true
  return differenceInCalendarDays(parseISO(dateStr), parseISO(last)) >= n
}

export function nextDueDate(habit: Habit, completions: string[]): string | null {
  if (habit.paused) return null
  const today = format(new Date(), 'yyyy-MM-dd')
  for (let i = 0; i < 21; i++) {
    const d = format(addDays(new Date(), i), 'yyyy-MM-dd')
    if (isDueOn(habit, d, completions)) return d
  }
  return today
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

  // See useWorkItems.ts for why this exists — this hook is called
  // independently in several places (Habits section, Brief summary card),
  // so a mutation in one instance needs to tell the others to reload.
  useEffect(() => {
    function onChanged() { fetch() }
    window.addEventListener('4s:habits-changed', onChanged)
    return () => window.removeEventListener('4s:habits-changed', onChanged)
  }, [fetch])

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
    window.dispatchEvent(new CustomEvent('4s:habits-changed'))
  }

  interface ScheduleInput {
    schedule_type?: ScheduleType
    interval_days?: number | null
    days_of_week?: number[] | null
  }

  async function addHabit(name: string, category: string, schedule?: ScheduleInput) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('habits').insert({
      name, category: category || null, user_id: user.id,
      schedule_type: schedule?.schedule_type ?? 'daily',
      interval_days: schedule?.interval_days ?? null,
      days_of_week: schedule?.days_of_week ?? null,
    }).select().single()
    if (data) setHabits(prev => [...prev, data])
    window.dispatchEvent(new CustomEvent('4s:habits-changed'))
  }

  async function updateSchedule(id: string, schedule: ScheduleInput) {
    await supabase.from('habits').update(schedule).eq('id', id)
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...schedule } as Habit : h))
    window.dispatchEvent(new CustomEvent('4s:habits-changed'))
  }

  async function togglePaused(id: string) {
    const habit = habits.find(h => h.id === id)
    if (!habit) return
    const paused = !habit.paused
    await supabase.from('habits').update({ paused }).eq('id', id)
    setHabits(prev => prev.map(h => h.id === id ? { ...h, paused } : h))
    window.dispatchEvent(new CustomEvent('4s:habits-changed'))
  }

  async function deleteHabit(id: string) {
    await supabase.from('habits').delete().eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
    setCompletions(prev => { const n = { ...prev }; delete n[id]; return n })
    window.dispatchEvent(new CustomEvent('4s:habits-changed'))
  }

  return { habits, completions, loading, toggleDay, addHabit, updateSchedule, togglePaused, deleteHabit }
}
