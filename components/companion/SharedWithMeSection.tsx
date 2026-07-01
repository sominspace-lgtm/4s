'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SHAREABLE_SECTIONS } from '@/lib/hooks/useCompanions'

interface SharedItem {
  id: string
  inviterEmail: string
  sharedSections: string[]
}

export default function SharedWithMeSection() {
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
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.2rem 1.4rem' }}>
      <div style={{ fontSize: '0.88rem', color: 'var(--text)', fontWeight: 400, marginBottom: '0.8rem' }}>Shared With Me</div>

      {loading && (
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.5 }}>Loading…</div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ padding: '1rem 0', textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.6 }}>
          No one has shared anything with you yet.
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
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.6 }}>
                  {item.sharedSections.length === 0
                    ? 'Nothing shared yet'
                    : item.sharedSections.map(sectionLabel).join(' · ')}
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.4 }}>→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
