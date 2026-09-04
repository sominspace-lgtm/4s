'use client'

import { useHousehold, choreDue, dinnerFor } from '@/lib/hooks/useHousehold'
import { useRoutines, routineDue } from '@/lib/hooks/useRoutines'
import { useCheckins } from '@/lib/hooks/useCheckins'
import { weatherMeta, type WeatherCondition } from '@/lib/village/weather'

// The quiet readout on the wall iPad when the scene has gone ambient/idle —
// a glance from across the room: the time, the date + weather, and the one
// thing the house has on today. Only mounts while `ambient` is true, so its
// hooks don't run on the interactive dashboard (2026-09-04).
export default function AmbientInfo({ spaceId, userId, timeLabel, dateLabel, weather, partOfDay = 'day', binLine = null }: {
  spaceId: string | null
  userId: string
  timeLabel: string | null
  dateLabel: string | null
  weather: { tempF: number; condition: WeatherCondition } | null
  /** From Village.tsx's clock — reorders which single line leads. */
  partOfDay?: 'morning' | 'day' | 'evening' | 'night'
  /** "Bins out this morning" / "Bins out tonight", or null. */
  binLine?: string | null
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
        position: 'absolute', top: '7%', left: 0, right: 0, zIndex: 3,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem',
        pointerEvents: 'none', textAlign: 'center', padding: '0 1rem',
        color: '#fff', fontFamily: 'var(--font-body)',
        textShadow: '0 1px 12px rgba(0,0,0,0.45), 0 0 2px rgba(0,0,0,0.3)',
      }}
    >
      {timeLabel && (
        <div style={{ fontSize: 'clamp(2.2rem, 7vw, 4rem)', fontWeight: 300, letterSpacing: '0.01em', lineHeight: 1 }}>
          {timeLabel}
        </div>
      )}
      {(dateLabel || weatherStr) && (
        <div style={{ fontSize: 'clamp(0.8rem, 2.2vw, 1.05rem)', opacity: 0.9, marginTop: '0.3rem' }}>
          {[dateLabel, weatherStr].filter(Boolean).join('  ·  ')}
        </div>
      )}
      {line && (
        <div style={{ fontSize: 'clamp(0.75rem, 2vw, 0.95rem)', opacity: 0.85, marginTop: '0.55rem' }}>
          {line}
        </div>
      )}
    </div>
  )
}
