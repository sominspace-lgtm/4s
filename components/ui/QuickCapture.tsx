'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/LangContext'
import { t } from '@/lib/i18n'

const DOMAINS_EN = [
  { id: '',             label: 'No domain — inbox' },
  { id: 'biz-active',  label: '◈ Business (Active)' },
  { id: 'biz-future',  label: '◇ Business (Future)' },
  { id: 'money',       label: '◉ Money' },
  { id: 'health',      label: '○ Health' },
  { id: 'relationship',label: '♡ Relationship' },
  { id: 'creative',    label: '✦ Creative' },
  { id: 'home',        label: '⌂ Home' },
  { id: 'self',        label: '◎ Self' },
]

export default function QuickCapture() {
  const lang = useLang()
  const DOMAINS = DOMAINS_EN.map(d => ({ ...d, label: t(d.label, lang) }))

  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [domain, setDomain] = useState('')
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        setSaved(false)
        setText('')
        setDomain('')
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  async function submit() {
    const trimmed = text.trim()
    if (!trimmed) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('captures').insert({ text: trimmed, user_id: user.id, domain: domain || null })
    setSaved(true)
    setText('')
    setDomain('')
    setTimeout(() => setOpen(false), 900)
  }

  if (!open) return null

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '540px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '20px', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {saved ? (
          <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--gold)', letterSpacing: '0.08em' }}>
            {t('captured ✓', lang)}
          </div>
        ) : (
          <>
            <div style={{ padding: '1.4rem 1.4rem 0' }}>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.85rem', opacity: 0.6 }}>
                {t('quick capture — ⌘K', lang)}
              </div>
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
                  if (e.key === 'Escape') setOpen(false)
                }}
                placeholder={t("What's on your mind?", lang)}
                rows={3}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  color: 'var(--text)', fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.05rem,3vw,1.35rem)', fontWeight: 300,
                  outline: 'none', letterSpacing: '0.01em', resize: 'none', lineHeight: 1.5,
                }}
              />
            </div>

            <div style={{ padding: '0.75rem 1.4rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <select
                value={domain}
                onChange={e => setDomain(e.target.value)}
                style={{
                  flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: '8px', color: domain ? 'var(--text)' : 'var(--muted)',
                  fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                  padding: '0.4rem 0.65rem', outline: 'none', cursor: 'pointer', appearance: 'none',
                }}
              >
                {DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>

              <button
                onClick={submit}
                disabled={!text.trim()}
                style={{
                  padding: '0.55rem 1.4rem', borderRadius: '10px', cursor: text.trim() ? 'pointer' : 'not-allowed',
                  background: text.trim() ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
                  border: 'none', color: text.trim() ? 'var(--bg)' : 'var(--muted)',
                  fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 500,
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                {t('Save ↵', lang)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
