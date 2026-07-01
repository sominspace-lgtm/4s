'use client'

import { useState } from 'react'

interface Props {
  onCapture: () => void
  onSearch: () => void
  onFocus: () => void
}

export default function MobileNav({ onCapture, onSearch, onFocus }: Props) {
  const [open, setOpen] = useState(false)

  const actions = [
    { icon: '⌕', label: 'search', onClick: () => { setOpen(false); onSearch() } },
    { icon: '◎', label: 'focus', onClick: () => { setOpen(false); onFocus() } },
    { icon: '○', label: 'capture', onClick: () => { setOpen(false); onCapture() } },
  ]

  return (
    <div className="mobile-nav" style={{
      position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 490,
    }}>
      {/* Sub-actions */}
      {open && (
        <div style={{ position: 'absolute', bottom: '4rem', right: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-end' }}>
          {actions.map(a => (
            <button
              key={a.label}
              onClick={a.onClick}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.55rem 1rem', borderRadius: '99px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: '0.85rem' }}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 52, height: 52, borderRadius: '50%',
          background: open ? 'var(--surface2)' : 'var(--gold)',
          border: `1px solid ${open ? 'var(--border)' : 'transparent'}`,
          color: open ? 'var(--muted)' : 'var(--bg)',
          fontSize: '1.3rem', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        aria-label="Quick actions"
      >
        {open ? '✕' : '+'}
      </button>
    </div>
  )
}
