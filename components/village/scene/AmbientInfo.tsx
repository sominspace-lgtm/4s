'use client'

import { useHousehold, choreDue, dinnerFor } from '@/lib/hooks/useHousehold'
import { useRoutines, routineDue } from '@/lib/hooks/useRoutines'
import { useCheckins } from '@/lib/hooks/useCheckins'
import { weatherMeta, type WeatherCondition } from '@/lib/village/weather'

// A persistent glass readout in the sky's top-left corner (2026-09-04,
// was idle-only and centered) — the time, date, weather, and the one
// thing the house has on, visible whenever you're looking at the village
// in home mode. Grows and the scene dims around it once the wall goes
// idle (`ambient`), so the same small habit of glancing at the corner
// becomes the whole point of the picture from across the room.
export default function AmbientInfo({ spaceId, userId, timeLabel, dateLabel, weather, partOfDay = 'day', binLine = null, ambient = false }: {
  spaceId: string | null
  userId: string
  timeLabel: string | null
  dateLabel: string | null
  weather: { tempF: number; condition: WeatherCondition } | null
  /** From Village.tsx's clock — reorders which single line leads. */
  partOfDay?: 'morning' | 'day' | 'evening' | 'night'
  /** "Bins out this morning" / "Bins out tonight", or null. */
  binLine?: string | null
  /** The wall has gone idle — grow the card, same content. */
  ambient?: boolean
}) {
  const { chores, meals } = useHousehold(spaceId)
  const { routines } = useRoutines(spaceId)
  const { thisWeekMine } = useCheckins(userId)

  const isSunday = new Date().getDay() === 0

  // One line, priority reordered by time of day. Morning leads with what
  // you act on before leaving (bins, an overdue task); evening leads with
  // dinner and the check-in.
  const line = (() => {
    const dinner = dinnerFor(meals)
    const chore = chores.find(c => choreDue(c) <= 0)
    const routine = routines.filter(r => r.kind === 'routine').find(r => routineDue(r) <= 0)
    const dueName = chore?.name ?? routine?.name ?? null
    const checkin = isSunday && !thisWeekMine ? 'Weekly check-in tonight' : null

    if (partOfDay === 'morning') {
      if (binLine) return binLine
      if (dueName) return `${dueName} is due`
      if (dinner) return `Tonight — ${dinner.title}`
      return checkin
    }
    if (partOfDay === 'evening') {
      if (dinner) return `${dinner.title} for dinner`
      if (checkin) return checkin
      if (binLine) return binLine
      if (dueName) return `${dueName} is due`
      return null
    }
    // day / night — the original order
    if (dinner) return `Tonight — ${dinner.title}`
    if (binLine) return binLine
    if (dueName) return `${dueName} is due`
    return checkin
  })()

  const weatherStr = weather ? `${Math.round(weather.tempF)}° · ${weatherMeta(weather.condition).label}` : null

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', top: ambient ? '6%' : '4%', left: ambient ? '6%' : '4%', zIndex: 3,
        display: 'flex', flexDirection: 'column', gap: 2,
        pointerEvents: 'none', textAlign: 'left',
        padding: ambient ? '1rem 1.3rem' : '0.5rem 0.8rem',
        borderRadius: ambient ? 18 : 14,
        background: 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.20)',
        backdropFilter: 'blur(12px) saturate(1.15)', WebkitBackdropFilter: 'blur(12px) saturate(1.15)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.2)',
        color: '#fff', fontFamily: 'var(--font-body)',
        textShadow: '0 1px 8px rgba(0,0,0,0.4)',
        transition: 'all 600ms ease',
      }}
    >
      {timeLabel && (
        <div style={{ fontSize: ambient ? 'clamp(2.4rem, 7vw, 4rem)' : 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: 300, letterSpacing: '0.01em', lineHeight: 1 }}>
          {timeLabel}
        </div>
      )}
      {(dateLabel || weatherStr) && (
        <div style={{ fontSize: ambient ? 'clamp(0.85rem, 2.2vw, 1.05rem)' : '0.68rem', opacity: 0.9 }}>
          {[dateLabel, weatherStr].filter(Boolean).join('  ·  ')}
        </div>
      )}
      {line && (
        <div style={{ fontSize: ambient ? 'clamp(0.78rem, 2vw, 0.92rem)' : '0.64rem', opacity: 0.85, marginTop: ambient ? '0.3rem' : 0 }}>
          {line}
        </div>
      )}
    </div>
  )
}
