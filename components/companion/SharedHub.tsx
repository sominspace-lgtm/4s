'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCompanions, SHAREABLE_SECTIONS } from '@/lib/hooks/useCompanions'
import { Avatar } from './PeopleList'

interface SharedItem {
  id: string
  inviterEmail: string
  sharedSections: string[]
}

// An individual item a friend shared with the ⇆ ShareMenu (shared_item_links),
// resolved server-side by /api/companions/shared-items.
interface SharedThing {
  id: string
  itemType: string
  typeLabel: string
  title: string
  available: boolean
  permission: 'view' | 'edit'
  ownerEmail: string
  via: string | null
  createdAt: string
}

const sectionLabel = (id: string) => SHAREABLE_SECTIONS.find(s => s.id === id)?.label ?? id

// Tab bodies for the merged People hub (components/people/PeopleHub.tsx) —
// the "Shared With Me" and "Shared By Me" lenses. Formerly the whole of a
// standalone SharedHub component; that default export is gone, folded into
// PeopleHub, but these two pieces are still exactly the item-sharing logic.
export function WithMeTab({ onOpenPeople }: { onOpenPeople: () => void }) {
  const [items, setItems] = useState<SharedItem[]>([])
  const [things, setThings] = useState<SharedThing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    function load() {
      Promise.all([
        fetch('/api/companions/shared-with-me').then(r => r.json()).then(d => setItems(d.items ?? [])),
        fetch('/api/companions/shared-items').then(r => r.json()).then(d => setThings(d.items ?? [])),
      ]).finally(() => setLoading(false))
    }
    load()
    window.addEventListener('4s:companions-changed', load)
    return () => window.removeEventListener('4s:companions-changed', load)
  }, [])

  if (loading) return <div style={{ fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.7 }}>Loading…</div>

  if (items.length === 0 && things.length === 0) {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {things.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Items shared with you
          </div>
          {things.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem',
              borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--hover-bg)',
              opacity: t.available ? 1 : 0.55,
            }}>
              <Avatar email={t.ownerEmail} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.8 }}>
                  {t.typeLabel} · from {t.ownerEmail}{t.via ? ` · via ${t.via}` : ''}
                </div>
              </div>
              <span style={{
                fontSize: '0.58rem', color: 'var(--muted)', opacity: 0.8, padding: '0.15em 0.5em',
                borderRadius: '6px', border: '1px solid var(--border)', whiteSpace: 'nowrap',
              }}>{t.permission === 'edit' ? 'Can edit' : 'View'}</span>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            People sharing sections with you
          </div>
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
      )}
    </div>
  )
}

export function ByMeTab({ userId, onManageSharing }: { userId: string; onManageSharing: () => void }) {
  const { active, loading, friendEmailOf } = useCompanions(userId)
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
          <Avatar email={friendEmailOf(c)} color="var(--emerald)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {friendEmailOf(c)}
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

