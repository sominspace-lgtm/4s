'use client'

import RelationshipMemory from '@/components/relationships/RelationshipMemory'

// Down to one thing (2026-08-21): the household is exactly two accounts,
// Harry and Sylvia, and always will be — there is no "invite a friend" or
// "share this item with someone else" scenario to design for. The Sharing
// tab and the Friends list that assumed other accounts might join were
// removed then; the code behind them (the `companions` table, useCompanions,
// per-item ShareMenu) was deleted on 2026-09-01 in favour of plain space
// scoping — everything in the household space is simply visible to both.
//
// Household space creation/pairing (the actual "connect Harry and Sylvia's
// two accounts" flow, backed by relationship_pairs — a different table
// entirely) still lives in the header's Connect panel and Household →
// Setup, both untouched by this change.
//
// A garden visualization (people as trees, sized by history) lived here
// briefly (2026-08-21) and was reverted the same day — back to a plain
// contact list, which is what this was asked for. RelationshipMemory
// genuinely never depended on the garden; it reads people, birthdays,
// last-contact and preferences straight from usePeople/usePersonPreferences
// and is unchanged by either the addition or the removal.
export default function PeopleHub() {
  return (
    <div className="card-interactive organic specimen" style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderTop: '2px solid color-mix(in srgb, var(--blush) 45%, var(--border))',
      padding: '1.3rem 1.5rem', boxShadow: 'var(--elev-2)',
    }}>
      <div style={{ fontSize: 'var(--text-card)', fontFamily: 'var(--font-display)', color: 'var(--text)', fontWeight: 400, marginBottom: '0.8rem' }}>
        People
      </div>
      <RelationshipMemory />
    </div>
  )
}
