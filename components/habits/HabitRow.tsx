'use client'

import { useEffect, useRef, useState } from 'react'
import { parseISO, isToday, isFuture, format } from 'date-fns'
import { getDayLabel, DOMAIN_COLORS } from '@/lib/utils/habits'
import { createClient } from '@/lib/supabase/client'
import { scheduleSummary, isDueOn, type Habit } from '@/lib/hooks/useHabits'
import { plantFor, STAGE_INDEX } from '@/lib/village/state'
import PlantGlyph from './PlantGlyph'

interface HabitRowProps {
  habit: Habit & { shared?: boolean }
  completions: string[]
  days: string[]
  onToggle: (habitId: string, date: string) => void
  onDelete: (habitId: string) => void
  onTogglePaused: (habitId: string) => void
  onUpdateSchedule: (habitId: string, schedule: Partial<Pick<Habit, 'schedule_type' | 'interval_days' | 'days_of_week'>>) => void
}

export default function HabitRow({ habit, completions, days, onToggle, onDelete, onTogglePaused }: HabitRowProps) {
  const [hovered, setHovered] = useState(false)
  const [shared, setShared] = useState(habit.shared ?? false)
  const done = new Set(completions)
  const color = DOMAIN_COLORS[habit.category ?? ''] ?? 'var(--muted)'
  const today = format(new Date(), 'yyyy-MM-dd')
  const dueToday = !habit.paused && isDueOn(habit, today, completions)

  // The habit IS the water — completing the real thing is the only input.
  // There is no water button, and there never should be: the moment you can
  // grow a plant by tapping in the app instead of living, the whole "reward
  // reality" premise is dead.
  const plant = plantFor(habit, completions)

  // Growth is celebrated once, on the render where it actually happens.
  // Comparing against the previous stage rather than animating on every
  // completion is what keeps this rare enough to mean something.
  const prevStage = useRef(STAGE_INDEX(plant.stage))
  const [justGrew, setJustGrew] = useState(false)
  useEffect(() => {
    const now = STAGE_INDEX(plant.stage)
    if (now > prevStage.current) {
      setJustGrew(true)
      const t = setTimeout(() => setJustGrew(false), 900)
      prevStage.current = now
      return () => clearTimeout(t)
    }
    prevStage.current = now
  }, [plant.stage])

  async function toggleShare() {
    const next = !shared
    setShared(next)
    await createClient().from('habits').update({ shared: next }).eq('id', habit.id)
  }

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.55rem 0', borderBottom: '1px solid var(--faint)', opacity: habit.paused ? 0.5 : 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* The plant, at the front of the row — the first thing you see about a
          habit is what it has become, not what it demands of you today. */}
      <div className={justGrew ? 'grew' : undefined} style={{ flexShrink: 0 }}>
        <PlantGlyph plant={plant} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: '110px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: dueToday ? color : 'var(--faint)', flexShrink: 0, opacity: 0.9 }} />
          <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{habit.name}</span>
        </div>
        <span style={{ fontSize: '0.58rem', color: 'var(--muted)', opacity: 0.68, marginLeft: '0.9rem' }}>
          {scheduleSummary(habit)}
          {plant.dormant && !habit.paused ? ' · resting' : ''}
          {dueToday && !habit.paused ? ' · due today' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.3rem', flex: 1, overflowX: 'auto' }}>
        {days.map(d => {
          const isT = isToday(parseISO(d))
          const future = isFuture(parseISO(d + 'T23:59:59'))
          const isDone = done.has(d)
          const wasDue = isDueOn(habit, d, completions)
          return (
            <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
              <div style={{ fontSize: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', lineHeight: 1 }}>
                {getDayLabel(d)}
              </div>
              {/* A real button, not a div: keyboard-reachable, and the press
                  gives so checking something off answers back. The tick draws
                  itself in rather than appearing — one beat, then still. */}
              <button
                onClick={() => !future && onToggle(habit.id, d)}
                disabled={future}
                aria-pressed={isDone}
                aria-label={`${habit.name}, ${getDayLabel(d)}${isDone ? ', done' : ''}`}
                title={wasDue ? 'Due this day' : 'Not scheduled this day — still loggable'}
                className={future ? undefined : 'press'}
                style={{
                  width: 22, height: 22, borderRadius: '5px', cursor: future ? 'default' : 'pointer',
                  padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: isT ? `1.5px solid ${color}` : wasDue ? '1px solid var(--border)' : '1px dashed var(--faint)',
                  background: isDone ? `color-mix(in srgb, ${color} 40%, transparent)` : 'transparent',
                  opacity: future ? 0.25 : (wasDue ? 1 : 0.5), transition: 'background 0.15s, border-color 0.15s', flexShrink: 0,
                }}
              >
                {isDone && (
                  <svg className="tick" width={12} height={12} viewBox="0 0 12 12" aria-hidden>
                    <path d="M2.5 6.2 L4.9 8.6 L9.5 3.6" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Lifetime waterings, not a streak.
          A streak is a number that resets to zero the first time life gets in
          the way — the single most reliable guilt mechanic in this entire
          category, and the one thing the product promises not to do. This
          counts every time you actually did the thing, and it only ever goes
          up. Miss a fortnight and the plant rests; the count stays yours. */}
      <div
        title={`Watered ${completions.length} time${completions.length === 1 ? '' : 's'}`}
        style={{ fontSize: '0.68rem', color: 'var(--muted)', whiteSpace: 'nowrap', minWidth: '44px', textAlign: 'right', flexShrink: 0 }}
      >
        {completions.length > 0
          ? <><span style={{ color, fontSize: '0.78rem' }}>{completions.length}</span>×</>
          : <span style={{ opacity: 0.5 }}>new</span>}
      </div>

      <button
        onClick={() => onTogglePaused(habit.id)}
        title={habit.paused ? 'Resume tracking' : 'Pause tracking'}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
          fontSize: '0.62rem', color: 'var(--muted)',
          opacity: habit.paused ? 0.8 : (hovered ? 0.4 : 0), transition: 'opacity 0.15s',
        }}
      >{habit.paused ? '▶' : '⏸'}</button>

      {/* Share toggle */}
      <button
        onClick={toggleShare}
        title={shared ? 'Shared with companions' : 'Share with companions'}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
          fontSize: '0.62rem', color: shared ? 'var(--gold)' : 'var(--muted)',
          opacity: shared ? 0.8 : hovered ? 0.3 : 0, transition: 'opacity 0.15s',
        }}
      >⇆</button>

      <button
        onClick={() => onDelete(habit.id)}
        aria-label={`Delete ${habit.name}`}
        style={{
          background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
          fontSize: '0.65rem', opacity: hovered ? 0.4 : 0, transition: 'opacity 0.15s', flexShrink: 0,
        }}
      >✕</button>
    </div>
  )
}
