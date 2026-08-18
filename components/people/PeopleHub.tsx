'use client'

import { useState } from 'react'
import RelationshipMemory from '@/components/relationships/RelationshipMemory'
import { WithMeTab, ByMeTab } from '@/components/companion/SharedHub'
import { SpacesTab } from '@/components/companion/CompanionPanel'
import PeopleList from '@/components/companion/PeopleList'

type PeopleTab = 'people' | 'sharing'
type ShareDir = 'with-me' | 'by-me'

// Two, down from three (2026-08-12) — was already down from six, then seven.
//
// "Close" (the confirmed-partner pairing + Google Photos/checkin feed) moved
// to Household → Setup: it's pair-scoped shared-living data, and its Discord
// counterpart already lived there. That's a genuine relocation, not a merge.
//
// Links (a personal bookmark library, backed by relationship_links) was
// dropped from the tab bar (2026-08-12) — it never had anything to do with
// People beyond needing *a* home, and nothing else in the app referenced it.
// The component and table are untouched; components/relationships/
// RelationshipLinks.tsx is a one-line re-add if a bookmark library needs a
// home again.
//
// What's left is regrouped by the same "why did you open this" test as the
// Household refactor, not by which table backs it:
//   People   — the individuals: Friends + your private Notes about them.
//   Sharing  — the mechanics: Spaces, and what's shared with/by you.
const TABS: { id: PeopleTab; label: string }[] = [
  { id: 'people',  label: 'People' },
  { id: 'sharing', label: 'Sharing' },
]

// Everyone in your life who isn't your household partner (that's Household
// → Setup now). Privacy models stay exactly as separate as they were — this
// is a tab-grouping change only, no data moved, no component rewritten.
export default function PeopleHub({ userId, userEmail, onOpenCompanions }: {
  userId: string
  userEmail: string
  onOpenCompanions: () => void
}) {
  const [tab, setTab] = useState<PeopleTab>('people')
  const [sharingSub, setSharingSub] = useState<'spaces' | 'shared'>('spaces')
  const [shareDir, setShareDir] = useState<ShareDir>('with-me')

  return (
    <div className="card-interactive organic specimen" style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderTop: '2px solid color-mix(in srgb, var(--blush) 45%, var(--border))',
      padding: '1.3rem 1.5rem', boxShadow: 'var(--elev-2)',
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

      {tab === 'people' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <PeopleList userId={userId} userEmail={userEmail} />
          <div>
            <div className="t-label" style={{ marginBottom: '0.5rem' }}>Notes</div>
            <RelationshipMemory />
          </div>
        </div>
      )}

      {tab === 'sharing' && (
        <div>
          <div style={{ display: 'inline-flex', gap: '0.2rem', marginBottom: '0.8rem', background: 'var(--hover-bg)', borderRadius: '7px', padding: '0.18rem' }}>
            {([['spaces', 'Spaces'], ['shared', 'Shared']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setSharingSub(id)} className="btn press" style={{
                fontSize: '0.66rem', padding: '0.28em 0.7em', border: 'none',
                background: sharingSub === id ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
                color: sharingSub === id ? 'var(--gold)' : 'var(--muted)',
              }}>{label}</button>
            ))}
          </div>

          {sharingSub === 'spaces' && <SpacesTab userId={userId} userEmail={userEmail} />}

          {sharingSub === 'shared' && (
            <div>
              {/* Direction is a filter on one list, not two places to go —
                  same reasoning as collapsing With Me/By Me into Sharing. */}
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
                ? <WithMeTab onOpenPeople={() => setTab('people')} />
                : <ByMeTab userId={userId} onManageSharing={onOpenCompanions} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
