'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CheckItem {
  id: string
  label: string
  hint: string
}

const ITEMS: CheckItem[] = [
  { id: 'theme',     label: 'Pick your theme',         hint: 'Open settings → theme' },
  { id: 'name',      label: 'Set your display name',   hint: 'Open account page' },
  { id: 'habit',     label: 'Add your first habit',    hint: 'Scroll to Daily Habits' },
  { id: 'capture',   label: 'Capture your first idea', hint: 'Use Quick Capture at the top' },
  { id: 'domain',    label: 'Explore your domains',    hint: 'Open any domain tile' },
]

interface Props {
  userId: string
}

export default function OnboardingChecklist({ userId }: Props) {
  const supabase = createClient()
  const [checked,  setChecked]  = useState<string[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    supabase.from('user_prefs').select('onboarding').eq('user_id', userId).single()
      .then(({ data }) => {
        const saved = data?.onboarding as { checked?: string[]; dismissed?: boolean } | null
        if (saved?.dismissed) { setDismissed(true) }
        setChecked(saved?.checked ?? [])
        setLoading(false)
      })
  }, [userId])

  async function toggle(id: string) {
    const next = checked.includes(id) ? checked.filter(c => c !== id) : [...checked, id]
    setChecked(next)
    await supabase.from('user_prefs').upsert({ user_id: userId, onboarding: { checked: next } })
  }

  async function dismiss() {
    setDismissed(true)
    await supabase.from('user_prefs').upsert({ user_id: userId, onboarding: { checked, dismissed: true } })
  }

  if (loading || dismissed) return null
  if (checked.length === ITEMS.length) return null  // all done — auto-hide

  const done = checked.length
  const total = ITEMS.length
  const pct = done / total

  return (
    <div style={{
      border: '1px solid color-mix(in srgb, var(--gold) 25%, var(--border))',
      borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1rem',
      background: 'color-mix(in srgb, var(--gold) 4%, var(--surface))',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
            <svg width="28" height="28" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="14" cy="14" r="11" fill="none" stroke="var(--border)" strokeWidth="2" />
              <circle
                cx="14" cy="14" r="11" fill="none"
                stroke="var(--gold)" strokeWidth="2"
                strokeDasharray={2 * Math.PI * 11}
                strokeDashoffset={2 * Math.PI * 11 * (1 - pct)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.4s' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: 'var(--gold)' }}>{done}/{total}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>Get started</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.6 }}>{total - done} step{total - done !== 1 ? 's' : ''} remaining</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={e => { e.stopPropagation(); dismiss() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.65rem', opacity: 0.4 }}>dismiss</button>
          <span style={{ color: 'var(--muted)', fontSize: '0.65rem', opacity: 0.4 }}>{expanded ? '▾' : '▸'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.85rem' }}>
          {ITEMS.map(item => {
            const done = checked.includes(item.id)
            return (
              <div
                key={item.id}
                onClick={() => toggle(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem',
                  padding: '0.5rem 0.65rem', borderRadius: '9px', cursor: 'pointer',
                  background: done ? 'color-mix(in srgb, var(--gold) 6%, transparent)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  border: `1.5px solid ${done ? 'var(--gold)' : 'var(--border)'}`,
                  background: done ? 'var(--gold)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {done && <span style={{ fontSize: '0.5rem', color: 'var(--bg)', lineHeight: 1 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: done ? 'var(--muted)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1 }}>{item.label}</div>
                  {!done && <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.5 }}>{item.hint}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
