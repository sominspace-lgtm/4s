'use client'

import { useState } from 'react'
import DomainGrid from '@/components/domains/DomainGrid'
import HomeBrain from '@/components/home/HomeBrain'

type LifeTab = 'domains' | 'home'

const TABS: { id: LifeTab; label: string }[] = [
  { id: 'domains', label: 'Domains' },
  { id: 'home',    label: 'Home Brain' },
]

// Life = the long-term care of every important area. Home Brain is the
// memory that keeps life from repeating work. Relationship (Companion sync,
// People, Links) moved out to its own top-level tab — see RelationshipHub.
export default function LifeHub() {
  const [tab, setTab] = useState<LifeTab>('domains')

  return (
    <div>
      <div className="tabs-wrap" style={{ display: 'inline-flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '1rem', background: 'var(--hover-bg)', borderRadius: '9px', padding: '0.25rem' }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className="btn" style={{
            fontSize: '0.72rem', padding: '0.4em 0.9em',
            background: tab === tb.id ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
            color: tab === tb.id ? 'var(--gold)' : 'var(--muted)', border: 'none',
          }}>{tb.label}</button>
        ))}
      </div>

      {tab === 'domains' && <DomainGrid />}
      {tab === 'home' && <HomeBrain />}
    </div>
  )
}
