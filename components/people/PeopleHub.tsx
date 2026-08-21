'use client'

import RelationshipGarden from '@/components/relationships/RelationshipGarden'

// Down to one thing (2026-08-21): the household is exactly two accounts,
// Harry and Sylvia, and always will be — there is no "invite a friend" or
// "share this item with someone else" scenario to design for. The Sharing
// tab (Spaces + With Me/By Me, backed by the general-purpose `companions`
// table meant for arbitrary N-person friend networks) and the Friends list
// in the old People tab both assumed other accounts might join. Removed
// entirely, not hidden — companions.sql and useCompanions() are untouched
// if a real multi-account use case ever shows up again, but nothing in the
// UI points at them from here anymore.
//
// Household space creation/pairing (the actual "connect Harry and Sylvia's
// two accounts" flow, backed by relationship_pairs — a different table
// entirely) still lives in the header's Companions panel and Household →
// Setup, both untouched by this change.
//
// What's left is genuinely self-contained: RelationshipMemory reads people,
// birthdays, last-contact and preferences straight from usePeople/
// usePersonPreferences — it never depended on the friend/sharing system.
//
// "Make relationships into the systems like village" (2026-08-21): People
// now opens on a garden — one tree per person, sized by how long you've
// known them and what you've actually learned about them, same growth law
// as the Village (never shrinks; a quiet stretch desaturates, it doesn't
// wither). See lib/relationships/garden.ts for the full reasoning, in
// particular why last_contact can't drive size the way it drives everything
// else about "have I talked to this person lately".
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
      <RelationshipGarden />
    </div>
  )
}
