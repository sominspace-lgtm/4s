'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import SubsCard from '@/components/subscriptions/SubsCard'
import GiftsCard from '@/components/subscriptions/GiftsCard'
import BuylistCard from '@/components/watchlist/BuylistCard'
import WishlistCard from '@/components/watchlist/WishlistCard'
import { useSubscriptions } from '@/lib/hooks/useSubscriptions'
import { useGiftEvents, daysUntil } from '@/lib/hooks/useGiftEvents'
import { useBuyItems, daysUntilDue } from '@/lib/hooks/useBuyItems'
import { useWatchItems } from '@/lib/hooks/useWatchItems'

type MoneyTab = 'overview' | 'wishlist' | 'gifts' | 'renewals' | 'buyagain'

const TABS: { id: MoneyTab; label: string; helper?: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'wishlist', label: 'Wishlist', helper: 'Things you want later.' },
  { id: 'gifts',    label: 'Gifts',    helper: 'Ideas for people and occasions.' },
  { id: 'renewals', label: 'Renewals', helper: 'Subscriptions and recurring bills.' },
  { id: 'buyagain', label: 'Buy Again', helper: 'Things you purchase repeatedly.' },
]

function OverviewStat({ label, value, color, onClick }: { label: string; value: string | number; color?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn btn-ghost" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.15rem',
      padding: '0.7rem 0.9rem', textAlign: 'left', minWidth: '110px',
    }}>
      <span style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', fontWeight: 300, color: color ?? 'var(--text)', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', opacity: 0.78 }}>{label}</span>
    </button>
  )
}

export default function MoneyHub({ userId }: { userId: string }) {
  const [tab, setTab] = useState<MoneyTab>('overview')
  const { subs, total } = useSubscriptions()
  const { items: giftItems } = useGiftEvents()
  const { items: buyItems } = useBuyItems()
  const { items: wishItems } = useWatchItems()

  const nextRenewal = [...subs].filter(s => s.renewal_date).sort((a, b) => (a.renewal_date ?? '').localeCompare(b.renewal_date ?? ''))[0]
  const nextGift = [...giftItems].sort((a, b) => daysUntil(a) - daysUntil(b))[0]
  const overdueBuys = buyItems.filter(b => daysUntilDue(b) < 0).length

  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '16px',
      padding: '1.3rem 1.5rem', boxShadow: '0 12px 32px var(--shadow)',
    }}>
      <div style={{ fontSize: 'var(--text-card)', fontFamily: 'var(--font-display)', color: 'var(--text)', fontWeight: 400, marginBottom: '0.8rem' }}>Money</div>

      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '1rem', background: 'var(--hover-bg)', borderRadius: '9px', padding: '0.25rem' }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className="btn" style={{
            fontSize: '0.7rem', padding: '0.35em 0.8em',
            background: tab === tb.id ? 'var(--hover-bg)' : 'transparent',
            color: tab === tb.id ? 'var(--text)' : 'var(--muted)', border: 'none',
          }}>{tb.label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <OverviewStat label="monthly subs" value={`$${total.toFixed(0)}`} color="var(--gold)" onClick={() => setTab('renewals')} />
          <OverviewStat label="wishlist items" value={wishItems.length} onClick={() => setTab('wishlist')} />
          <OverviewStat
            label={nextGift ? `next: ${nextGift.name}` : 'gifts tracked'}
            value={nextGift ? `${daysUntil(nextGift)}d` : giftItems.length}
            color={nextGift && daysUntil(nextGift) <= 14 ? 'var(--rose)' : undefined}
            onClick={() => setTab('gifts')}
          />
          <OverviewStat
            label={nextRenewal ? `next: ${nextRenewal.name}` : 'renewals'}
            value={nextRenewal ? format(parseISO(nextRenewal.renewal_date!), 'MMM d') : subs.length}
            onClick={() => setTab('renewals')}
          />
          <OverviewStat label="buy again" value={overdueBuys > 0 ? `${overdueBuys} overdue` : buyItems.length} color={overdueBuys > 0 ? 'var(--rose)' : undefined} onClick={() => setTab('buyagain')} />
        </div>
      )}

      {tab !== 'overview' && (
        <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.68, marginBottom: '0.6rem' }}>
          {TABS.find(tb => tb.id === tab)?.helper}
        </div>
      )}

      {tab === 'wishlist' && <WishlistCard userId={userId} />}
      {tab === 'gifts'    && <GiftsCard />}
      {tab === 'renewals' && <SubsCard />}
      {tab === 'buyagain' && <BuylistCard userId={userId} />}
    </div>
  )
}
