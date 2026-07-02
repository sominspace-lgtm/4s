'use client'

import { useState, useEffect, useRef } from 'react'
import { useCaptures } from '@/lib/hooks/useCaptures'
import { useWorkItems } from '@/lib/hooks/useWorkItems'
import { useWatchItems } from '@/lib/hooks/useWatchItems'
import { useLang } from '@/lib/LangContext'
import { t, domainLabel } from '@/lib/i18n'

const DOMAIN_IDS = ['biz-active', 'biz-future', 'money', 'health', 'relationship', 'creative', 'home', 'self']

export default function CaptureSection() {
  const { captures, add, remove, assign } = useCaptures()
  const { add: addTask } = useWorkItems()
  const { add: addWish } = useWatchItems()
  const lang = useLang()
  const [text, setText] = useState('')
  const [domain, setDomain] = useState('')
  const [open, setOpen] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onFocusRequest() { inputRef.current?.focus() }
    window.addEventListener('app:focus-capture', onFocusRequest)
    return () => window.removeEventListener('app:focus-capture', onFocusRequest)
  }, [])

  useEffect(() => {
    function onOpenRequest() { setOpen(true) }
    window.addEventListener('app:open-inbox', onOpenRequest)
    return () => window.removeEventListener('app:open-inbox', onOpenRequest)
  }, [])

  async function handleKey(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' || !text.trim()) return
    await add(text.trim(), domain || undefined)
    setText('')
    setDomain('')
    setOpen(true)
  }

  async function makeTask(captureId: string, text: string) {
    await addTask({ title: text, notes: null, due_date: null, priority: 2, domain: null, recur_days: null })
    await remove(captureId)
  }

  async function makeWishlist(captureId: string, text: string) {
    await addWish('price', text, '')
    await remove(captureId)
  }

  return (
    <>
      {/* Capture bar */}
      <div style={{
        display: 'flex', gap: '0.6rem', alignItems: 'center',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '0.7rem 1rem', marginBottom: '0.4rem',
      }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', flexShrink: 0, userSelect: 'none' }}>◌</span>
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={t('Brain full? Drop it here — we’ll organize it later.', lang)}
          aria-label="Quick capture"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 300,
          }}
        />
        <select
          value={domain}
          onChange={e => setDomain(e.target.value)}
          title="Optionally assign a domain now"
          style={{
            background: 'transparent', border: 'none', borderBottom: '1px solid var(--faint)',
            outline: 'none', fontSize: '0.65rem', color: domain ? 'var(--muted)' : 'var(--faint)',
            fontFamily: 'var(--font-body)', cursor: 'pointer', padding: '0.1em 0.2em',
            appearance: 'none', WebkitAppearance: 'none', flexShrink: 0,
          }}
        >
          <option value="">{t('+ domain', lang)}</option>
          {DOMAIN_IDS.map(id => <option key={id} value={id}>{domainLabel(id, lang)}</option>)}
        </select>
        <span style={{ fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.6, flexShrink: 0 }}>{t('↵ enter', lang)}</span>
      </div>

      {/* Inbox */}
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
          <span>{t('Inbox', lang)}</span>
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
                {t('Nothing waiting here. Good sign.', lang)}
              </div>
            ) : captures.map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.4rem 0', borderBottom: '1px solid var(--faint)',
                fontSize: '0.8rem', color: 'var(--muted)',
              }}>
                <span style={{ flex: 1, color: 'var(--text)' }}>{c.text}</span>
                <button onClick={() => makeTask(c.id, c.text)} title="Make this a task" style={{
                  fontSize: '0.65rem', color: 'var(--muted)', background: 'none',
                  border: '1px solid var(--border)', borderRadius: '6px',
                  padding: '0.2em 0.5em', cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>→ task</button>
                <button onClick={() => makeWishlist(c.id, c.text)} title="Add to wishlist" style={{
                  fontSize: '0.65rem', color: 'var(--muted)', background: 'none',
                  border: '1px solid var(--border)', borderRadius: '6px',
                  padding: '0.2em 0.5em', cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>→ wishlist</button>
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
                    fontSize: '0.65rem', color: 'var(--muted)', background: 'none',
                    border: '1px solid var(--border)', borderRadius: '6px',
                    padding: '0.2em 0.5em', cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}>
                    {t('assign', lang)}
                  </button>
                )}
                <button onClick={() => remove(c.id)} aria-label="Delete" style={{
                  fontSize: '0.65rem', color: 'var(--muted)', background: 'none',
                  border: 'none', cursor: 'pointer', opacity: 0.5,
                }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
