'use client'

import { useState } from 'react'
import { useCaptures } from '@/lib/hooks/useCaptures'
import { useLang } from '@/lib/LangContext'
import { t, domainLabel } from '@/lib/i18n'

const DOMAIN_IDS = ['biz-active', 'biz-future', 'money', 'health', 'relationship', 'creative', 'home', 'self']

export default function CaptureInbox() {
  const { captures, remove, assign } = useCaptures()
  const lang = useLang()
  const [open, setOpen] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)

  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Toggle inbox (${captures.length} items)`}
        style={{
          fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
          color: captures.length > 0 ? 'var(--rose)' : 'var(--muted)',
          fontWeight: captures.length > 0 ? 600 : 400,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem',
          fontFamily: 'var(--font-body)',
        }}
      >
        <span>{t('⬤ Unsorted', lang)}</span>
        {captures.length > 0 && (
          <span style={{
            background: 'color-mix(in srgb, var(--rose) 15%, transparent)',
            color: 'var(--rose)', borderRadius: '10px', padding: '0.1em 0.55em', fontSize: '0.62rem', fontWeight: 500,
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
              {t('Nothing captured yet', lang)}
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
                  <option value="">{t('Assign to…', lang)}</option>
                  {DOMAIN_IDS.map(id => <option key={id} value={id}>{domainLabel(id, lang)}</option>)}
                </select>
              ) : (
                <button onClick={() => setAssigning(c.id)} style={{
                  fontSize: '0.65rem', letterSpacing: '0.06em', color: 'var(--muted)',
                  background: 'none', border: '1px solid var(--border)', borderRadius: '6px',
                  padding: '0.2em 0.5em', cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>
                  {t('assign', lang)}
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
