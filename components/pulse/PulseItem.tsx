'use client'

import { useState } from 'react'
import { isToday, parseISO } from 'date-fns'
import SourceBadge from '@/components/ui/SourceBadge'
import SnoozeMenu from '@/components/ui/SnoozeMenu'
import type { FocusItem } from '@/lib/hooks/useFocusItems'

export default function PulseItem({ item, onSnooze }: { item: FocusItem; onSnooze: (id: string, days: number) => void }) {
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const isCarryover = !isToday(parseISO(item.first_seen))

  return (
    <div style={{ fontSize: '0.82rem', color: 'var(--text)', padding: '0.28rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem', lineHeight: 1.4, position: 'relative' }}
      onMouseEnter={e => (e.currentTarget.querySelector<HTMLElement>('.snooze-btn')!.style.opacity = '0.6')}
      onMouseLeave={e => (e.currentTarget.querySelector<HTMLElement>('.snooze-btn')!.style.opacity = '0')}
    >
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{item.text}</span>
      {isCarryover && <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.7, flexShrink: 0 }}>↺</span>}
      <SourceBadge source={item.source as 'manual' | 'synced' | 'bot'} />
      <button
        className="snooze-btn"
        onClick={() => setSnoozeOpen(o => !o)}
        aria-label="Snooze item"
        style={{ fontSize: '0.6rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.1rem', opacity: 0, transition: 'opacity 0.15s', fontFamily: 'var(--font-body)', flexShrink: 0 }}
      >
        zzz
      </button>
      <SnoozeMenu open={snoozeOpen} onClose={() => setSnoozeOpen(false)} onSnooze={days => onSnooze(item.id, days)} />
    </div>
  )
}
