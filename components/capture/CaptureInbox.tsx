'use client'

import { useState } from 'react'
import { useCaptures } from '@/lib/hooks/useCaptures'

const DOMAINS = [
  { id: 'biz-active', label: 'Business (Active)' },
  { id: 'biz-future', label: 'Business (Future)' },
  { id: 'money', label: 'Money' },
  { id: 'health', label: 'Health' },
  { id: 'relationship', label: 'Relationship' },
  { id: 'creative', label: 'Creative' },
  { id: 'home', label: 'Home' },
  { id: 'self', label: 'Self' },
]

export default function CaptureInbox() {
  const { captures, remove, assign } = useCaptures()
  const [open, setOpen] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)

  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Toggle inbox (${captures.length} items)`}
        style={{
          fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer',
          padding: '0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem',
          fontFamily: 'var(--font-body)',
        }}
      >
        <span>Unsorted</span>
        {captures.length > 0 && (
          <span style={{
            background: 'rgba(232,160,192,0.15)', color: 'var(--gold)',
            borderRadius: '10px', padding: '0.1em 0.5em', fontSize: '0.6rem',
          }}>
            {captures.length}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '0.8rem 1rem', marginTop: '0.4rem',
        }}>
          {captures.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem 0' }}>
              Nothing captured yet
            </div>
          ) : captures.map(c => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.4rem 0', borderBottom: '1px solid var(--faint)',
              fontSize: '0.8rem', color: 'var(--muted)',
            }}>
              <span style={{ flex: 1 }}>{c.text}</span>
              {assigning === c.id ? (
                <select
                  autoFocus
                  defaultValue=""
                  onBlur={() => setAssigning(null)}
                  onChange={e => { if (e.target.value) { assign(c.id, e.target.value); setAssigning(null) } }}
                  style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: '6px', color: 'var(--text)', fontFamily: 'var(--font-body)',
                    fontSize: '0.72rem', padding: '0.2em 0.4em', outline: 'none',
                  }}
                >
                  <option value="">Assign to…</option>
                  {DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              ) : (
                <button onClick={() => setAssigning(c.id)} style={{
                  fontSize: '0.65rem', letterSpacing: '0.06em', color: 'var(--muted)',
                  background: 'none', border: '1px solid var(--border)', borderRadius: '6px',
                  padding: '0.2em 0.5em', cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>
                  assign
                </button>
              )}
              <button onClick={() => remove(c.id)} aria-label="Delete capture" style={{
                fontSize: '0.65rem', color: 'var(--muted)', background: 'none',
                border: 'none', cursor: 'pointer', opacity: 0.5,
              }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
