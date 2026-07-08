'use client'

import { useEffect, useRef } from 'react'

interface SnoozeMenuProps {
  open: boolean
  onClose: () => void
  onSnooze: (days: number) => void
}

export default function SnoozeMenu({ open, onClose, onSnooze }: SnoozeMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  const opts = [{ label: '1 day', days: 1 }, { label: '3 days', days: 3 }, { label: '1 week', days: 7 }]

  return (
    <div ref={ref} style={{
      position: 'absolute', right: 0, top: '100%', zIndex: 10,
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: '8px', padding: '0.4rem',
      display: 'flex', flexDirection: 'column', gap: '0.3rem',
      minWidth: '80px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      {opts.map(o => (
        <button key={o.days} onClick={() => { onSnooze(o.days); onClose() }} style={{
          fontSize: '0.7rem', color: 'var(--muted)', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', padding: '0.25rem 0.4rem',
          borderRadius: '5px', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
