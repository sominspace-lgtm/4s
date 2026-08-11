'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { differenceInCalendarDays, parseISO } from 'date-fns'

export interface Goal {
  id: string
  user_id: string
  space_id: string | null
  title: string
  why: string | null
  next_action: string | null
  status: 'active' | 'retired' | 'achieved'
  last_touched_at: string
  ended_at: string | null
  ended_reason: string | null
  created_at: string
}

/** How long a goal can sit untouched before the product asks about it.
 *  Three weeks is long enough that a slow week doesn't trigger it, short
 *  enough that a genuinely abandoned goal doesn't quietly rot for months. */
export const STALE_AFTER_DAYS = 21

export function daysSinceTouched(g: Goal): number {
  return differenceInCalendarDays(new Date(), parseISO(g.last_touched_at))
}

export function isStale(g: Goal): boolean {
  return g.status === 'active' && daysSinceTouched(g) >= STALE_AFTER_DAYS
}

export function useGoals(spaceId: string | null) {
  const supabase = createClient()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    // Unlike the household hooks, goals are NOT filtered to one scope: you
    // want your own goals and the shared ones side by side, because "am I
    // still choosing this" is a question about your whole life, not about
    // which tab you happen to be looking at. RLS already limits this to
    // yours-or-my-spaces.
    const { data, error: e } = await supabase
      .from('goals')
      .select('*')
      .order('status')
      .order('last_touched_at', { ascending: true })
    setError(e ? e.message : null)
    setGoals((data as Goal[] | null) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onChanged() { load() }
    window.addEventListener('4s:goals-changed', onChanged)
    return () => window.removeEventListener('4s:goals-changed', onChanged)
  }, [load])

  function notify() { window.dispatchEvent(new CustomEvent('4s:goals-changed')) }

  async function addGoal(title: string, why: string | null, nextAction: string | null, shared: boolean) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error: e } = await supabase.from('goals').insert({
      user_id: user.id,
      space_id: shared ? spaceId : null,
      title,
      why,
      next_action: nextAction,
    })
    if (e) { setError(e.message); return { error: e.message } }
    await load(); notify(); return { error: null }
  }

  /** Any edit counts as touching it — that's the whole staleness signal. */
  async function updateGoal(id: string, fields: Partial<Pick<Goal, 'title' | 'why' | 'next_action'>>) {
    const { error: e } = await supabase.from('goals')
      .update({ ...fields, last_touched_at: new Date().toISOString() })
      .eq('id', id)
    if (e) { setError(e.message); return { error: e.message } }
    await load(); notify(); return { error: null }
  }

  /** Retiring is a legitimate ending, not a failure — same code path as
   *  achieving one, only the status differs. */
  async function endGoal(id: string, status: 'retired' | 'achieved', reason: string | null) {
    const { error: e } = await supabase.from('goals')
      .update({ status, ended_at: new Date().toISOString(), ended_reason: reason })
      .eq('id', id)
    if (e) { setError(e.message); return { error: e.message } }
    await load(); notify(); return { error: null }
  }

  async function reviveGoal(id: string) {
    const { error: e } = await supabase.from('goals')
      .update({ status: 'active', ended_at: null, ended_reason: null, last_touched_at: new Date().toISOString() })
      .eq('id', id)
    if (e) { setError(e.message); return { error: e.message } }
    await load(); notify(); return { error: null }
  }

  async function removeGoal(id: string) {
    const { error: e } = await supabase.from('goals').delete().eq('id', id)
    if (e) { setError(e.message); return { error: e.message } }
    await load(); notify(); return { error: null }
  }

  const active = goals.filter(g => g.status === 'active')
  return {
    goals, active, loading, error,
    stale: active.filter(isStale),
    ended: goals.filter(g => g.status !== 'active'),
    addGoal, updateGoal, endGoal, reviveGoal, removeGoal,
  }
}
