'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCompanions } from '@/lib/hooks/useCompanions'

export function Avatar({ email, color = 'var(--gold)' }: { email: string; color?: string }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: `color-mix(in srgb, ${color} 20%, var(--surface2))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.85rem', color,
    }}>
      {email[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontSize: '0.58rem', padding: '0.15em 0.55em', borderRadius: '99px',
      background: `color-mix(in srgb, ${color} 15%, transparent)`,
      color, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{text}</span>
  )
}

interface PendingReceived { id: string; inviterEmail: string; createdAt: string }

// Invite by email · pending sent · pending received (accept/decline) · accepted.
// Used in both the Friends side panel and the Shared tab's People view.
// Invitees are addressed by email only — no public user directory is exposed.
export default function PeopleList({ userId, userEmail, onNavigate }: {
  userId: string
  userEmail: string
  onNavigate?: () => void
}) {
  const { sent, active, loading, invite, accept, decline, remove } = useCompanions(userId)
  const [emailInput, setEmailInput] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [inviteDone, setInviteDone] = useState(false)
  const [pendingReceived, setPendingReceived] = useState<PendingReceived[]>([])

  // The companions row only has the recipient's own email (invitee_email) —
  // the actual inviter's email is resolved server-side.
  useEffect(() => {
    function loadReceived() {
      fetch('/api/companions/pending-received').then(r => r.json()).then(d => setPendingReceived(d.items ?? [])).catch(() => {})
    }
    loadReceived()
    window.addEventListener('4s:companions-changed', loadReceived)
    return () => window.removeEventListener('4s:companions-changed', loadReceived)
  }, [userId])

  async function handleInvite() {
    if (!emailInput.trim()) return
    if (emailInput.toLowerCase().trim() === userEmail.toLowerCase()) { setInviteError("You can't invite yourself."); return }
    setInviting(true); setInviteError(null)
    const err = await invite(emailInput)
    setInviting(false)
    if (err) { setInviteError(err); return }
    setEmailInput(''); setInviteDone(true)
    setTimeout(() => setInviteDone(false), 3000)
  }

  const awaitingSent = sent.filter(c => c.status === 'pending')

  if (loading) {
    return <div style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.6 }}>Loading…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Invite form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.6 }}>Invite by email</div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <input
            value={emailInput} onChange={e => setEmailInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
            placeholder="their@email.com" type="email"
            style={{
              flex: 1, minWidth: 0, background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text)',
              fontFamily: 'var(--font-body)', fontSize: '0.78rem', outline: 'none',
            }}
          />
          <button onClick={handleInvite} disabled={inviting || !emailInput.trim()} style={{
            padding: '0.5rem 0.8rem', borderRadius: '8px', cursor: 'pointer',
            background: inviteDone ? 'var(--emerald)' : 'var(--gold)',
            border: 'none', color: 'var(--bg)', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
          }}>
            {inviteDone ? '✓' : inviting ? '…' : 'send'}
          </button>
        </div>
        {inviteError && <div style={{ fontSize: '0.68rem', color: 'var(--rose)' }}>{inviteError}</div>}
      </div>

      {/* Pending received */}
      {pendingReceived.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber)', opacity: 0.8 }}>Invited you</div>
          {pendingReceived.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.75rem', borderRadius: '10px', background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
              <Avatar email={c.inviterEmail} color="var(--amber)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.inviterEmail}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button onClick={async () => { await accept(c.id); setPendingReceived(prev => prev.filter(p => p.id !== c.id)) }} style={{ background: 'var(--emerald)', border: 'none', borderRadius: '6px', padding: '0.45rem 0.75rem', minHeight: '34px', fontSize: '0.65rem', cursor: 'pointer', color: 'var(--bg)', fontFamily: 'var(--font-body)' }}>accept</button>
                <button onClick={async () => { await decline(c.id); setPendingReceived(prev => prev.filter(p => p.id !== c.id)) }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.45rem 0.75rem', minHeight: '34px', fontSize: '0.65rem', cursor: 'pointer', color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accepted */}
      {active.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.6 }}>Friends</div>
          {active.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.75rem', borderRadius: '10px', background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
              <Avatar email={c.invitee_email} color="var(--emerald)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.invitee_email}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.7 }}>
                  {(c.shared_sections ?? []).length === 0 ? 'nothing shared yet' : `sharing ${(c.shared_sections ?? []).length} section${(c.shared_sections ?? []).length !== 1 ? 's' : ''}`}
                </div>
              </div>
              <Pill text="active" color="var(--emerald)" />
              <Link href={`/companion/${c.id}`} onClick={onNavigate} title="View their shared space" style={{ color: 'var(--muted)', fontSize: '0.65rem', opacity: 0.5, textDecoration: 'none' }}>→</Link>
              <button onClick={() => remove(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.75rem', opacity: 0.45 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Awaiting reply */}
      {awaitingSent.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.6 }}>Awaiting reply</div>
          {awaitingSent.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.75rem', borderRadius: '10px', background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
              <Avatar email={c.invitee_email} />
              <div style={{ flex: 1, minWidth: 0, fontSize: '0.75rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.invitee_email}</div>
              <Pill text="waiting" color="var(--muted)" />
              <button onClick={() => remove(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.75rem', opacity: 0.45 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {active.length === 0 && awaitingSent.length === 0 && pendingReceived.length === 0 && (
        <div style={{ textAlign: 'center', padding: '1.6rem 0', fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.6, lineHeight: 1.7 }}>
          No people yet. Invite someone above.<br />Only people who accept become share targets.
        </div>
      )}
    </div>
  )
}
