'use client'

import { useState } from 'react'
import CompanionSync from '@/components/relationships/CompanionSync'
import RelationshipMemory from '@/components/relationships/RelationshipMemory'
import RelationshipLinks from '@/components/relationships/RelationshipLinks'
import { WithMeTab, ByMeTab } from '@/components/companion/SharedHub'
import { SpacesTab } from '@/components/companion/CompanionPanel'
import PeopleList from '@/components/companion/PeopleList'

type PeopleTab = 'close' | 'friends' | 'spaces' | 'shared' | 'notes' | 'links'
type ShareDir = 'with-me' | 'by-me'

// Six, down from seven. "Shared With Me" and "Shared By Me" were two tabs
// for one subject — sharing — split by direction, which is a filter, not a
// destination. They're one Shared tab with a direction toggle now.
//
// Ordered by how close the relationship is, then by what's shared, then by
// your own private notes: people first, mechanics second.
const TABS: { id: PeopleTab; label: string }[] = [
  { id: 'close',   label: 'Close' },
  { id: 'friends', label: 'Friends' },
  { id: 'spaces',  label: 'Spaces' },
  { id: 'shared',  label: 'Shared' },
  { id: 'notes',   label: 'Notes' },
  { id: 'links',   label: 'Links' },
]

// One destination for everyone in your life, replacing the Relationship and
// Shared tabs — same person, same question ("who's in this?"), asked in two
// places a user couldn't predict between. This is a surface merge only: the
// privacy models underneath stay exactly as separate as they were.
// - Close (CompanionSync): confirmed, dual-consent pairs. Mutual.
// - Friends / Spaces / Shared: companions and shared_item_links —
//   unilateral, revocable, per-item.
// - Notes (RelationshipMemory): private notes, birthdays, nothing shared.
//   Renamed from "People" — a tab called People inside a tab called People
//   told you nothing about which one you wanted.
// - Links: a personal bookmark library, nothing shared.
// No schema changes, no data moved — every one of these renders the exact
// component it did before, just under one set of tabs instead of two.
export default function PeopleHub({ userId, userEmail, onOpenCompanions }: {
  userId: string
  userEmail: string
  onOpenCompanions: () => void
}) {
  const [tab, setTab] = useState<PeopleTab>('close')
  const [shareDir, setShareDir] = useState<ShareDir>('with-me')

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

      {tab === 'shared' && (
        <div>
          {/* Direction is a filter on one list, not two places to go. */}
          <div style={{ display: 'inline-flex', gap: '0.2rem', marginBottom: '0.8rem', background: 'var(--hover-bg)', borderRadius: '7px', padding: '0.18rem' }}>
            {([['with-me', 'With me'], ['by-me', 'By me']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setShareDir(id)} className="btn press" style={{
                fontSize: '0.66rem', padding: '0.28em 0.7em', border: 'none',
                background: shareDir === id ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
                color: shareDir === id ? 'var(--gold)' : 'var(--muted)',
              }}>{label}</button>
            ))}
          </div>
          {shareDir === 'with-me'
            ? <WithMeTab onOpenPeople={() => setTab('friends')} />
            : <ByMeTab userId={userId} onManageSharing={onOpenCompanions} />}
        </div>
      )}

      {tab === 'notes'   && <RelationshipMemory />}
      {tab === 'links'   && <RelationshipLinks />}
    </div>
  )
}
