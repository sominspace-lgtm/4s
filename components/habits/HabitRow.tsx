'use client'

import { useState } from 'react'
import { parseISO, isToday, isFuture } from 'date-fns'
import { calcStreak, getDayLabel, DOMAIN_COLORS } from '@/lib/utils/habits'

interface HabitRowProps {
  habit: { id: string; name: string; category: string | null }
  completions: string[]
  days: string[]
  onToggle: (habitId: string, date: string) => void
  onDelete: (habitId: string) => void
}

export default function HabitRow({ habit, completions, days, onToggle, onDelete }: HabitRowProps) {
  const [hovered, setHovered] = useState(false)
  const done = new Set(completions)
  const streak = calcStreak(completions)
  const color = DOMAIN_COLORS[habit.category ?? ''] ?? 'var(--muted)'

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.55rem 0', borderBottom: '1px solid var(--faint)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '90px', flexShrink: 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, opacity: 0.8 }} />
        <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{habit.name}</span>
      </div>

      <div style={{ display: 'flex', gap: '0.3rem', flex: 1 }}>
        {days.map(d => {
          const isT = isToday(parseISO(d))
          const future = isFuture(parseISO(d + 'T23:59:59'))
          const isDone = done.has(d)
          return (
            <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
              <div style={{ fontSize: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', lineHeight: 1 }}>
                {getDayLabel(d)}
              </div>
              <div
                onClick={() => !future && onToggle(habit.id, d)}
                style={{
                  width: 22, height: 22, borderRadius: '5px', cursor: future ? 'default' : 'pointer',
                  border: isT ? `1.5px solid ${color}` : '1px solid var(--faint)',
                  background: isDone ? `color-mix(in srgb, ${color} 40%, transparent)` : 'transparent',
                  opacity: future ? 0.25 : 1,
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
              />
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', whiteSpace: 'nowrap', minWidth: '40px', textAlign: 'right', flexShrink: 0 }}>
        {streak > 0 ? <><span style={{ color, fontSize: '0.78rem' }}>{streak}</span>d</> : '—'}
      </div>

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
