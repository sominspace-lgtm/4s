'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCompanions, SHAREABLE_SECTIONS } from '@/lib/hooks/useCompanions'
import PeopleList, { Avatar } from './PeopleList'
import { SpacesTab } from './CompanionPanel'

type SharedTab = 'with-me' | 'by-me' | 'spaces' | 'people'

const TABS: { id: SharedTab; label: string }[] = [
  { id: 'with-me', label: 'Shared With Me' },
  { id: 'by-me',   label: 'Shared By Me' },
  { id: 'spaces',  label: 'Spaces' },
  { id: 'people',  label: 'People' },
]

interface SharedItem {
  id: string
  inviterEmail: string
  sharedSections: string[]
}

const sectionLabel = (id: string) => SHAREABLE_SECTIONS.find(s => s.id === id)?.label ?? id

function WithMeTab({ onOpenPeople }: { onOpenPeople: () => void }) {
  const [items, setItems] = useState<SharedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    function load() {
      fetch('/api/companions/shared-with-me')
        .then(r => r.json())
        .then(d => setItems(d.items ?? []))
        .finally(() => setLoading(false))
    }
    load()
    window.addEventListener('4s:companions-changed', load)
    return () => window.removeEventListener('4s:companions-changed', load)
  }, [])

  if (loading) return <div style={{ fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.7 }}>Loading…</div>

  if (items.length === 0) {
    return (
      <div style={{ padding: '1.2rem 0', textAlign: 'center', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.7 }}>
        No one has shared anything with you yet.<br />
        Shared notes, tasks, lists, reminders, gift ideas, and plans will appear here.
        <div style={{ marginTop: '0.8rem' }}>
          <button onClick={onOpenPeople} className="btn btn-secondary" style={{ fontSize: '0.7rem' }}>Invite someone</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.map(item => (
        <Link
          key={item.id}
          href={`/companion/${item.id}`}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem',
            borderRadius: '10px', border: '1px solid var(--border)', textDecoration: 'none',
            background: 'var(--hover-bg)',
          }}
        >
          <Avatar email={item.inviterEmail} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.inviterEmail}
            </div>
            <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.8 }}>
              {item.sharedSections.length === 0
                ? 'Nothing shared yet'
                : item.sharedSections.map(sectionLabel).join(' · ')}
            </div>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.6 }}>→</span>
        </Link>
      ))}
    </div>
  )
}

function ByMeTab({ userId, onManageSharing }: { userId: string; onManageSharing: () => void }) {
  const { active, loading } = useCompanions(userId)
  const sharing = active.filter(c => (c.shared_sections ?? []).length > 0)

  if (loading) return <div style={{ fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.7 }}>Loading…</div>

  if (sharing.length === 0) {
    return (
      <div style={{ padding: '1.2rem 0', textAlign: 'center', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.7 }}>
        You haven&apos;t shared anything yet.<br />
        Everything is private unless you share it.
        <div style={{ marginTop: '0.8rem' }}>
          <button onClick={onManageSharing} className="btn btn-secondary" style={{ fontSize: '0.7rem' }}>
            {active.length > 0 ? 'Choose what to share' : 'Invite someone first'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {sharing.map(c => (
        <div key={c.id} style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem',
          borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--hover-bg)',
        }}>
          <Avatar email={c.invitee_email} color="var(--emerald)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.invitee_email}
            </div>
            <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.8 }}>
              {(c.shared_sections ?? []).map(sectionLabel).join(' · ')}
            </div>
          </div>
        </div>
      ))}
      <button onClick={onManageSharing} className="btn btn-ghost" style={{ fontSize: '0.68rem', alignSelf: 'flex-start' }}>
        Manage what you share →
      </button>
      <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7, lineHeight: 1.6 }}>
        Individual items you share with the ⇆ toggle also appear on your friends&apos; side.
      </div>
    </div>
  )
}

// The Shared tab: who shares with you, what you share, group spaces, and
// the people list itself. Private by default — only accepted friends and
// space members ever see anything, and invitees are addressed by email only.
export default function SharedHub({ userId, userEmail, onOpenCompanions }: {
  userId: string
  userEmail: string
  onOpenCompanions: () => void
}) {
  const [tab, setTab] = useState<SharedTab>('with-me')

  return (
    <div className="card-interactive" style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderTop: '2px solid color-mix(in srgb, var(--blush) 45%, var(--border))',
      borderRadius: '16px', padding: '1.3rem 1.5rem', boxShadow: '0 12px 32px var(--shadow)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 'var(--text-card)', fontFamily: 'var(--font-display)', color: 'var(--text)', fontWeight: 400 }}>Shared</div>
        <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.8, letterSpacing: '0.02em' }}>Everything is private unless you share it.</div>
      </div>

      <div className="tabs-wrap" style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '1rem', background: 'var(--hover-bg)', borderRadius: '9px', padding: '0.25rem' }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className="btn" style={{
            fontSize: '0.7rem', padding: '0.35em 0.8em',
            background: tab === tb.id ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: tab === tb.id ? 'var(--text)' : 'var(--muted)', border: 'none',
          }}>{tb.label}</button>
        ))}
      </div>

      {tab === 'with-me' && <WithMeTab onOpenPeople={() => setTab('people')} />}
      {tab === 'by-me'   && <ByMeTab userId={userId} onManageSharing={onOpenCompanions} />}
      {tab === 'spaces'  && <SpacesTab userId={userId} />}
      {tab === 'people'  && <PeopleList userId={userId} userEmail={userEmail} />}
    </div>
  )
}
