'use client'

import { useState } from 'react'
import CompanionSync from '@/components/relationships/CompanionSync'
import RelationshipMemory from '@/components/relationships/RelationshipMemory'
import RelationshipLinks from '@/components/relationships/RelationshipLinks'
import { WithMeTab, ByMeTab } from '@/components/companion/SharedHub'
import { SpacesTab } from '@/components/companion/CompanionPanel'
import PeopleList from '@/components/companion/PeopleList'

type PeopleTab = 'close' | 'friends' | 'spaces' | 'with-me' | 'by-me' | 'people' | 'links'

const TABS: { id: PeopleTab; label: string }[] = [
  { id: 'close',   label: 'Close' },
  { id: 'friends', label: 'Friends' },
  { id: 'spaces',  label: 'Spaces' },
  { id: 'with-me', label: 'Shared With Me' },
  { id: 'by-me',   label: 'Shared By Me' },
  { id: 'people',  label: 'People' },
  { id: 'links',   label: 'Links' },
]

// One destination for everyone in your life, replacing the Relationship and
// Shared tabs — same person, same question ("who's in this?"), asked in two
// places a user couldn't predict between. This is a surface merge only: the
// privacy models underneath stay exactly as separate as they were.
// - Close (CompanionSync): confirmed, dual-consent pairs. Mutual.
// - Friends / Spaces / Shared With Me / Shared By Me: companions and
//   shared_item_links — unilateral, revocable, per-item.
// - People (RelationshipMemory): private notes, birthdays, nothing shared.
// - Links: a personal bookmark library, nothing shared.
// No schema changes, no data moved — every one of these renders the exact
// component it did before, just under one set of tabs instead of two.
export default function PeopleHub({ userId, userEmail, onOpenCompanions }: {
  userId: string
  userEmail: string
  onOpenCompanions: () => void
}) {
  const [tab, setTab] = useState<PeopleTab>('close')

  return (
    <div className="card-interactive" style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderTop: '2px solid color-mix(in srgb, var(--blush) 45%, var(--border))',
      borderRadius: '16px', padding: '1.3rem 1.5rem', boxShadow: '0 12px 32px var(--shadow)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 'var(--text-card)', fontFamily: 'var(--font-display)', color: 'var(--text)', fontWeight: 400 }}>People</div>
        <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.8, letterSpacing: '0.02em' }}>Everything is private unless you share it.</div>
      </div>

      <div className="tabs-wrap" style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '1rem', background: 'var(--hover-bg)', borderRadius: '9px', padding: '0.25rem' }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className="btn" style={{
            fontSize: '0.7rem', padding: '0.35em 0.8em',
            background: tab === tb.id ? 'var(--hover-bg)' : 'transparent',
            color: tab === tb.id ? 'var(--text)' : 'var(--muted)', border: 'none',
          }}>{tb.label}</button>
        ))}
      </div>

      {tab === 'close'   && <CompanionSync userId={userId} userEmail={userEmail} />}
      {tab === 'friends' && <PeopleList userId={userId} userEmail={userEmail} />}
      {tab === 'spaces'  && <SpacesTab userId={userId} />}
      {tab === 'with-me' && <WithMeTab onOpenPeople={() => setTab('friends')} />}
      {tab === 'by-me'   && <ByMeTab userId={userId} onManageSharing={onOpenCompanions} />}
      {tab === 'people'  && <RelationshipMemory />}
      {tab === 'links'   && <RelationshipLinks />}
    </div>
  )
}
