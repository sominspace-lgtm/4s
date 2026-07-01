'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function QuickCapture() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        setSaved(false)
        setText('')
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
    await supabase.from('captures').insert({ text: trimmed, user_id: user.id })
    setSaved(true)
    setText('')
    setTimeout(() => setOpen(false), 900)
  }

  if (!open) return null

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '520px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '1.4rem',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {saved ? (
          <div style={{ textAlign: 'center', padding: '0.5rem 0', fontSize: '0.82rem', color: 'var(--gold)', letterSpacing: '0.05em' }}>
            captured ✓
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.75rem', opacity: 0.6 }}>
              quick capture — ⌘K
            </div>
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submit()
                if (e.key === 'Escape') setOpen(false)
              }}
              placeholder="What's on your mind? Press Enter to save."
              style={{
                width: '100%', background: 'transparent', border: 'none',
                color: 'var(--text)', fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.1rem,3vw,1.4rem)', fontWeight: 300,
                outline: 'none', letterSpacing: '0.01em',
              }}
            />
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.4 }}>goes to your inbox · sort later</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <kbd style={{ fontSize: '0.58rem', color: 'var(--muted)', opacity: 0.5, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.15em 0.45em', fontFamily: 'var(--font-body)' }}>esc</kbd>
                <kbd style={{ fontSize: '0.58rem', color: 'var(--muted)', opacity: 0.5, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.15em 0.45em', fontFamily: 'var(--font-body)' }}>↵ save</kbd>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
