import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { logWin } from '@/lib/household/wins'
import { createGoogleEvent } from '@/lib/hooks/useGoogle'

// The smart + (2026-10-25): one sentence, read by the AI (route-capture),
// becomes actions; each is filed here into the right place once you confirm.

export interface CaptureAction {
  type: 'shopping' | 'care' | 'chore' | 'event' | 'task' | 'note'
  label: string
  name?: string | null; qty?: string | null; category?: string | null
  note?: string | null; title?: string | null; date?: string | null; time?: string | null
  energy?: 'light' | 'medium' | 'deep' | null; text?: string | null
  done?: boolean | null; every_days?: number | null
}

export const ACTION_WORD: Record<CaptureAction['type'], string> = {
  shopping: 'Shopping', care: 'Chore', chore: 'Chore', event: 'Calendar', task: 'Task', note: 'Note',
}

async function householdId(userId: string): Promise<string | null> {
  const supabase = createClient()
  const { data: m } = await supabase.from('shared_space_members').select('space_id').eq('member_id', userId).eq('status', 'accepted').limit(1).maybeSingle()
  if (m?.space_id) return m.space_id as string
  const { data: own } = await supabase.from('shared_spaces').select('id').eq('owner_id', userId).limit(1).maybeSingle()
  return (own?.id as string | undefined) ?? null
}

/** Files one action. Returns an error message, or null when it worked. */
export async function fileAction(a: CaptureAction, opts: { googleCalendar?: boolean } = {}): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'Sign in first.'
  const spaceId = await householdId(user.id)
  const today = format(new Date(), 'yyyy-MM-dd')
  const fire = (name: string) => window.dispatchEvent(new CustomEvent(name))

  if (a.type === 'shopping') {
    const { error } = await supabase.from('household_shopping').insert({ user_id: user.id, space_id: spaceId, name: (a.name || a.label).slice(0, 120), qty: a.qty ?? null, category: a.category ?? null })
    if (!error) fire('4s:household-changed')
    return error ? 'The shopping item did not save.' : null
  }
  if (a.type === 'chore' || a.type === 'care') {
    const name = (a.name || a.title || a.label).slice(0, 120)
    if (!spaceId) return 'Chores need a shared household.'
    if (a.done || a.type === 'care') {
      // "I cleaned the litter": mark the matching chore done, if there is one.
      const { data: list } = await supabase.from('household_chores').select('id, name').eq('space_id', spaceId)
      const words = name.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      const hit = (list ?? []).find(c => words.some(w => (c.name as string).toLowerCase().includes(w)))
      if (hit) {
        const { error } = await supabase.from('household_chores').update({ last_done_at: today, last_done_by: user.id }).eq('id', hit.id)
        if (!error) { void logWin(supabase, spaceId, user.id, 'chore', hit.name as string); fire('4s:household-changed') }
        return error ? 'The chore did not update.' : null
      }
      return logWin(supabase, spaceId, user.id, 'win', name).then(() => null)
    }
    const { error } = await supabase.from('household_chores').insert({ user_id: user.id, space_id: spaceId, name, cadence_days: Math.max(1, Math.round(a.every_days ?? 7)) })
    if (!error) fire('4s:household-changed')
    return error ? 'The chore did not save.' : null
  }
  if (a.type === 'event') {
    const title = (a.title || a.label).slice(0, 160)
    const date = a.date || today
    const { error } = await supabase.from('events').insert({ user_id: user.id, title, event_date: date, event_time: a.time ?? null, notes: a.note ?? null, space_id: null })
    if (error) return 'The event did not save.'
    fire('4s:events-changed')
    if (opts.googleCalendar) await createGoogleEvent({ title, date, time: a.time ?? null, notes: a.note ?? null })
    return null
  }
  if (a.type === 'task') {
    const { error } = await supabase.from('work_items').insert({ user_id: user.id, title: (a.title || a.label).slice(0, 200), status: 'todo', due_date: a.date ?? null, notes: a.note ?? null })
    if (!error) fire('4s:work-items-changed')
    return error ? 'The task did not save.' : null
  }
  const { error } = await supabase.from('notes').insert({ user_id: user.id, space_id: null, title: '', body: (a.text || a.label).slice(0, 4000) })
  if (!error) fire('4s:notes-changed')
  return error ? 'The note did not save.' : null
}
