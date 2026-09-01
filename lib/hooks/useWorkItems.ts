'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'

export type Energy = 'light' | 'medium' | 'deep'

export interface WorkItem {
  id: string
  title: string
  notes: string | null
  due_date: string | null
  energy: Energy | null
  domain: string | null
  status: 'todo' | 'in-progress' | 'done'
  recur_days: number | null
  space_id: string | null
  created_at: string
  completed_at: string | null
  landmark: boolean
  board_column: 'small' | 'growing' | 'projects' | 'later' | null
}

// Every task in a household space — both partners' — for the Household
// calendar. Since 2026-09-01 a task just carries space_id (set on creation
// to the owner's primary space); there's no per-item toggle anymore. RLS
// (work_items_select_space) grants every accepted member the read.
export function useSharedWorkItems(spaceId: string | null) {
  const supabase = createClient()
  const [items, setItems] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!spaceId) { setItems([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('work_items').select('*').eq('space_id', spaceId).neq('status', 'done')
    if (error) { setItems([]); setLoading(false); return }
    setItems(data as WorkItem[])
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onChanged() { load() }
    window.addEventListener('4s:work-items-changed', onChanged)
    return () => window.removeEventListener('4s:work-items-changed', onChanged)
  }, [load])

  return { items, loading }
}

export function dueUrgency(due: string | null): 'overdue' | 'today' | 'soon' | 'fine' | 'none' {
  if (!due) return 'none'
  const days = differenceInCalendarDays(parseISO(due), new Date())
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= 3) return 'soon'
  return 'fine'
}

export function sortWorkItems(items: WorkItem[]): WorkItem[] {
  const urgencyScore = { overdue: 0, today: 1, soon: 2, fine: 3, none: 4 }
  return [...items].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1
    if (b.status === 'done' && a.status !== 'done') return -1
    const uA = urgencyScore[dueUrgency(a.due_date)]
    const uB = urgencyScore[dueUrgency(b.due_date)]
    if (uA !== uB) return uA - uB
    // No priority tiebreaker anymore — priority was a guilt field (section 10
    // of the brief: "everything the user cares about becomes 'high' and then
    // the field carries no information"). Within the same urgency, oldest
    // first is a neutral, predictable order with no ranking judgment in it.
    return a.created_at.localeCompare(b.created_at)
  })
}

export function useWorkItems() {
  const [items, setItems] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Your primary household space — a new task is stamped with it on creation
  // so it's visible to your partner on the Household calendar. Personal views
  // (this hook) still show only your own; the space read is useSharedWorkItems.
  const { spaces, members } = useSharedSpaces('')
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id
    ?? spaces[0]?.id ?? null

  const load = useCallback(async () => {
    setLoading(true)
    // Explicit owner filter — work_items_select_space (2026-09-01) also grants
    // a partner's space-scoped tasks to accepted members, so an unqualified
    // select would merge their tasks into "my tasks" here.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setItems([]); setLoading(false); return }
    const { data, error } = await supabase
      .from('work_items')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'done')
      .order('created_at')
    if (error) { setLoading(false); return }
    setItems(data as WorkItem[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // useWorkItems() is called independently in several places (Work Hub,
  // Brief's summary card) — each call owns its own `items` state.
  // Without this, adding/completing a task in one place leaves every other
  // instance showing stale data until it happens to remount. Any instance
  // that mutates fires this event; every instance (including itself) reloads.
  useEffect(() => {
    function onChanged() { load() }
    window.addEventListener('4s:work-items-changed', onChanged)
    return () => window.removeEventListener('4s:work-items-changed', onChanged)
  }, [load])

  function notifyChanged() { window.dispatchEvent(new CustomEvent('4s:work-items-changed')) }

  async function add(fields: Pick<WorkItem, 'title' | 'notes' | 'due_date' | 'energy' | 'domain' | 'recur_days'>): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const { data, error } = await supabase.from('work_items')
      .insert({ ...fields, user_id: user.id, status: 'todo', space_id: spaceId })
      .select().single()
    if (error) return error.message
    // Re-fetch from the DB instead of trusting the insert's .select() return —
    // if that row-return is ever blocked (e.g. by an RLS SELECT policy gap),
    // splicing local state with `data` would silently omit the new task even
    // though the insert itself succeeded. A full reload is the source of truth.
    if (data) setItems(prev => sortWorkItems([...prev, data as WorkItem]))
    else await load()
    notifyChanged()
    return null
  }

  async function setStatus(id: string, status: WorkItem['status']) {
    const item = items.find(i => i.id === id)
    const { error } = await supabase.from('work_items').update({ status, ...(status === 'done' ? { completed_at: new Date().toISOString() } : {}) }).eq('id', id)
    if (error) return
    notifyChanged()

    if (status === 'done') {
      // If recurring, create next occurrence
      if (item?.recur_days) {
        const nextDue = format(addDays(new Date(), item.recur_days), 'yyyy-MM-dd')
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: newItem } = await supabase.from('work_items')
            .insert({
              user_id: user.id, title: item.title, notes: item.notes,
              due_date: nextDue, energy: item.energy, domain: item.domain,
              recur_days: item.recur_days, status: 'todo', space_id: item.space_id,
            })
            .select().single()
          if (newItem) {
            setItems(prev => sortWorkItems([...prev.filter(i => i.id !== id), newItem as WorkItem]))
            return
          }
        }
      }
      setItems(prev => prev.filter(i => i.id !== id))
    } else {
      setItems(prev => sortWorkItems(prev.map(i => i.id === id ? { ...i, status } : i)))
    }
  }

  async function update(id: string, fields: Partial<WorkItem>) {
    const { error } = await supabase.from('work_items').update(fields).eq('id', id)
    if (error) return
    setItems(prev => sortWorkItems(prev.map(i => i.id === id ? { ...i, ...fields } : i)))
    notifyChanged()
  }

  async function remove(id: string) {
    const { error } = await supabase.from('work_items').delete().eq('id', id)
    if (error) return
    setItems(prev => prev.filter(i => i.id !== id))
    notifyChanged()
  }

  return { items: sortWorkItems(items), loading, add, setStatus, update, remove }
}
