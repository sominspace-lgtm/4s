'use client'

import { useEffect, useRef, useState } from 'react'
import { useCompanions } from '@/lib/hooks/useCompanions'

interface Props {
  open: boolean
  userId: string
  userEmail: string
  onClose: () => void
}

export default function CompanionPanel({ open, userId, userEmail, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { sent, received, active, loading, invite, accept, decline, remove } = useCompanions(userId)
  const [emailInput, setEmailInput] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [inviteDone, setInviteDone] = useState(false)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  async function handleInvite() {
    if (!emailInput.trim()) return
    if (emailInput.toLowerCase().trim() === userEmail.toLowerCase()) {
      setInviteError("You can't invite yourself."); return
    }
    setInviting(true); setInviteError(null)
    const err = await invite(emailInput)
    setInviting(false)
    if (err) { setInviteError(err); return }
    setEmailInput(''); setInviteDone(true)
    setTimeout(() => setInviteDone(false), 3000)
  }

  const pill = (text: string, color: string) => (
    <span style={{
      fontSize: '0.6rem', padding: '0.15em 0.55em', borderRadius: '99px',
      background: `color-mix(in srgb, ${color} 15%, transparent)`,
      color, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>{text}</span>
  )

  const row = (label: string, sub: string, status: string, statusColor: string, actions: React.ReactNode) => (
    <div key={label} style={{
      padding: '0.7rem 0.8rem', borderRadius: '10px',
      background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: '0.6rem',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'var(--surface2)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '0.85rem', color: 'var(--gold)',
      }}>
        {label[0]?.toUpperCase() ?? '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{sub}</div>
      </div>
      {pill(status, statusColor)}
      {actions}
    </div>
  )

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 199, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.2s',
      }} />
      <div ref={ref} style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '300px',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 200, padding: '1.5rem',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Companions
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>

        <p style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.7, lineHeight: 1.6 }}>
          Invite someone you trust. They'll be able to see work items you mark as shared.
        </p>

        {/* Invite form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.6 }}>Invite by email</div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              placeholder="their@email.com"
              type="email"
              style={{
                flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text)',
                fontFamily: 'var(--font-body)', fontSize: '0.78rem', outline: 'none',
              }}
            />
            <button
              onClick={handleInvite}
              disabled={inviting || !emailInput.trim()}
              style={{
                padding: '0.5rem 0.8rem', borderRadius: '8px', cursor: 'pointer',
                background: inviteDone ? 'var(--emerald)' : 'var(--gold)',
                border: 'none', color: 'var(--bg)', fontFamily: 'var(--font-body)',
                fontSize: '0.75rem', opacity: inviting ? 0.5 : 1,
              }}
            >
              {inviteDone ? '✓' : inviting ? '…' : 'send'}
            </button>
          </div>
          {inviteError && <div style={{ fontSize: '0.68rem', color: 'var(--rose)' }}>{inviteError}</div>}
        </div>

        {loading ? (
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.5 }}>Loading…</div>
        ) : (
          <>
            {/* Pending invites received */}
            {received.filter(c => c.status === 'pending').length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.8 }}>Pending invites</div>
                {received.filter(c => c.status === 'pending').map(c => (
                  <div key={c.id}>
                    {row(c.invitee_email, 'invited you', 'pending', 'var(--amber)',
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button onClick={() => accept(c.id)} style={{ background: 'var(--emerald)', border: 'none', borderRadius: '6px', padding: '0.25rem 0.55rem', fontSize: '0.65rem', cursor: 'pointer', color: 'var(--bg)' }}>accept</button>
                        <button onClick={() => decline(c.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.25rem 0.55rem', fontSize: '0.65rem', cursor: 'pointer', color: 'var(--muted)' }}>decline</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Active companions */}
            {active.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.6 }}>Your companions</div>
                {active.map(c => {
                  const label = c.inviter_id === userId ? c.invitee_email : c.invitee_email
                  return (
                    <div key={c.id}>
                      {row(label, 'companion', 'active', 'var(--emerald)',
                        <button onClick={() => remove(c.id)} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.75rem', opacity: 0.4 }}>✕</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Sent invites awaiting */}
            {sent.filter(c => c.status === 'pending').length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.6 }}>Awaiting response</div>
                {sent.filter(c => c.status === 'pending').map(c => (
                  <div key={c.id}>
                    {row(c.invitee_email, 'invite sent', 'waiting', 'var(--muted)',
                      <button onClick={() => remove(c.id)} title="Cancel invite" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.75rem', opacity: 0.4 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {active.length === 0 && sent.filter(c => c.status === 'pending').length === 0 && received.filter(c => c.status === 'pending').length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.5 }}>
                No companions yet.<br />Invite someone above.
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 'auto', fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.4, lineHeight: 1.6 }}>
          Companions see only work items you've marked as shared. Full real-time sync coming with AI features.
        </div>
      </div>
    </>
  )
}
