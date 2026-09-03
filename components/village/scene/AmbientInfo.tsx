'use client'

import { format } from 'date-fns'
import { useHousehold, choreDue } from '@/lib/hooks/useHousehold'
import { useRoutines, routineDue } from '@/lib/hooks/useRoutines'
import { useCheckins } from '@/lib/hooks/useCheckins'
import { weatherMeta, type WeatherCondition } from '@/lib/village/weather'

// The quiet readout on the wall iPad when the scene has gone ambient/idle —
// a glance from across the room: the time, the date + weather, and the one
// thing the house has on today. Only mounts while `ambient` is true, so its
// hooks don't run on the interactive dashboard (2026-09-04).
export default function AmbientInfo({ spaceId, userId, timeLabel, dateLabel, weather }: {
  spaceId: string | null
  userId: string
  timeLabel: string | null
  dateLabel: string | null
  weather: { tempF: number; condition: WeatherCondition } | null
}) {
  const { chores, meals } = useHousehold(spaceId)
  const { routines } = useRoutines(spaceId)
  const { thisWeekMine } = useCheckins(userId)

  const today = format(new Date(), 'yyyy-MM-dd')
  const isSunday = new Date().getDay() === 0

  // One line, in priority order — dinner, then anything overdue, then the
  // Sunday check-in, then nothing.
  const line = (() => {
    const dinner = meals.find(m => m.meal_date === today && m.slot === 'dinner')
    if (dinner) return `Tonight — ${dinner.title}`
    const chore = chores.find(c => choreDue(c) <= 0)
    if (chore) return `${chore.name} is due`
    const routine = routines.filter(r => r.kind === 'routine').find(r => routineDue(r) <= 0)
    if (routine) return `${routine.name} is due`
    if (isSunday && !thisWeekMine) return 'Weekly check-in tonight'
    return null
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
