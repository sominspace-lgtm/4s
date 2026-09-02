'use client'

import { useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useHabits, isDueOn } from '@/lib/hooks/useHabits'
import type { VillageState } from '@/lib/village/state'
import Icon from '@/components/ui/Icon'

// The progress visualization for the Village home panel — the garden, habits
// today, a streak, projects. All from data already computed elsewhere
// (buildVillage's VillageState, useHabits). In guest mode it renders the same
// thing minus anything with a name in it (counts and the garden only).

export default function ProgressCard({ village, guest = false }: { village?: VillageState | null; guest?: boolean }) {
  const { habits, completions } = useHabits()

  const { doneToday, dueToday, streak } = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const active = habits.filter(h => !h.paused)
    const due = active.filter(h => isDueOn(h, today, completions[h.id] ?? []))
    const done = due.filter(h => (completions[h.id] ?? []).includes(today))
    // Consecutive days back from today with at least one completion.
    const allDates = new Set<string>()
    for (const list of Object.values(completions)) for (const d of list) allDates.add(d)
    let s = 0
    for (let i = 0; i < 60; i++) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
      if (allDates.has(d)) s++
      else if (i > 0) break // today not yet done is fine; a gap before today ends it
    }
    return { doneToday: done.length, dueToday: due.length, streak: s }
  }, [habits, completions])

  const growing = village?.plants.filter(p => !p.dormant).length ?? 0
  const resting = (village?.plants.length ?? 0) - growing
  const standing = village?.buildings.filter(b => b.phase === 'complete' || b.phase === 'landmark').length ?? 0
  const underway = (village?.buildings.length ?? 0) - standing

  return (
    <div className="organic" style={{
      background: 'color-mix(in srgb, var(--emerald) 9%, var(--surface2))',
      border: '1px solid color-mix(in srgb, var(--emerald) 22%, var(--border))',
      borderRadius: 14, padding: '0.65rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span aria-hidden style={{ display: 'inline-flex', color: 'var(--emerald)' }}><Icon name="sprout" size={16} /></span>
        <span style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text)', flex: 1 }}>
          {guest ? 'Our life lately' : 'Progress'}
        </span>
        {streak > 1 && (
          <span style={{
            fontSize: '0.62rem', fontWeight: 600, color: 'var(--gold)',
            background: 'color-mix(in srgb, var(--gold) 16%, transparent)', borderRadius: 999, padding: '0.1rem 0.5rem',
          }}>{streak}d streak</span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.9rem', fontSize: '0.72rem', color: 'var(--muted)' }}>
        <Stat value={growing} label={growing === 1 ? 'plant growing' : 'plants growing'} />
        {resting > 0 && <Stat value={resting} label="resting" />}
        {!guest && dueToday > 0 && <Stat value={`${doneToday}/${dueToday}`} label="habits today" strong={doneToday === dueToday} />}
        {standing > 0 && <Stat value={standing} label={standing === 1 ? 'project standing' : 'projects standing'} />}
        {underway > 0 && <Stat value={underway} label="underway" />}
      </div>

      {(village?.plants.length ?? 0) > 0 && (
        <div style={{ height: 5, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3, background: 'var(--emerald)',
            width: `${Math.round((growing / Math.max(1, village!.plants.length)) * 100)}%`,
          }} />
        </div>
      )}
    </div>
  )
}

function Stat({ value, label, strong }: { value: string | number; label: string; strong?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.3rem' }}>
      <span style={{ fontSize: '0.9rem', color: strong ? 'var(--emerald)' : 'var(--text)', fontFamily: 'var(--font-display, var(--font-body))' }}>{value}</span>
      <span>{label}</span>
    </span>
  )
}
