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

  // Small = just the time, a discreet tag in the corner. Big (idle) = the
  // full readout. Fixed rem sizes, not vw (round 81) — the wall renders
  // the scene at many sizes and a vw-relative font blew this card up on
  // the narrow ones, covering the picture (round 82, 2026-09-06).
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', top: ambient ? '5%' : '3.5%', left: ambient ? '5%' : '3.5%', zIndex: 3,
        display: 'flex', flexDirection: 'column', gap: ambient ? 3 : 1,
        maxWidth: ambient ? '12rem' : '9rem',
        pointerEvents: 'none', textAlign: 'left',
        padding: ambient ? '0.85rem 1.05rem' : '0.28rem 0.5rem',
        borderRadius: ambient ? 16 : 10,
        background: ambient ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
        border: `1px solid rgba(255,255,255,${ambient ? 0.2 : 0.14})`,
        backdropFilter: 'blur(10px) saturate(1.1)', WebkitBackdropFilter: 'blur(10px) saturate(1.1)',
        boxShadow: ambient ? '0 12px 34px rgba(0,0,0,0.3)' : '0 4px 14px rgba(0,0,0,0.2)',
        color: '#fff', fontFamily: 'var(--font-body)',
        textShadow: '0 1px 8px rgba(0,0,0,0.45)',
        transition: 'all 500ms ease',
      }}
    >
      {timeLabel && (
        <div style={{ fontSize: ambient ? '1.9rem' : '0.82rem', fontWeight: 300, letterSpacing: '0.01em', lineHeight: 1, whiteSpace: 'nowrap' }}>
          {timeLabel}
        </div>
      )}
      {/* Date + weather ride under the time in both states. The what's-on
          line stays idle-only so the small tag never grows enough to sit
          over the cottage or the districts. */}
      {ambient
        ? (dateLabel || weatherStr) && (
          <div style={{ fontSize: '0.74rem', opacity: 0.9, whiteSpace: 'nowrap' }}>
            {[dateLabel, weatherStr].filter(Boolean).join('  ·  ')}
          </div>
        )
        : (
          <>
            {dateLabel && <div style={{ fontSize: '0.58rem', opacity: 0.9, whiteSpace: 'nowrap', lineHeight: 1.25 }}>{dateLabel}</div>}
            {weatherStr && <div style={{ fontSize: '0.58rem', opacity: 0.9, whiteSpace: 'nowrap', lineHeight: 1.25 }}>{weatherStr}</div>}
          </>
        )}
      {ambient && line && (
        <div style={{ fontSize: '0.7rem', opacity: 0.85, marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {line}
        </div>
      )}
    </div>
  )
}
