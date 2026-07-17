'use client'

import { useState } from 'react'
import CompanionSync from './CompanionSync'
import RelationshipMemory from './RelationshipMemory'
import RelationshipLinks from './RelationshipLinks'

type RelationshipTab = 'sync' | 'people' | 'links'

const TABS: { id: RelationshipTab; label: string }[] = [
  { id: 'sync',   label: 'Sync' },
  { id: 'people', label: 'People' },
  { id: 'links',  label: 'Links' },
]

// Everything relationship-related in one place, previously scattered across
// Life (Companion sync + Links) and Shared (People) — moved here so it's a
// first-class tab instead of buried two levels deep. Sync is dual-consent
// gated (see CompanionSync); People and Links are personal utility with no
// cross-user exposure risk, so they stay open.
export default function RelationshipHub({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [tab, setTab] = useState<RelationshipTab>('sync')

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

      {tab === 'sync' && <CompanionSync userId={userId} userEmail={userEmail} />}
      {tab === 'people' && <RelationshipMemory />}
      {tab === 'links' && <RelationshipLinks />}
    </div>
  )
}
