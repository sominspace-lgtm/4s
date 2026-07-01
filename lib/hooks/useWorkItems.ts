'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

export interface WorkItem {
  id: string
  title: string
  notes: string | null
  due_date: string | null
  priority: number
  domain: string | null
  status: 'todo' | 'in-progress' | 'done'
  recur_days: number | null
  shared: boolean
  created_at: string
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
    return a.priority - b.priority
  })
}

export function useWorkItems() {
  const [items, setItems] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('work_items')
      .select('*')
      .neq('status', 'done')
      .order('priority')
    if (error) { setLoading(false); return }
    setItems(data as WorkItem[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function add(fields: Pick<WorkItem, 'title' | 'notes' | 'due_date' | 'priority' | 'domain' | 'recur_days'>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('work_items')
      .insert({ ...fields, user_id: user.id, status: 'todo', shared: false })
      .select().single()
    if (error || !data) return
    setItems(prev => sortWorkItems([...prev, data as WorkItem]))
  }

  async function setStatus(id: string, status: WorkItem['status']) {
    const item = items.find(i => i.id === id)
    const { error } = await supabase.from('work_items').update({ status, ...(status === 'done' ? { completed_at: new Date().toISOString() } : {}) }).eq('id', id)
    if (error) return

    // Emit XP event when completing
    if (status === 'done') window.dispatchEvent(new CustomEvent('4s:xp', { detail: 25 }))

    if (status === 'done') {
      // If recurring, create next occurrence
      if (item?.recur_days) {
        const nextDue = format(addDays(new Date(), item.recur_days), 'yyyy-MM-dd')
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: newItem } = await supabase.from('work_items')
            .insert({
              user_id: user.id, title: item.title, notes: item.notes,
              due_date: nextDue, priority: item.priority, domain: item.domain,
              recur_days: item.recur_days, status: 'todo', shared: item.shared,
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
  }

  async function remove(id: string) {
    const { error } = await supabase.from('work_items').delete().eq('id', id)
    if (error) return
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function toggleShared(id: string) {
    const item = items.find(i => i.id === id)
    if (!item) return
    await update(id, { shared: !item.shared })
  }

  return { items: sortWorkItems(items), loading, add, setStatus, update, remove, toggleShared }
}
