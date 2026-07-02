'use client'

import { useEffect, useRef, useState } from 'react'
import { useCompanions, SHAREABLE_SECTIONS, type Companion } from '@/lib/hooks/useCompanions'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import PeopleList, { Avatar } from './PeopleList'

interface Props {
  open: boolean
  userId: string
  userEmail: string
  onClose: () => void
}

type Tab = 'companions' | 'sharing' | 'spaces'

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
        No accepted friends yet.<br />Invite someone in the Friends tab.
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
        Choose what each friend can see. Individual items (tasks, habits) also need their ⇆ toggle enabled.
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
            Changes save instantly. Your friend sees shared content in real-time.
          </div>
        </div>
      )}
    </div>
  )
}

export function SpacesTab({ userId }: { userId: string }) {
  const { spaces, ready, loading, createSpace, removeSpace, inviteMember, membersOf } = useSharedSpaces(userId)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({})

  if (!ready) {
    return (
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.7, padding: '1rem 0' }}>
        Shared spaces need one extra setup step — run <code>supabase/migrations/shared_spaces_and_item_sharing.sql</code> in your Supabase SQL editor, then reopen this panel.
      </div>
    )
  }

  async function handleCreate(presetName?: string) {
    const label = presetName ?? name.trim()
    if (!label) return
    setCreating(true)
    await createSpace(label)
    setCreating(false)
    setName('')
  }

  const STARTER_SPACES = ['Family', 'Couple', 'Trip', 'Household', 'Friends', 'Roommates']
  const existingNames = new Set(spaces.map(s => s.name))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.78, lineHeight: 1.6 }}>
        Spaces are named groups — Family, Couple, Trip, Household — you can share items with all at once.
      </p>

      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {STARTER_SPACES.filter(n => !existingNames.has(n)).map(n => (
          <button key={n} onClick={() => handleCreate(n)} disabled={creating} className="btn btn-secondary" style={{ fontSize: '0.68rem' }}>
            + {n}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <input
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="New space name (e.g. Family)"
          style={{
            flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text)',
            fontFamily: 'var(--font-body)', fontSize: '0.78rem', outline: 'none',
          }}
        />
        <button onClick={() => handleCreate()} disabled={creating || !name.trim()} className="btn btn-primary" style={{ fontSize: '0.72rem' }}>
          create
        </button>
      </div>

      {!loading && spaces.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.6 }}>
          No spaces yet. Create one above.
        </div>
      )}

      {spaces.map(s => (
        <div key={s.id} style={{ padding: '0.7rem 0.75rem', borderRadius: '10px', background: 'var(--hover-bg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{s.name}</span>
            <button onClick={() => removeSpace(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.7rem', opacity: 0.5 }}>✕</button>
          </div>
          {membersOf(s.id).map(m => (
            <div key={m.id} style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.78 }}>
              {m.member_email} · {m.status}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <input
              value={emailDrafts[s.id] ?? ''}
              onChange={e => setEmailDrafts(d => ({ ...d, [s.id]: e.target.value }))}
              onKeyDown={async e => {
                if (e.key === 'Enter' && emailDrafts[s.id]?.trim()) {
                  await inviteMember(s.id, emailDrafts[s.id])
                  setEmailDrafts(d => ({ ...d, [s.id]: '' }))
                }
              }}
              placeholder="Invite by email"
              style={{
                flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: '6px', padding: '0.3rem 0.55rem', color: 'var(--text)',
                fontFamily: 'var(--font-body)', fontSize: '0.7rem', outline: 'none',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CompanionPanel({ open, userId, userEmail, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { companions, active, loading, updateSharedSections } = useCompanions(userId)
  const [tab, setTab] = useState<Tab>('companions')

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

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
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Friends</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--hover-bg)', borderRadius: '9px', padding: '0.25rem' }}>
          <button style={tabStyle('companions')} onClick={() => setTab('companions')}>Friends</button>
          <button style={tabStyle('sharing')} onClick={() => setTab('sharing')}>
            What I Share {active.length > 0 && <span style={{ opacity: 0.5 }}>({active.length})</span>}
          </button>
          <button style={tabStyle('spaces')} onClick={() => setTab('spaces')}>Spaces</button>
        </div>

        {loading ? (
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.6 }}>Loading…</div>
        ) : tab === 'companions' ? (
          <PeopleList userId={userId} userEmail={userEmail} onNavigate={onClose} />
        ) : tab === 'sharing' ? (
          <SharingTab companions={companions} userId={userId} updateSharedSections={updateSharedSections} />
        ) : (
          <SpacesTab userId={userId} />
        )}
      </div>
    </>
  )
}
