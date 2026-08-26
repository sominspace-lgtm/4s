// Energy inference for tasks — "Attention Budget" concept from the 4S Village
// vision. Tasks are tagged Light / Medium / Deep so the day's capacity can be
// shown honestly instead of an endless list. Inference is a plain keyword
// heuristic (no AI call, no cost, no latency) — good enough to be usually
// right, and the user can always override it by hand (see WorkItem.energy).

import type { IconName } from '@/components/ui/Icon'

export type Energy = 'light' | 'medium' | 'deep'

export const ENERGY_ICON: Record<Energy, IconName> = { light: 'sprout', medium: 'leaf', deep: 'tree' }
export const ENERGY_LABEL: Record<Energy, string> = { light: 'Light', medium: 'Medium', deep: 'Deep focus' }
export const ENERGY_ORDER: Energy[] = ['light', 'medium', 'deep']

const LIGHT_WORDS = [
  'email', 'reply', 'text', 'call', 'buy', 'pay', 'order', 'book', 'schedule',
  'pick up', 'return', 'renew', 'confirm', 'rsvp', 'message', 'ping', 'file',
  'submit', 'print', 'mail', 'restock', 'refill', 'check', 'update address',
]

const DEEP_WORDS = [
  'write', 'design', 'code', 'build', 'plan', 'study', 'draft', 'create',
  'develop', 'research', 'launch', 'architect', 'compose', 'record', 'rehearse',
  'prepare', 'strategy', 'redesign', 'refactor', 'debug', 'edit', 'review',
]

const DEEP_DOMAINS = new Set(['biz-active', 'biz-future', 'creative'])

/**
 * Infer an energy level from a task's title/notes/domain. Deliberately a
 * cheap heuristic, not an AI call — it just needs to be a reasonable default,
 * since the user can always override it (see `energy` column: null = auto,
 * non-null = manual pin).
 */
export function inferEnergy(item: { title: string; notes?: string | null; domain?: string | null }): Energy {
  const text = item.title.toLowerCase()
  const wordCount = item.title.trim().split(/\s+/).length
  const hasNotes = !!item.notes && item.notes.trim().length > 0

  if (LIGHT_WORDS.some(w => text.includes(w)) && wordCount <= 6 && !hasNotes) return 'light'
  if (DEEP_WORDS.some(w => text.includes(w))) return 'deep'
  if (item.domain && DEEP_DOMAINS.has(item.domain)) return 'deep'
  if (hasNotes && item.notes!.trim().length > 80) return 'deep'
  if (wordCount <= 3 && !hasNotes) return 'light'
  return 'medium'
}

/** Resolve the effective energy: manual pin wins, otherwise infer. */
export function effectiveEnergy(item: { energy?: Energy | null; title: string; notes?: string | null; domain?: string | null }): Energy {
  return item.energy ?? inferEnergy(item)
}
