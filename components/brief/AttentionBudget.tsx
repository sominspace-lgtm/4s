'use client'

import { effectiveEnergy, type Energy } from '@/lib/utils/energy'
import { dueUrgency, type WorkItem } from '@/lib/hooks/useWorkItems'

// Today's realistic capacity, shown as slots instead of an endless list — the
// Attention Budget from the 4S Village vision. A slot filling in is never bad
// news: full slots render in silence, slots with room say so. This never
// becomes "you've used 2 of 3" — that's the exact guilt mechanic the product
// exists to avoid — and it's a gauge, not a gate: nothing here stops you from
// adding a fourth medium task, it just stops telling you there's room for one.
const BUDGET: Record<Energy, number> = { deep: 1, medium: 3, light: 5 }
const ORDER: Energy[] = ['deep', 'medium', 'light']
const LABEL: Record<Energy, string> = { deep: 'Deep focus', medium: 'Medium', light: 'Light' }
const NOUN: Record<Energy, string> = { deep: 'deep-focus block', medium: 'medium task', light: 'light task' }
const NOUN_PLURAL: Record<Energy, string> = { deep: 'deep-focus blocks', medium: 'medium tasks', light: 'light tasks' }

function roomCopy(tier: Energy, filled: number, budget: number): string | null {
  const room = budget - filled
  if (room <= 0) return null
  if (filled === 0) return room === 1 ? `Room for one ${NOUN[tier]} today.` : `Room for up to ${room} ${NOUN_PLURAL[tier]} today.`
  return room === 1 ? `Room for one more ${NOUN[tier]} today.` : `Room for ${room} more ${NOUN_PLURAL[tier]} today.`
}

export default function AttentionBudget({ items }: { items: WorkItem[] }) {
  const today = items.filter(i =>
    i.status !== 'done' && (dueUrgency(i.due_date) === 'today' || dueUrgency(i.due_date) === 'overdue')
  )
  if (today.length === 0) return null

  const counts: Record<Energy, number> = { deep: 0, medium: 0, light: 0 }
  for (const item of today) counts[effectiveEnergy(item)]++

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {ORDER.map(tier => {
        const budget = BUDGET[tier]
        const filled = Math.min(counts[tier], budget)
        const copy = roomCopy(tier, filled, budget)
        return (
          <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--muted)', width: '4.4rem', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.75 }}>
              {LABEL[tier]}
            </span>
            <span style={{ display: 'flex', gap: '0.28rem', flexShrink: 0 }}>
              {Array.from({ length: budget }).map((_, i) => (
                <span key={i} aria-hidden style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: i < filled ? 'var(--gold)' : 'transparent',
                  border: i < filled ? 'none' : '1px solid var(--border)',
                }} />
              ))}
            </span>
            {copy && <span style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.65 }}>{copy}</span>}
          </div>
        )
      })}
    </div>
  )
}
