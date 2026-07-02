'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, differenceInDays, parseISO, addDays } from 'date-fns'

export type TrackingMode = 'simple-interval' | 'smart-supply' | 'manual-date'
export type RefillStatus = 'stocked' | 'backup-stock' | 'running-low' | 'due-to-buy' | 'overdue' | 'snoozed' | 'paused'
export type RefillCategory = 'supplements' | 'medicine' | 'pet-care' | 'personal-care' | 'household' | 'groceries' | 'other'

export const REFILL_CATEGORIES: { id: RefillCategory; label: string }[] = [
  { id: 'supplements',   label: 'Supplements' },
  { id: 'medicine',      label: 'Medicine' },
  { id: 'pet-care',      label: 'Pet Care' },
  { id: 'personal-care', label: 'Personal Care' },
  { id: 'household',     label: 'Household' },
  { id: 'groceries',     label: 'Groceries' },
  { id: 'other',         label: 'Other' },
]

// Smart defaults per category — used when the user doesn't override them.
export const CATEGORY_DEFAULTS: Record<RefillCategory, { cadenceDays: number; notifyDaysBefore: number }> = {
  supplements:   { cadenceDays: 30, notifyDaysBefore: 3 },
  medicine:      { cadenceDays: 30, notifyDaysBefore: 3 },
  'pet-care':    { cadenceDays: 25, notifyDaysBefore: 5 },
  'personal-care': { cadenceDays: 37, notifyDaysBefore: 5 },
  household:     { cadenceDays: 37, notifyDaysBefore: 5 },
  groceries:     { cadenceDays: 14, notifyDaysBefore: 2 },
  other:         { cadenceDays: 30, notifyDaysBefore: 3 },
}

export interface BuyItem {
  id: string
  name: string
  cadence_days: number
  last_bought: string
  buy_url: string | null
  category: RefillCategory
  tracking_mode: TrackingMode
  quantity: number | null
  serving_count: number | null
  serving_size: string | null
  usage_per_day: number | null
  opened_date: string | null
  estimated_runout_date: string | null
  reminder_date: string | null
  notify_days_before: number
  store: string | null
  price: number | null
  image_url: string | null
  notes: string | null
  status: RefillStatus
  snoozed_until: string | null
  last_feedback: 'too-early' | 'just-right' | 'too-late' | null
}

// The date the item is expected to run out, independent of tracking mode.
export function runoutDate(item: BuyItem): Date | null {
  if (item.tracking_mode === 'manual-date') {
    return item.reminder_date ? parseISO(item.reminder_date) : null
  }
  if (item.tracking_mode === 'smart-supply') {
    if (item.estimated_runout_date) return parseISO(item.estimated_runout_date)
    if (item.opened_date && item.serving_count && item.usage_per_day) {
      const daysSupply = item.serving_count / item.usage_per_day
      return addDays(parseISO(item.opened_date), Math.round(daysSupply))
    }
    return null // bought but not opened yet — backup stock, no countdown running
  }
  return addDays(parseISO(item.last_bought), item.cadence_days)
}

export function daysUntilDue(item: BuyItem): number {
  const due = runoutDate(item)
  if (!due) return Infinity
  return differenceInDays(due, new Date())
}

export function computeStatus(item: BuyItem): RefillStatus {
  if (item.status === 'paused') return 'paused'
  if (item.snoozed_until && parseISO(item.snoozed_until) >= new Date()) return 'snoozed'
  if (item.tracking_mode === 'smart-supply' && !item.opened_date) return 'backup-stock'

  const days = daysUntilDue(item)
  if (days === Infinity) return 'stocked'
  if (days < 0) return 'overdue'
  if (days <= item.notify_days_before) return 'due-to-buy'
  if (days <= item.notify_days_before + 5) return 'running-low'
  return 'stocked'
}

export const STATUS_LABEL: Record<RefillStatus, string> = {
  stocked: 'Stocked', 'backup-stock': 'Backup stock', 'running-low': 'Running low',
  'due-to-buy': 'Due to buy', overdue: 'Overdue', snoozed: 'Snoozed', paused: 'Paused',
}

export function useBuyItems() {
  const [items, setItems] = useState<BuyItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('buy_items').select('*').order('created_at')
    if (data) setItems(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetch() }, [fetch])

  interface AddInput {
    name: string
    category?: RefillCategory
    tracking_mode?: TrackingMode
    cadence_days?: number
    notify_days_before?: number
    buy_url?: string | null
    quantity?: number | null
    serving_count?: number | null
    serving_size?: string | null
    usage_per_day?: number | null
    estimated_runout_date?: string | null
    reminder_date?: string | null
    store?: string | null
    price?: number | null
    image_url?: string | null
    notes?: string | null
  }

  async function add(input: AddInput) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const category = input.category ?? 'other'
    const defaults = CATEGORY_DEFAULTS[category]
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data } = await supabase.from('buy_items').insert({
      user_id: user.id,
      name: input.name,
      category,
      tracking_mode: input.tracking_mode ?? 'simple-interval',
      cadence_days: input.cadence_days ?? defaults.cadenceDays,
      notify_days_before: input.notify_days_before ?? defaults.notifyDaysBefore,
      last_bought: today,
      buy_url: input.buy_url || null,
      quantity: input.quantity ?? null,
      serving_count: input.serving_count ?? null,
      serving_size: input.serving_size ?? null,
      usage_per_day: input.usage_per_day ?? null,
      estimated_runout_date: input.estimated_runout_date ?? null,
      reminder_date: input.reminder_date ?? null,
      store: input.store ?? null,
      price: input.price ?? null,
      image_url: input.image_url ?? null,
      notes: input.notes ?? null,
      // smart-supply items start as backup stock until marked opened
      status: input.tracking_mode === 'smart-supply' ? 'backup-stock' : 'stocked',
    }).select().single()
    if (data) setItems(prev => [...prev, data])
  }

  // Buying again: reset last_bought, keep every usage/tracking setting as-is.
  // For smart-supply items this creates a new backup unit — it does NOT
  // reopen the item, since the user may be stocking up ahead of time.
  async function markBought(id: string) {
    const today = format(new Date(), 'yyyy-MM-dd')
    const item = items.find(i => i.id === id)
    const patch: Partial<BuyItem> = {
      last_bought: today, snoozed_until: null,
      status: item?.tracking_mode === 'smart-supply' && !item.opened_date ? 'backup-stock' : 'stocked',
    }
    await supabase.from('buy_items').update(patch).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  // Starts the run-out countdown from today — separate from "bought" because
  // people often buy backup stock before they start using it.
  async function markOpened(id: string) {
    const today = format(new Date(), 'yyyy-MM-dd')
    await supabase.from('buy_items').update({ opened_date: today, status: 'stocked' }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, opened_date: today, status: 'stocked' } : i))
  }

  async function snooze(id: string, days: number) {
    const until = format(addDays(new Date(), days), 'yyyy-MM-dd')
    await supabase.from('buy_items').update({ snoozed_until: until, status: 'snoozed' }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, snoozed_until: until, status: 'snoozed' } : i))
  }

  async function togglePaused(id: string) {
    const item = items.find(i => i.id === id)
    const nextStatus: RefillStatus = item?.status === 'paused' ? 'stocked' : 'paused'
    await supabase.from('buy_items').update({ status: nextStatus }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: nextStatus } : i))
  }

  async function update(id: string, patch: Partial<BuyItem>) {
    await supabase.from('buy_items').update(patch).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  // "Too early / Just right / Too late" feedback nudges the interval so
  // future reminders land closer to when the item actually runs out.
  async function submitFeedback(id: string, feedback: 'too-early' | 'just-right' | 'too-late') {
    const item = items.find(i => i.id === id)
    if (!item) return
    let cadence = item.cadence_days
    if (feedback === 'too-early') cadence = Math.round(cadence * 1.15)
    if (feedback === 'too-late') cadence = Math.round(cadence * 0.85)
    const patch = { cadence_days: cadence, last_feedback: feedback }
    await supabase.from('buy_items').update(patch).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  async function remove(id: string) {
    await supabase.from('buy_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return { items, loading, add, markBought, markOpened, snooze, togglePaused, update, submitFeedback, remove }
}
