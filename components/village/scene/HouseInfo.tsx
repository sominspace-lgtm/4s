'use client'

import { useState } from 'react'

// A little signboard near the door, shown on the scene only while hosting a
// gathering (2026-09-04). Tap it for wifi + whatever the hosts wrote under
// "house notes" (bathroom's down the hall, help yourself to the kitchen).
// No personal data, no PIN — it's for the guests.
export default function HouseInfo({ x, y, info }: {
  x: number
  y: number
  info: { wifiName?: string; wifiPassword?: string; notes?: string }
}) {
  const [open, setOpen] = useState(false)
  const hasWifi = !!(info.wifiName || info.wifiPassword)
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
        <foreignObject x={-70} y={-96} width={140} height={82} style={{ overflow: 'visible' }}>
          <div
            onClick={() => setOpen(false)}
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
      )}
    </g>
  )
}
