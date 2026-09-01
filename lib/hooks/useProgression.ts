'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Progressive unlocking — historically a new account started minimal and
// grew the OS by DOING things. As of 2026-09-01 there are no gated stages
// left (`UNLOCK_STAGES` is empty): every section is visible from the first
// login. The hook stays as a thin `isUnlocked() → true` so its two callers
// in DashboardClient don't need touching, and so a stage could be
// reintroduced here without rewiring anything.
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
  icon: string         // shown next to the milestone in JourneyBar
  teaser: string        // the "why you want this" line
  milestone: string     // the action that unlocks it, in imperative voice
  action: ActionKey | null
  isDone: (c: Counts) => boolean
}

// Sections that are never gated — utilities someone may need from minute one.
// Places used to need its own entry here (no milestone produces a pin other
// than opening the tab and adding one, so any gate on it would be circular)
// but it folded into Household as a sub-tab (2026-08-20), so Household's own
// entry already covers it. 'household' itself folded into four real
// top-level sections (2026-08-25) — see DashboardClient's DEFAULT_SECTIONS —
// so its NEVER_GATED entry became four.
export const NEVER_GATED = new Set(['village', 'home', 'calendar', 'routines', 'reference'])

/** Sections that are open from the first login and never counted as something
 *  "to unlock": Today, Village, Home, Calendar, Routines, Reference — 6, up
 *  from 3 (2026-08-25) when Household split from one always-open section
 *  into four (see NEVER_GATED above and DashboardClient's DEFAULT_SECTIONS)
 *  — none of those four became a new milestone to unlock, there are just
 *  more of them now. Kept as a named constant because it's used twice below
 *  to size the journey bar — when it was a bare number in both places,
 *  adding a section silently made the bar report the wrong total. */
const ALWAYS_OPEN_COUNT = 6

export const UNLOCK_STAGES: UnlockStage[] = []

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
