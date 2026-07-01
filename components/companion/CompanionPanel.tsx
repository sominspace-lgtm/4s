'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useCompanions, SHAREABLE_SECTIONS, type Companion } from '@/lib/hooks/useCompanions'

interface Props {
  open: boolean
  userId: string
  userEmail: string
  onClose: () => void
}

type Tab = 'companions' | 'sharing'

function Avatar({ email, color = 'var(--gold)' }: { email: string; color?: string }) {
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

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontSize: '0.58rem', padding: '0.15em 0.55em', borderRadius: '99px',
      background: `color-mix(in srgb, ${color} 15%, transparent)`,
      color, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{text}</span>
  )
}

function SectionToggle({ label, note, active, onToggle }: { label: string; note: string; active: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem',
        borderRadius: '9px', border: `1px solid ${active ? 'color-mix(in srgb, var(--gold) 35%, transparent)' : 'var(--border)'}`,
        background: active ? 'color-mix(in srgb, var(--gold) 8%, transparent)' : 'transparent',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: '4px', flexShrink: 0,
        border: `1.5px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
        background: active ? 'var(--gold)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {active && <span style={{ fontSize: '0.5rem', color: 'var(--bg)', lineHeight: 1 }}>✓</span>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text)' }}>{label}</div>
        <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.6 }}>{note}</div>
      </div>
    </div>
  )
}

function SharingTab({ companions, userId, updateSharedSections }: {
  companions: Companion[]
  userId: string
  updateSharedSections: (id: string, sections: string[]) => Promise<void>
}) {
  const active = companions.filter(c => c.status === 'accepted')
  const [selected, setSelected] = useState<string | null>(active[0]?.id ?? null)
  const companion = active.find(c => c.id === selected)

  if (active.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.5 }}>
        No active companions yet.<br />Invite someone in the Companions tab.
      </div>
    )
  }

  async function toggle(sectionId: string) {
    if (!companion) return
    const current = companion.shared_sections ?? []
    const next = current.includes(sectionId)
      ? current.filter(s => s !== sectionId)
      : [...current, sectionId]
    await updateSharedSections(companion.id, next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.7, lineHeight: 1.6 }}>
        Choose what each companion can see. Individual items (work, habits) also need their ⇆ toggle enabled.
      </p>

      {/* Companion selector */}
      {active.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.5 }}>Sharing with</div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {active.map(c => (
              <button key={c.id} onClick={() => setSelected(c.id)} style={{
                padding: '0.3rem 0.7rem', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)',
                fontSize: '0.7rem', border: `1px solid ${selected === c.id ? 'var(--gold)' : 'var(--border)'}`,
                background: selected === c.id ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'transparent',
                color: selected === c.id ? 'var(--gold)' : 'var(--muted)',
              }}>
                {c.invitee_email.split('@')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {companion && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Avatar email={companion.invitee_email} color="var(--gold)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text)' }}>{companion.invitee_email}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.6 }}>
                {(companion.shared_sections ?? []).length === 0 ? 'Nothing shared yet' : `${(companion.shared_sections ?? []).length} section${(companion.shared_sections ?? []).length !== 1 ? 's' : ''} shared`}
              </div>
            </div>
          </div>

          {SHAREABLE_SECTIONS.map(s => (
            <SectionToggle
              key={s.id}
              label={s.label}
              note={s.note}
              active={(companion.shared_sections ?? []).includes(s.id)}
              onToggle={() => toggle(s.id)}
            />
          ))}

          <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.4, marginTop: '0.5rem', lineHeight: 1.6 }}>
            Changes save instantly. Your companion sees shared content in real-time.
          </div>
        </div>
      )}
    </div>
  )
}

export default function CompanionPanel({ open, userId, userEmail, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { companions, sent, received, active, loading, invite, accept, decline, remove, updateSharedSections } = useCompanions(userId)
  const [tab, setTab] = useState<Tab>('companions')
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
    if (emailInput.toLowerCase().trim() === userEmail.toLowerCase()) { setInviteError("You can't invite yourself."); return }
    setInviting(true); setInviteError(null)
    const err = await invite(emailInput)
    setInviting(false)
    if (err) { setInviteError(err); return }
    setEmailInput(''); setInviteDone(true)
    setTimeout(() => setInviteDone(false), 3000)
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    flex: 1, padding: '0.4rem', borderRadius: '7px', cursor: 'pointer', border: 'none',
    fontFamily: 'var(--font-body)', fontSize: '0.72rem',
    background: tab === t ? 'rgba(255,255,255,0.07)' : 'transparent',
    color: tab === t ? 'var(--text)' : 'var(--muted)',
  })

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 199,
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.2s',
      }} />
      <div ref={ref} style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '310px',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 200, padding: '1.5rem',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Companions</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '9px', padding: '0.25rem' }}>
          <button style={tabStyle('companions')} onClick={() => setTab('companions')}>Companions</button>
          <button style={tabStyle('sharing')} onClick={() => setTab('sharing')}>
            What I Share {active.length > 0 && <span style={{ opacity: 0.5 }}>({active.length})</span>}
          </button>
        </div>

        {loading ? (
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.5 }}>Loading…</div>
        ) : tab === 'companions' ? (
          <>
            {/* Invite form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.5 }}>Invite by email</div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  value={emailInput} onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  placeholder="their@email.com" type="email"
                  style={{
                    flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
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
            {received.filter(c => c.status === 'pending').length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber)', opacity: 0.8 }}>Invited you</div>
                {received.filter(c => c.status === 'pending').map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
                    <Avatar email={c.invitee_email} color="var(--amber)" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.invitee_email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button onClick={() => accept(c.id)} style={{ background: 'var(--emerald)', border: 'none', borderRadius: '6px', padding: '0.25rem 0.55rem', fontSize: '0.65rem', cursor: 'pointer', color: 'var(--bg)' }}>accept</button>
                      <button onClick={() => decline(c.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.25rem 0.55rem', fontSize: '0.65rem', cursor: 'pointer', color: 'var(--muted)' }}>decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Active companions */}
            {active.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.5 }}>Active</div>
                {active.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
                    <Avatar email={c.invitee_email} color="var(--emerald)" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.invitee_email}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.6 }}>
                        {(c.shared_sections ?? []).length === 0 ? 'nothing shared yet' : `sharing ${(c.shared_sections ?? []).length} section${(c.shared_sections ?? []).length !== 1 ? 's' : ''}`}
                      </div>
                    </div>
                    <Pill text="active" color="var(--emerald)" />
                    <Link href={`/companion/${c.id}`} onClick={onClose} title="View their shared space" style={{ color: 'var(--muted)', fontSize: '0.65rem', opacity: 0.4, textDecoration: 'none' }}>→</Link>
                    <button onClick={() => remove(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.75rem', opacity: 0.35 }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Awaiting */}
            {sent.filter(c => c.status === 'pending').length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.5 }}>Awaiting</div>
                {sent.filter(c => c.status === 'pending').map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
                    <Avatar email={c.invitee_email} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: '0.75rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.invitee_email}</div>
                    <Pill text="waiting" color="var(--muted)" />
                    <button onClick={() => remove(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.75rem', opacity: 0.35 }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {active.length === 0 && sent.filter(c => c.status === 'pending').length === 0 && received.filter(c => c.status === 'pending').length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.4 }}>
                No companions yet.<br />Invite someone above.
              </div>
            )}
          </>
        ) : (
          <SharingTab companions={companions} userId={userId} updateSharedSections={updateSharedSections} />
        )}
      </div>
    </>
  )
}
