'use client'

import { useEffect, useRef, useState } from 'react'
import { useMail } from '@/lib/hooks/useMail'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import IconButton from '@/components/ui/IconButton'

// The household mailbox (2026-09-22) — a slide-out panel, same shell as
// ConnectPanel, opened from the header, and same self-contained pattern:
// takes just userId and resolves its own space rather than making the
// caller thread one through. Async by design (see
// supabase/migrations/mail.sql): you write something, they see it next time
// they open this or get the push, no read receipts or typing indicators —
// closer to leaving a note than to texting.
export default function MailPanel({ open, userId, onClose }: {
  open: boolean
  userId: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { spaces } = useSharedSpaces(userId)
  const spaceId = spaces[0]?.id ?? null
  const { messages, send, markRead } = useMail(spaceId)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  // Opening the mailbox is the read receipt — mark every unread message from
  // the other person read as soon as the panel is actually open, rather than
  // making that a separate action.
  useEffect(() => {
    if (!open) return
    for (const m of messages) {
      if (m.from_user_id !== userId && !m.read_by.includes(userId)) markRead(m)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, messages, userId])

  async function submit() {
    if (!draft.trim()) return
    setSending(true); setError(null)
    const e = await send(draft.trim())
    setSending(false)
    if (e) setError(e); else setDraft('')
  }

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'var(--scrim)', zIndex: 199,
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.2s',
      }} />
      <div ref={ref} style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '340px',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 200, padding: '1.5rem',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Mail</div>
          <IconButton label="Close" onClick={onClose} size={16}>✕</IconButton>
        </div>

        {!spaceId ? (
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            Create a household space first — Household → Setup, or Sharing → Spaces.
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: '0.6rem', minHeight: 0 }}>
              {messages.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
                  Nothing yet — leave a note.
                </div>
              )}
              {messages.map(m => {
                const mine = m.from_user_id === userId
                return (
                  <div key={m.id} style={{
                    alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%',
                    background: mine ? 'color-mix(in srgb, var(--gold) 14%, var(--surface2))' : 'var(--surface2)',
                    border: '1px solid var(--border)', borderRadius: '12px', padding: '0.5rem 0.7rem',
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {m.body}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.6, marginTop: '0.2rem' }}>
                      {new Date(m.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <textarea
                value={draft} onChange={e => setDraft(e.target.value)} rows={2}
                placeholder="Leave a note…"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                style={{
                  width: '100%', boxSizing: 'border-box', background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '0.55rem 0.7rem', fontSize: '0.8rem', color: 'var(--text)',
                  outline: 'none', fontFamily: 'inherit', resize: 'vertical',
                }}
              />
              <button onClick={submit} disabled={sending || !draft.trim()} className="btn btn-primary press" style={{ fontSize: '0.72rem', alignSelf: 'flex-end' }}>
                {sending ? 'Sending…' : 'Send'}
              </button>
              {error && <div style={{ fontSize: '0.68rem', color: 'var(--rose)' }}>{error}</div>}
            </div>
          </>
        )}
      </div>
    </>
  )
}
