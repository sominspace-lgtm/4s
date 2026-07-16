'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Progressive unlocking — a new account starts with just Brief + Tasks and
// grows the rest of the OS through real use, so the first session never
// overwhelms. "Points" are simply how much the user has ever done, derived
// live from row counts (tasks, captures, habit checks, refills, subs). No
// stored unlock state, no migration: anyone with history — every existing
// user — computes past the last threshold and sees everything, exactly as
// before. Framed as a quiet journey ("areas awakened"), not arcade XP — the
// old gamer XP system was removed deliberately and this is not its return.

export interface UnlockStage {
  id: string          // section id (matches DEFAULT_SECTIONS / nav ids)
  label: string
  at: number          // points needed
  hint: string        // what to do to get there — shown as "next up"
}

// Brief and Tasks are the seed pair: see today, act today. Everything else
// arrives in the order a life OS naturally deepens.
export const UNLOCK_STAGES: UnlockStage[] = [
  { id: 'brief',    label: 'Brief',    at: 0,  hint: '' },
  { id: 'work',     label: 'Tasks',    at: 0,  hint: '' },
  // at:1 so the habit created during onboarding is visible immediately —
  // never give someone a habit they can't see.
  { id: 'habits',   label: 'Habits',   at: 1,  hint: 'add a task or a habit' },
  { id: 'domains',  label: 'Life',     at: 4,  hint: 'keep going — tasks, captures, habit checks all count' },
  { id: 'calendar', label: 'Calendar', at: 7,  hint: 'a few more actions' },
  { id: 'money',    label: 'Money',    at: 10, hint: 'keep building the routine' },
  { id: 'shared',   label: 'Shared',   at: 14, hint: 'almost — a handful more actions' },
  { id: 'council',  label: 'Council',  at: 18, hint: 'the last door — it opens soon' },
]

const MAX_AT = UNLOCK_STAGES[UNLOCK_STAGES.length - 1].at

// Every mutation event that should bump the counters live.
const REFRESH_EVENTS = [
  '4s:work-items-changed', '4s:captures-changed', '4s:habits-changed',
  '4s:buy-items-changed', '4s:subscriptions-changed',
]

export function useProgression(unlockAll: boolean) {
  const supabase = createClient()
  // Start as "everything unlocked" until the first count lands — a returning
  // user must never watch their tabs vanish for a loading beat.
  const [points, setPoints] = useState<number | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    const count = (table: string) =>
      supabase.from(table).select('id', { count: 'exact', head: true }).then(r => r.count ?? 0)
    const [work, captures, habits, checks, buys, subs] = await Promise.all([
      count('work_items'), count('captures'), count('habits'), count('habit_completions'),
      count('buy_items'), count('subscriptions'),
    ])
    setPoints(work + captures + habits + checks + buys + subs)
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

  const done = unlockAll || points === null || points >= MAX_AT
  const isUnlocked = (sectionId: string): boolean => {
    if (done) return true
    const stage = UNLOCK_STAGES.find(s => s.id === sectionId)
    if (!stage) return true // unknown/new sections never get locked by accident
    return (points ?? MAX_AT) >= stage.at
  }

  const unlockedCount = UNLOCK_STAGES.filter(s => isUnlocked(s.id)).length
  const next = done ? null : UNLOCK_STAGES.find(s => !isUnlocked(s.id)) ?? null

  return {
    loading: points === null,
    points: points ?? 0,
    done,
    isUnlocked,
    unlockedCount,
    total: UNLOCK_STAGES.length,
    percent: Math.round((unlockedCount / UNLOCK_STAGES.length) * 100),
    next,
    remaining: next ? Math.max(0, next.at - (points ?? 0)) : 0,
  }
}
