'use client'

import { useEffect, useRef, useState } from 'react'

// A little signboard near the door, shown on the scene only while hosting a
// gathering (2026-09-04). Tap it for wifi + whatever the hosts wrote under
// "house notes" (bathroom's down the hall, help yourself to the kitchen).
// No personal data, no PIN — it's for the guests. Stays hidden until
// tapped, and minimizes itself again — either you tap elsewhere, or it's
// been open a while with nobody touching it (round 80, 2026-09-04).
const IDLE_CLOSE_MS = 8000

export default function HouseInfo({ x, y, info }: {
  x: number
  y: number
  info: { wifiName?: string; wifiPassword?: string; notes?: string }
}) {
  const [open, setOpen] = useState(false)
  const hasWifi = !!(info.wifiName || info.wifiPassword)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null }
    if (open) idleTimer.current = setTimeout(() => setOpen(false), IDLE_CLOSE_MS)
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current) }
  }, [open])

  if (!hasWifi && !info.notes) return null

  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Signpost */}
      <g onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }} className="village-entity">
        <title>House info for guests</title>
        <rect x={-1.5} y={-2} width={3} height={14} rx={1} fill="#8a6f52" />
        <rect x={-16} y={-12} width={32} height={11} rx={2.5} fill="var(--surface)" stroke="var(--border)" strokeWidth={1} />
        <text x={0} y={-4.2} textAnchor="middle" fontSize={5.4} fill="var(--text)" fontFamily="var(--font-body)">House info</text>
        <ellipse cx={0} cy={13} rx={7} ry={1.6} fill="var(--text)" opacity={0.1} />
      </g>

      {open && (
        <>
          {/* Tap anywhere else in the scene to close, same idiom as the
              other in-scene cards (Somi, References, ping). */}
          <rect x={-2000} y={-2000} width={4000} height={4000} fill="transparent"
            style={{ pointerEvents: 'all' }} onClick={() => setOpen(false)} />
          <foreignObject x={-70} y={-96} width={140} height={82} style={{ overflow: 'visible' }}>
            <div
              onClick={e => { e.stopPropagation(); setOpen(false) }}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '0.55rem 0.7rem', fontFamily: 'var(--font-body)', color: 'var(--text)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.28)', fontSize: '0.62rem', lineHeight: 1.5,
                display: 'flex', flexDirection: 'column', gap: '0.2rem',
              }}
            >
              {hasWifi && (
                <div>
                  <span style={{ color: 'var(--muted)' }}>Wifi</span>{' '}
                  {info.wifiName ?? ''}{info.wifiPassword ? ` · ${info.wifiPassword}` : ''}
                </div>
              )}
              {info.notes && <div style={{ color: 'var(--muted)' }}>{info.notes}</div>}
            </div>
          </foreignObject>
        </>
      )}
    </g>
  )
}
