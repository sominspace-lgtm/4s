'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SectionConfig {
  id: string
  label: string
  hidden: boolean
  collapsed?: boolean
}

export interface FocusConfig {
  sections: string[]
  showTimer: boolean
}

export const DEFAULT_FOCUS_CONFIG: FocusConfig = {
  sections: ['brief', 'work', 'habits', 'capture', 'calendar'],
  showTimer: false,
}

export const DEFAULT_SECTIONS: SectionConfig[] = [
  // Capture
  { id: 'capture',  label: 'Capture',            hidden: false },
  // At a glance
  { id: 'brief',    label: 'Daily Brief',        hidden: false },
  // Focus
  { id: 'work',     label: 'Work Hub',           hidden: false },
  { id: 'habits',   label: 'Daily Habits',       hidden: false },
  // Domains
  { id: 'domains',  label: 'Domains',            hidden: false },
  // Check-in
  { id: 'pulse',    label: "Today's Pulse",      hidden: false },
  // Money
  { id: 'wishlist', label: 'Wishlist',           hidden: false },
  { id: 'spending', label: 'Recurring Spending', hidden: false },
  // Review
  { id: 'calendar', label: 'Calendar',           hidden: false },
  { id: 'council',  label: 'Your Council',       hidden: false },
  // Companions
  { id: 'shared',   label: 'Shared With Me',     hidden: false },
]

interface CustomizePanelProps {
  open: boolean
  sections: SectionConfig[]
  focusConfig: FocusConfig
  userId: string
  onChange: (sections: SectionConfig[]) => void
  onClose: () => void
}

export default function CustomizePanel({ open, sections, focusConfig, userId, onChange, onClose }: CustomizePanelProps) {
  const supabase = createClient()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  async function update(next: SectionConfig[]) {
    onChange(next)
    await supabase.from('user_prefs').upsert({ user_id: userId, layout: { sections: next, focus: focusConfig } })
  }

  function toggle(id: string) {
    update(sections.map(s => s.id === id ? { ...s, hidden: !s.hidden } : s))
  }

  function move(id: string, dir: -1 | 1) {
    const idx = sections.findIndex(s => s.id === id)
    if (idx + dir < 0 || idx + dir >= sections.length) return
    const next = [...sections]
    ;[next[idx], next[idx + dir]] = [next[idx + dir], next[idx]]
    update(next)
  }

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 199, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.2s',
      }} />

      {/* Drawer */}
      <div ref={ref} style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '280px',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 200, padding: '1.5rem',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Customize layout
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
          }}>✕</button>
        </div>

        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.6, marginBottom: '0.5rem', lineHeight: 1.6 }}>
          Reorder with ↑↓ or hide sections with the eye toggle.
        </div>

        {sections.map((s, i) => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 0.7rem', borderRadius: '8px',
            background: s.hidden ? 'transparent' : 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)', opacity: s.hidden ? 0.4 : 1,
            transition: 'opacity 0.15s',
          }}>
            {/* Up/down */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <button onClick={() => move(s.id, -1)} disabled={i === 0} style={{
                background: 'none', border: 'none', color: 'var(--muted)', cursor: i === 0 ? 'default' : 'pointer',
                fontSize: '0.55rem', lineHeight: 1, padding: '1px', opacity: i === 0 ? 0.2 : 0.6,
              }}>▲</button>
              <button onClick={() => move(s.id, 1)} disabled={i === sections.length - 1} style={{
                background: 'none', border: 'none', color: 'var(--muted)', cursor: i === sections.length - 1 ? 'default' : 'pointer',
                fontSize: '0.55rem', lineHeight: 1, padding: '1px', opacity: i === sections.length - 1 ? 0.2 : 0.6,
              }}>▼</button>
            </div>

            <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text)', fontWeight: 300 }}>{s.label}</span>

            {/* Eye toggle */}
            <button onClick={() => toggle(s.id)} title={s.hidden ? 'Show section' : 'Hide section'} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.82rem', color: 'var(--muted)', opacity: s.hidden ? 0.3 : 0.7,
              padding: '2px', lineHeight: 1,
            }}>
              {s.hidden ? '🙈' : '👁'}
            </button>
          </div>
        ))}

        <button
          onClick={() => update(DEFAULT_SECTIONS)}
          style={{
            marginTop: '1rem', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer',
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: '0.68rem',
            letterSpacing: '0.05em',
          }}
        >
          Reset to default
        </button>
      </div>
    </>
  )
}
