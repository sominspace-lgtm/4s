'use client'

import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useCompanions } from '@/lib/hooks/useCompanions'
import { useGiftEvents, daysUntil } from '@/lib/hooks/useGiftEvents'

// Compact pulse for shared/family life — only renders once you actually
// have a shared space, so it doesn't clutter Brief for solo users.
export default function FamilyTodayCard({ userId }: { userId: string }) {
  const { spaces, ready } = useSharedSpaces(userId)
  const { received } = useCompanions(userId)
  const { items: giftItems } = useGiftEvents()

  if (!ready || spaces.length === 0) return null

  const pendingInvites = received.filter(c => c.status === 'pending').length
  const upcomingGifts = giftItems.filter(g => daysUntil(g) <= 14 && daysUntil(g) >= 0)

  const parts: string[] = []
  parts.push(`${spaces.length} space${spaces.length > 1 ? 's' : ''}`)
  if (pendingInvites > 0) parts.push(`${pendingInvites} needing response`)
  if (upcomingGifts.length > 0) parts.push(`${upcomingGifts.length} birthday/gift${upcomingGifts.length > 1 ? 's' : ''} coming up`)

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px',
      padding: '1rem 1.3rem', display: 'flex', flexDirection: 'column', gap: '0.3rem',
    }}>
      <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.68 }}>Family Today</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{parts.join(' · ')}</div>
    </div>
  )
}
