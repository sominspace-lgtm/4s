'use client'

import { useEffect, useState } from 'react'
import { useMail } from '@/lib/hooks/useMail'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// The mailbox itself (2026-09-24) — supabase/migrations/mail.sql and
// lib/hooks/useMail.ts both landed already; this is the screen that was
// missing. An async mailbox, not a chat, per that migration's own header
// comment: no typing indicator, no thread — you leave a message, the other
// person sees it next time they open this or the push arrives (sending
// already pushes everyone else in the space, see app/api/mail/send).
//
// Same spaceId resolution as PlacesHub/HouseholdHub — the space with an
// accepted member, not spaces[0] (which can be an empty solo space).
export default function MailHub({ userId }: { userId: string }) {
  const { spaces, members } = useSharedSpaces(userId)
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id
    ?? spaces[0]?.id ?? null
  const { messages, unread, loading, userId: viewerId, send, markRead } = useMail(spaceId)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Opening the mailbox is what "reads" it, the same as any inbox — no
  // per-message click needed to clear the unread state.
  useEffect(() => {
    for (const m of unread) markRead(m)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- markRead itself changes `messages`, which would re-trigger this on every read; only unread's identity should drive it.
  }, [unread])

  async function submit() {
    const body = draft.trim()
    if (!body) return
    setSending(true)
    setError(await send(body))
    setSending(false)
    if (!error) setDraft('')
  }

  if (!spaceId) {
    return (
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        Mail needs a household to send it to — create or accept a shared space in People → Spaces first.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <textarea
          value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
          placeholder="Leave a message…" rows={2}
          style={{
            flex: 1, resize: 'vertical', boxSizing: 'border-box',
            background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
            padding: '0.6rem 0.75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', outline: 'none',
          }}
        />
        <button onClick={submit} disabled={sending || !draft.trim()} className="btn btn-primary press" style={{ fontSize: '0.74rem', alignSelf: 'flex-end' }}>
          {sending ? '…' : 'Send'}
        </button>
      </div>
      {error && <div style={{ fontSize: '0.7rem', color: 'var(--rose)' }}>{error}</div>}

      {messages.length === 0 && !loading && (
        <div style={{ fontSize: '0.76rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, textAlign: 'center', padding: '1rem 0' }}>
          Nothing yet. Leave the first one.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {messages.map(m => {
          const fromMe = m.from_user_id === viewerId
          return (
            <div key={m.id} style={{
              alignSelf: fromMe ? 'flex-end' : 'flex-start', maxWidth: '85%',
              background: fromMe ? 'color-mix(in srgb, var(--gold) 12%, var(--surface))' : 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: '12px', padding: '0.6rem 0.8rem',
            }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {m.body}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.65, marginTop: '0.3rem', textAlign: fromMe ? 'right' : 'left' }}>
                {fromMe ? 'You' : 'Your partner'} · {timeAgo(m.created_at)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
