'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Progressive unlocking — a new account starts with just Brief + Tasks and
// grows the rest of the OS by DOING specific things, not by racking up raw
// activity. Each stage is one concrete milestone ("track a habit", "capture
// a thought"...), so the same actions onboarding already asks for (add a
// habit, jot a first thought) show up done on the very first dashboard load
// — nobody is asked to redo what they just did. Council is the one compound
// stage: it opens once every other milestone is true, framed as "you've
// tried the whole OS, the advisors are ready."
//
// No stored unlock state, no migration: unlock status is derived live from
// real row counts, so every existing account computes past every milestone
// instantly and sees the full app exactly as before.

export type ActionKey = 'task' | 'capture' | 'habit' | 'checkHabit' | 'completeTask'

export interface Counts {
  habits: number
  captures: number
  workItems: number
  workItemsDone: number
  habitCompletions: number
}

export interface UnlockStage {
  id: string          // section id (matches DEFAULT_SECTIONS / nav ids)
  label: string
  icon: string         // matches NAV_ICONS in SectionNav/BottomNav
  teaser: string        // the "why you want this" line
  milestone: string     // the action that unlocks it, in imperative voice
  action: ActionKey | null // null = compound (Council)
  isDone: (c: Counts) => boolean
}

export const UNLOCK_STAGES: UnlockStage[] = [
  {
    id: 'habits', label: 'Habits', icon: '◉',
    teaser: 'Build routines that actually stick.',
    milestone: 'Track your first habit',
    action: 'habit',
    isDone: c => c.habits >= 1,
  },
  {
    id: 'domains', label: 'Life', icon: '◇',
    teaser: 'See your whole life, one glance, 8 areas.',
    milestone: 'Capture a thought',
    action: 'capture',
    isDone: c => c.captures >= 1,
  },
  {
    id: 'calendar', label: 'Calendar', icon: '◎',
    teaser: 'Every deadline and event, laid out by day.',
    milestone: 'Add your first task',
    action: 'task',
    isDone: c => c.workItems >= 1,
  },
  {
    id: 'money', label: 'Money', icon: '✦',
    teaser: 'Subscriptions and refills — no surprises.',
    milestone: 'Check off a habit',
    action: 'checkHabit',
    isDone: c => c.habitCompletions >= 1,
  },
  {
    id: 'shared', label: 'Shared', icon: '⇆',
    teaser: 'Bring people you trust into parts of your life.',
    milestone: 'Complete a task',
    action: 'completeTask',
    isDone: c => c.workItemsDone >= 1,
  },
  {
    id: 'council', label: 'Council', icon: '⌂',
    teaser: '6 advisors, reviewing your life on demand.',
    milestone: "Try everything above — Council opens last",
    action: null,
    isDone: c => c.habits >= 1 && c.captures >= 1 && c.workItems >= 1 && c.habitCompletions >= 1 && c.workItemsDone >= 1,
  },
]

const REFRESH_EVENTS = [
  '4s:work-items-changed', '4s:captures-changed', '4s:habits-changed',
]

export function useProgression(unlockAll: boolean) {
  const supabase = createClient()
  // Start as "everything unlocked" until the first count lands — a returning
  // user must never watch their tabs vanish for a loading beat.
  const [counts, setCounts] = useState<Counts | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    const count = (table: string) =>
      supabase.from(table).select('id', { count: 'exact', head: true }).then(r => r.count ?? 0)
    const [habits, captures, workItems, workItemsDone, habitCompletions] = await Promise.all([
      count('habits'),
      count('captures'),
      count('work_items'),
      supabase.from('work_items').select('id', { count: 'exact', head: true }).eq('status', 'done').then(r => r.count ?? 0),
      count('habit_completions'),
    ])
    setCounts({ habits, captures, workItems, workItemsDone, habitCompletions })
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onChanged() {
      if (debounce.current) clearTimeout(debounce.current)
      debounce.current = setTimeout(load, 400)
    }
    REFRESH_EVENTS.forEach(e => window.addEventListener(e, onChanged))
    return () => {
      REFRESH_EVENTS.forEach(e => window.removeEventListener(e, onChanged))
      if (debounce.current) clearTimeout(debounce.current)
    }
  }, [load])

  const loading = counts === null
  const safeCounts: Counts = counts ?? { habits: 1, captures: 1, workItems: 1, workItemsDone: 1, habitCompletions: 1 }
  const done = unlockAll || (!loading && UNLOCK_STAGES.every(s => s.isDone(safeCounts)))

  const isUnlocked = (sectionId: string): boolean => {
    if (unlockAll || loading) return true
    const stage = UNLOCK_STAGES.find(s => s.id === sectionId)
    if (!stage) return true // unknown/new sections never get locked by accident
    return stage.isDone(safeCounts)
  }

  const stagesWithStatus = UNLOCK_STAGES.map(s => ({ ...s, done: s.isDone(safeCounts) }))
  const unlockedCount = 2 + stagesWithStatus.filter(s => s.done).length // + Brief, Tasks
  const total = 2 + UNLOCK_STAGES.length
  const next = stagesWithStatus.find(s => !s.done) ?? null

  return {
    loading,
    done,
    isUnlocked,
    stages: stagesWithStatus,
    unlockedCount,
    total,
    percent: Math.round((unlockedCount / total) * 100),
    next,
  }
}
