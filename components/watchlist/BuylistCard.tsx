'use client'

import { useState } from 'react'
import { useBuyItems, REFILL_CATEGORIES, computeStatus, type RefillCategory } from '@/lib/hooks/useBuyItems'
import RefillCard from '@/components/refill/RefillCard'
import AddRefillFlow from '@/components/refill/AddRefillFlow'

export default function BuylistCard({ userId }: { userId: string }) {
  const { items, add, markBought, markOpened, snooze, togglePaused, submitFeedback, remove } = useBuyItems()
  const [showAdd, setShowAdd] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<RefillCategory | 'all'>('all')

  const filtered = categoryFilter === 'all' ? items : items.filter(i => i.category === categoryFilter)
  const sorted = [...filtered].sort((a, b) => {
    const rank: Record<string, number> = { overdue: 0, 'due-to-buy': 1, 'running-low': 2, stocked: 3, snoozed: 4, 'backup-stock': 5, paused: 6 }
    return (rank[computeStatus(a)] ?? 9) - (rank[computeStatus(b)] ?? 9)
  })

  const usedCategories = new Set(items.map(i => i.category))

  return (
    <div className="card-interactive" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.4rem 1.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 400, letterSpacing: '0.02em', color: 'var(--muted)' }}>Refill Intelligence</div>
        <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>recurring purchases</span>
      </div>
      <p style={{ fontSize: '0.73rem', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '0.8rem', lineHeight: 1.5 }}>
        Add something once. 4S stays quiet until it's time to buy again.
      </p>

      {items.length > 0 && (
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
          <button onClick={() => setCategoryFilter('all')} className="btn" style={{
            fontSize: '0.62rem', padding: '0.2em 0.6em', border: 'none',
            background: categoryFilter === 'all' ? 'var(--hover-bg)' : 'transparent',
            color: categoryFilter === 'all' ? 'var(--text)' : 'var(--muted)',
          }}>All</button>
          {REFILL_CATEGORIES.filter(c => usedCategories.has(c.id)).map(c => (
            <button key={c.id} onClick={() => setCategoryFilter(c.id)} className="btn" style={{
              fontSize: '0.62rem', padding: '0.2em 0.6em', border: 'none',
              background: categoryFilter === c.id ? 'var(--hover-bg)' : 'transparent',
              color: categoryFilter === c.id ? 'var(--text)' : 'var(--muted)',
            }}>{c.label}</button>
          ))}
        </div>
      )}

      {items.length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>Nothing on repeat yet. Add something you always run out of.</p>}
      {items.length > 0 && sorted.length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>Nothing in this category yet.</p>}

      {sorted.map(item => (
        <RefillCard
          key={item.id}
          item={item}
          userId={userId}
          onMarkBought={markBought}
          onMarkOpened={markOpened}
          onSnooze={snooze}
          onTogglePaused={togglePaused}
          onFeedback={submitFeedback}
          onRemove={remove}
        />
      ))}

      {!showAdd ? (
        <button onClick={() => setShowAdd(true)} className="btn btn-secondary" style={{ marginTop: '1rem', width: '100%' }}>+ add refill item</button>
      ) : (
        <AddRefillFlow
          onCancel={() => setShowAdd(false)}
          onSubmit={async input => { await add(input); setShowAdd(false) }}
        />
      )}
    </div>
  )
}
