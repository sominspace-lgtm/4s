'use client'

import HouseholdCustomLists from './HouseholdCustomLists'

// Checklists (2026-10-12). This section used to hold the game list and watch
// list as well as the named checklists; the games and the movies/shows are
// collections now (see ReferenceCollections). What stays here is the named
// checklists: bathroom codes, dream hotels, gift ideas for Mom — each item
// can link to a Places pin and carry a reminder, which a collection row does
// not do. The file keeps its old name only because HouseholdHub imports it.
export default function HouseholdWatchlist({ spaceId }: { spaceId: string | null }) {
  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
      <details open>
        <summary className="t-card" style={{ cursor: 'pointer', listStyle: 'revert' }}>Checklists</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: '0.7rem' }}>
          <HouseholdCustomLists spaceId={spaceId} />
        </div>
      </details>
    </section>
  )
}
