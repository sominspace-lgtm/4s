'use client'

import { useEffect } from 'react'
import type { Milestone } from '@/lib/village/milestones'

// A brief, self-dismissing note over the village when something crossed a
// line — a habit becoming a tree, a monthly/yearly anniversary. One at a
// time, never a backlog; `onAck` records it so it doesn't fire again.
export default function MilestoneMoment({ milestone, onAck }: {
  milestone: Milestone
  onAck: (id: string) => void
}) {
  const big = milestone.kind === 'anniv-year'
  useEffect(() => {
    const t = setTimeout(() => onAck(milestone.id), big ? 5200 : 3000)
    return () => clearTimeout(t)
  }, [milestone.id, big, onAck])

  return (
    <div
      onClick={() => onAck(milestone.id)}
      style={{
        position: 'absolute', inset: 0, zIndex: 4, display: 'flex',
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }}
    >
      <div
        className="praise"
        style={{
          background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
          border: `1px solid color-mix(in srgb, var(--gold) ${big ? 40 : 22}%, var(--border))`,
          borderRadius: '14px', padding: big ? '1rem 1.6rem' : '0.7rem 1.1rem',
          boxShadow: '0 18px 48px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
          textAlign: 'center', maxWidth: 'calc(100% - 2rem)',
          animationDuration: big ? '5200ms' : '3000ms',
        }}
      >
        {big && <span aria-hidden style={{ color: 'var(--gold)', fontSize: '1.1rem' }}>✦</span>}
        <span style={{
          fontFamily: 'var(--font-display, var(--font-body))',
          fontSize: big ? 'clamp(1.1rem, 4vw, 1.6rem)' : 'clamp(0.85rem, 3vw, 1.05rem)',
          color: 'var(--text)', fontWeight: 400,
        }}>{milestone.label}</span>
      </div>
    </div>
  )
}
