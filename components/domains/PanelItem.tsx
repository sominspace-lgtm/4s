'use client'

import { useState } from 'react'
import SourceBadge from '@/components/ui/SourceBadge'
import SnoozeMenu from '@/components/ui/SnoozeMenu'

interface PanelItemProps {
  tag: string
  text: string
  source?: 'manual' | 'synced' | 'bot'
  accent: string
  onSnooze?: (days: number) => void
}

export default function PanelItem({ tag, text, source = 'manual', accent, onSnooze }: PanelItemProps) {
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{ fontSize: '0.8rem', color: 'var(--muted)', padding: '0.35rem 0', borderBottom: '1px solid var(--faint)', lineHeight: 1.5, display: 'flex', gap: '0.5rem', alignItems: 'center', position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{
        fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
        color: accent, background: `color-mix(in srgb, ${accent} 10%, transparent)`,
        padding: '0.15em 0.5em', borderRadius: '4px',
      }}>{tag}</span>
      <span style={{ flex: 1 }}>{text}</span>
      <SourceBadge source={source} />
      {onSnooze && (
        <button
          onClick={() => setSnoozeOpen(o => !o)}
          aria-label="Snooze"
          style={{ fontSize: '0.6rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', opacity: hovered ? 0.5 : 0, transition: 'opacity 0.15s', fontFamily: 'var(--font-body)', flexShrink: 0 }}
        >zzz</button>
      )}
      {onSnooze && <SnoozeMenu open={snoozeOpen} onClose={() => setSnoozeOpen(false)} onSnooze={days => { onSnooze(days); setSnoozeOpen(false) }} />}
    </div>
  )
}
