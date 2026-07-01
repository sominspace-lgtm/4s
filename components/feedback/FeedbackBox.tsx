'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function FeedbackBox() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function submit() {
    if (!text.trim()) return
    setSending(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSending(false); return }
    await supabase.from('feedback').insert({ user_id: user.id, text: text.trim() })
    setText(''); setSent(true); setSending(false)
    setTimeout(() => { setSent(false); setOpen(false) }, 2500)
  }

  return (
    <div style={{
      marginTop: '3rem', borderTop: '1px solid var(--faint)', paddingTop: '2rem',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
    }}>
      <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.4 }}>
        suggestions &amp; feedback
      </div>

      {!open && !sent && (
        <button onClick={() => setOpen(true)} style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: '10px',
          padding: '0.55rem 1.2rem', color: 'var(--muted)', fontFamily: 'var(--font-body)',
          fontSize: '0.75rem', cursor: 'pointer', opacity: 0.6,
        }}>
          Share an idea or report something →
        </button>
      )}

      {sent && (
        <div style={{ fontSize: '0.78rem', color: 'var(--emerald)', fontFamily: 'var(--font-body)' }}>
          Got it — thank you ✓
        </div>
      )}

      {open && !sent && (
        <div style={{
          width: '100%', maxWidth: '560px', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: '14px', padding: '1.2rem',
          display: 'flex', flexDirection: 'column', gap: '0.7rem',
        }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="What would make 4S better? Bug, feature idea, anything…"
            rows={3}
            autoFocus
            style={{
              width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: '8px', color: 'var(--text)', fontFamily: 'var(--font-body)',
              fontSize: '0.82rem', padding: '0.65rem 0.85rem', outline: 'none',
              resize: 'none', lineHeight: 1.6,
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => { setOpen(false); setText('') }} style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
              padding: '0.4rem 0.9rem', color: 'var(--muted)', fontFamily: 'var(--font-body)',
              fontSize: '0.72rem', cursor: 'pointer',
            }}>cancel</button>
            <button onClick={submit} disabled={!text.trim() || sending} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px',
              padding: '0.4rem 0.9rem', color: 'var(--text)', fontFamily: 'var(--font-body)',
              fontSize: '0.72rem', cursor: text.trim() ? 'pointer' : 'default',
              opacity: text.trim() ? 1 : 0.4,
            }}>{sending ? 'sending…' : 'send'}</button>
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.3, fontFamily: 'var(--font-body)' }}>
        I read every message.
      </p>
    </div>
  )
}
