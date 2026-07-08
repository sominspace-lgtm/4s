'use client'

import { useEffect, useState } from 'react'

// Box breathing (4-4-4-4). The circle scales over the in/out phases and rests
// during holds; reduced-motion users still get the cycling label. Calm, not
// clinical — this appears when someone says they're overwhelmed.
const PHASES = [
  { label: 'Breathe in', ms: 4000, scale: 1.55 },
  { label: 'Hold',       ms: 4000, scale: 1.55 },
  { label: 'Breathe out', ms: 4000, scale: 1 },
  { label: 'Hold',       ms: 4000, scale: 1 },
]

export default function Breathing() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setI(v => (v + 1) % PHASES.length), PHASES[i].ms)
    return () => clearTimeout(t)
  }, [i])
  const phase = PHASES[i]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.9rem', padding: '0.6rem 0' }}>
      <div style={{ width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'color-mix(in srgb, var(--emerald) 16%, transparent)',
          border: '1px solid color-mix(in srgb, var(--emerald) 40%, transparent)',
          transform: `scale(${phase.scale})`,
          transition: `transform ${phase.ms}ms ease-in-out`,
        }} />
      </div>
      <div style={{ fontSize: '0.8rem', letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase' }}>{phase.label}</div>
    </div>
  )
}
