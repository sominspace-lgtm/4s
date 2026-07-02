'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SHAREABLE_SECTIONS } from '@/lib/hooks/useCompanions'

interface SharedItem {
  id: string
  inviterEmail: string
  sharedSections: string[]
}

export default function SharedWithMeSection({ onOpenCompanions }: { onOpenCompanions: () => void }) {
  const [items, setItems] = useState<SharedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/companions/shared-with-me')
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .finally(() => setLoading(false))
  }, [])

  const sectionLabel = (id: string) => SHAREABLE_SECTIONS.find(s => s.id === id)?.label ?? id

  return (
    <div className="card-interactive" style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderTop: '2px solid color-mix(in srgb, var(--blush) 45%, var(--border))',
      borderRadius: '16px', padding: '1.3rem 1.5rem', boxShadow: '0 12px 32px var(--shadow)',
    }}>
      <div style={{ fontSize: 'var(--text-card)', fontFamily: 'var(--font-display)', color: 'var(--text)', fontWeight: 400, marginBottom: '0.8rem' }}>Shared With Me</div>

      {loading && (
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.68 }}>Loading…</div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ padding: '1rem 0', textAlign: 'center', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '0.8rem' }}>
          No one has shared anything yet.<br />Shared notes, tasks, lists, reminders, gift ideas, and plans will appear here.
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {items.map(item => (
            <Link
              key={item.id}
              href={`/companion/${item.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem',
                borderRadius: '10px', border: '1px solid var(--border)', textDecoration: 'none',
                background: 'rgba(255,255,255,0.025)',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'color-mix(in srgb, var(--gold) 20%, var(--surface2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', color: 'var(--gold)',
              }}>
                {item.inviterEmail[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.inviterEmail}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.78 }}>
                  {item.sharedSections.length === 0
                    ? 'Nothing shared yet'
                    : item.sharedSections.map(sectionLabel).join(' · ')}
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.58 }}>→</span>
            </Link>
          ))}
        </div>
      )}

      {!loading && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: items.length === 0 ? 'center' : 'flex-start', marginTop: items.length > 0 ? '0.8rem' : 0 }}>
          <button onClick={onOpenCompanions} className="btn btn-secondary" style={{ fontSize: '0.68rem' }}>Create shared list</button>
          <button onClick={onOpenCompanions} className="btn btn-secondary" style={{ fontSize: '0.68rem' }}>Invite someone</button>
          <button onClick={onOpenCompanions} className="btn btn-secondary" style={{ fontSize: '0.68rem' }}>Share something</button>
        </div>
      )}
    </div>
  )
}
