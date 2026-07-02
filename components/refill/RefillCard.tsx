'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { computeStatus, runoutDate, STATUS_LABEL, REFILL_CATEGORIES, type BuyItem, type RefillStatus } from '@/lib/hooks/useBuyItems'
import ShareMenu from '@/components/ui/ShareMenu'

const STATUS_COLOR: Record<RefillStatus, string> = {
  stocked: 'var(--muted)', 'backup-stock': 'var(--slate)', 'running-low': 'var(--amber)',
  'due-to-buy': 'var(--amber)', overdue: 'var(--rose)', snoozed: 'var(--purple)', paused: 'var(--muted)',
}

interface Props {
  item: BuyItem
  userId: string
  onMarkBought: (id: string) => void
  onMarkOpened: (id: string) => void
  onSnooze: (id: string, days: number) => void
  onTogglePaused: (id: string) => void
  onFeedback: (id: string, fb: 'too-early' | 'just-right' | 'too-late') => void
  onRemove: (id: string) => void
}

export default function RefillCard({ item, userId, onMarkBought, onMarkOpened, onSnooze, onTogglePaused, onFeedback, onRemove }: Props) {
  const [showFeedback, setShowFeedback] = useState(false)
  const status = computeStatus(item)
  const color = STATUS_COLOR[status]
  const due = runoutDate(item)
  const categoryLabel = REFILL_CATEGORIES.find(c => c.id === item.category)?.label ?? 'Other'

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', padding: '0.7rem 0', borderBottom: '1px solid var(--faint)' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, marginTop: '0.35rem' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{item.name}</div>
        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.15rem', opacity: 0.78 }}>
          {categoryLabel} · <span style={{ color }}>{STATUS_LABEL[status]}</span>
          {due && status !== 'backup-stock' && ` · runs out ${format(due, 'MMM d')}`}
          {due && status !== 'backup-stock' && ` · notify ${item.notify_days_before}d before`}
        </div>
        {item.store && <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.55, marginTop: '0.1rem' }}>{item.store}</div>}

        {showFeedback && (
          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.6, alignSelf: 'center' }}>This reminder was:</span>
            {(['too-early', 'just-right', 'too-late'] as const).map(fb => (
              <button key={fb} onClick={() => { onFeedback(item.id, fb); setShowFeedback(false) }} className="btn btn-ghost" style={{ fontSize: '0.6rem', padding: '0.15em 0.5em' }}>
                {fb === 'too-early' ? 'Too early' : fb === 'just-right' ? 'Just right' : 'Too late'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          {item.buy_url && (
            <a href={item.buy_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '0.62rem', textDecoration: 'none', padding: '0.2em 0.5em' }}>
              open link →
            </a>
          )}
          {status === 'backup-stock' ? (
            <button onClick={() => onMarkOpened(item.id)} className="btn btn-secondary" style={{ fontSize: '0.62rem', padding: '0.2em 0.5em' }}>start using</button>
          ) : (
            <button onClick={() => { onMarkBought(item.id); setShowFeedback(status === 'due-to-buy' || status === 'overdue') }} className="btn btn-secondary" style={{ fontSize: '0.62rem', padding: '0.2em 0.5em' }}>✓ bought</button>
          )}
          <button onClick={() => onSnooze(item.id, 7)} title="Snooze 7 days" className="btn btn-ghost" style={{ fontSize: '0.62rem', padding: '0.2em 0.5em' }}>snooze</button>
          <ShareMenu itemType="buy_item" itemId={item.id} userId={userId} />
          <button onClick={() => onTogglePaused(item.id)} title={item.status === 'paused' ? 'Resume tracking' : 'Pause tracking'} className="btn btn-ghost" style={{ fontSize: '0.62rem', padding: '0.2em 0.4em' }}>
            {item.status === 'paused' ? '▶' : '⏸'}
          </button>
          <button onClick={() => onRemove(item.id)} aria-label="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.62rem', opacity: 0.4 }}>✕</button>
        </div>
      </div>
    </div>
  )
}
