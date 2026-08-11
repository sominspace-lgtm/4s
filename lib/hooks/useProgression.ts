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
//
// UNLOCK BY RELEVANCE, NOT BY QUOTA (2026-08-07 rework): the original list
// gated Money behind "check off a habit" and Shared behind "complete a task"
// — no causal story a user could construct, just quota-filling. Money and
// Calendar are utilities people may need on day one (a subscription renews,
// a deadline exists) and must never be gated. Shared already carried a
// comment saying it was "surfaced early so shared items aren't an
// afterthought" while simultaneously being locked behind a milestone — that
// contradiction is gone now too. What's left only gates the one section
// where the milestone genuinely produces the content that section exists to
// show: Personal (habits/life/money/people/council — components/personal/PersonalHub)
// needs either a habit or a capture to have anything to show at all.
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

// Sections that are never gated — utilities someone may need from minute one,
// or (People) a place incoming shared items must always be reachable.
export const NEVER_GATED = new Set(['village', 'household'])

/** Sections that are open from the first login and never counted as something
 *  "to unlock": Today, Tasks, Village, Household. Kept as a named constant
 *  because it's used twice below to size the journey bar — when it was a bare
 *  `4` in both places, adding a section silently made the bar report the
 *  wrong total. */
const ALWAYS_OPEN_COUNT = 4

export const UNLOCK_STAGES: UnlockStage[] = [
  {
    id: 'personal', label: 'Personal', icon: '◈',
    teaser: 'Habits, Life, Money, People and the Council — all in one place.',
    milestone: 'Track a habit or capture a thought',
    action: 'habit',
    isDone: c => c.habits >= 1 || c.captures >= 1,
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
    if (unlockAll || loading || NEVER_GATED.has(sectionId)) return true
    const stage = UNLOCK_STAGES.find(s => s.id === sectionId)
    if (!stage) return true // unknown/new sections never get locked by accident
    return stage.isDone(safeCounts)
  }

  const stagesWithStatus = UNLOCK_STAGES.map(s => ({ ...s, done: s.isDone(safeCounts) }))
  // Personal is the only gated stage; everything in ALWAYS_OPEN_COUNT is
  // open from the start and never counted as "to unlock".
  const unlockedCount = ALWAYS_OPEN_COUNT + stagesWithStatus.filter(s => s.done).length
  const total = ALWAYS_OPEN_COUNT + UNLOCK_STAGES.length
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
