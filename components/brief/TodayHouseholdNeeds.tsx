'use client'

import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useHousehold, choreDue } from '@/lib/hooks/useHousehold'
import { goToSection } from '@/lib/utils/navigate'
import Icon from '@/components/ui/Icon'

// "What needs you" for Household (2026-08-25) — a real preview, not a
// shortcut card: chores due/overdue and shopping still needed, read
// straight from the same household data the real Household tab uses (no
// second copy of it, just a smaller read of the same rows). Replaces the
// plain nav-shortcut Household block per feedback that a card that only
// ever says "Household →" isn't worth a whole block's worth of space when
// it could say something real instead.
export default function TodayHouseholdNeeds({ userId }: { userId: string }) {
  const { spaces } = useSharedSpaces(userId)
  const spaceId = spaces[0]?.id ?? null
  const h = useHousehold(spaceId)

  const choresNeeded = h.chores.filter(c => choreDue(c) <= 0)
  const shoppingNeeded = h.shopping.filter(s => !s.got)
  const nothingNeeded = !h.loading && choresNeeded.length === 0 && shoppingNeeded.length === 0

  return (
    <button
      onClick={() => goToSection('home')}
      className="press organic"
      style={{
        textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-body)', width: '100%',
        background: 'color-mix(in srgb, var(--purple) 9%, var(--surface2))',
        border: '1px solid color-mix(in srgb, var(--purple) 22%, var(--border))',
        borderRadius: '14px', padding: '0.8rem 0.9rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span aria-hidden style={{ display: 'inline-flex', color: 'var(--purple)' }}><Icon name="household" size={20} /></span>
        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text)', flex: 1 }}>Household</span>
        <span aria-hidden style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.5 }}>→</span>
      </div>

      {nothingNeeded ? (
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.8, fontStyle: 'italic' }}>
          Nothing needs you right now.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {choresNeeded.length > 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text)' }}>
              {choresNeeded.length} chore{choresNeeded.length > 1 ? 's' : ''} due — {choresNeeded.slice(0, 3).map(c => c.name).join(', ')}
              {choresNeeded.length > 3 ? ', …' : ''}
            </div>
          )}
          {shoppingNeeded.length > 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text)' }}>
              {shoppingNeeded.length} thing{shoppingNeeded.length > 1 ? 's' : ''} to pick up — {shoppingNeeded.slice(0, 3).map(s => s.name).join(', ')}
              {shoppingNeeded.length > 3 ? ', …' : ''}
            </div>
          )}
        </div>
      )}
    </button>
  )
}
