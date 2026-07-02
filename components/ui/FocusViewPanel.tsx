'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SectionConfig, FocusConfig } from './CustomizePanel'

interface FocusViewPanelProps {
  open: boolean
  sections: SectionConfig[]
  focusConfig: FocusConfig
  simpleMode: boolean
  userId: string
  onChange: (config: FocusConfig) => void
  onClose: () => void
}

export default function FocusViewPanel({ open, sections, focusConfig, simpleMode, userId, onChange, onClose }: FocusViewPanelProps) {
  const supabase = createClient()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  async function update(next: FocusConfig) {
    onChange(next)
    await supabase.from('user_prefs').upsert({ user_id: userId, layout: { sections, focus: next, simpleMode } })
  }

  function toggleSection(id: string) {
    const has = focusConfig.sections.includes(id)
    update({ ...focusConfig, sections: has ? focusConfig.sections.filter(s => s !== id) : [...focusConfig.sections, id] })
  }

  function toggleTimer() {
    update({ ...focusConfig, showTimer: !focusConfig.showTimer })
  }

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 199, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.2s',
      }} />

      <div ref={ref} style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '300px',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 200, padding: '1.5rem',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Configure focus view
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
          }}>✕</button>
        </div>

        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.6, marginBottom: '0.5rem', lineHeight: 1.6 }}>
          Pick what shows when Focus View is on — everything else stays hidden until you exit.
        </div>

        <div style={{ fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.5, marginTop: '0.5rem' }}>
          Sections
        </div>
        {sections.map(s => {
          const active = focusConfig.sections.includes(s.id)
          return (
            <button
              key={s.id}
              onClick={() => toggleSection(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem', textAlign: 'left',
                padding: '0.5rem 0.7rem', borderRadius: '8px', cursor: 'pointer',
                background: active ? 'color-mix(in srgb, var(--gold) 8%, transparent)' : 'transparent',
                border: `1px solid ${active ? 'color-mix(in srgb, var(--gold) 30%, transparent)' : 'var(--border)'}`,
              }}
            >
              <div style={{
                width: 14, height: 14, borderRadius: '4px', flexShrink: 0,
                border: `1.5px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                background: active ? 'var(--gold)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {active && <span style={{ fontSize: '0.5rem', color: 'var(--bg)', lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: '0.75rem', color: active ? 'var(--text)' : 'var(--muted)' }}>{s.label}</span>
            </button>
          )
        })}

        <div style={{ fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.5, marginTop: '1rem' }}>
          Widgets
        </div>
        <button
          onClick={toggleTimer}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem', textAlign: 'left',
            padding: '0.5rem 0.7rem', borderRadius: '8px', cursor: 'pointer',
            background: focusConfig.showTimer ? 'color-mix(in srgb, var(--gold) 8%, transparent)' : 'transparent',
            border: `1px solid ${focusConfig.showTimer ? 'color-mix(in srgb, var(--gold) 30%, transparent)' : 'var(--border)'}`,
          }}
        >
          <div style={{
            width: 14, height: 14, borderRadius: '4px', flexShrink: 0,
            border: `1.5px solid ${focusConfig.showTimer ? 'var(--gold)' : 'var(--border)'}`,
            background: focusConfig.showTimer ? 'var(--gold)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {focusConfig.showTimer && <span style={{ fontSize: '0.5rem', color: 'var(--bg)', lineHeight: 1 }}>✓</span>}
          </div>
          <span style={{ fontSize: '0.75rem', color: focusConfig.showTimer ? 'var(--text)' : 'var(--muted)' }}>◔ Timer</span>
        </button>
      </div>
    </>
  )
}
