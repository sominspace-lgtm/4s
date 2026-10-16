'use client'

import { itemDone, sectionsOf, type RoutineItem } from '@/lib/routines/items'

// A routine's steps as a checklist, section by section, with each section's
// time beside its name. Big tick boxes for a thumb. Notes read as plain text.
export default function RoutineChecklist({ items, cadenceDays, onToggle, onToggleShared, canShare }: {
  items: RoutineItem[]; cadenceDays: number
  onToggle: (itemId: string) => void
  /** Personal routines only: share one step with your partner. */
  onToggleShared?: (itemId: string) => void
  canShare?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      {sectionsOf(items).map(sec => (
        <div key={sec.key}>
          {(sec.group || sec.time) && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
              {sec.time && <span style={{ fontSize: '0.72rem', color: 'var(--gold)', minWidth: '4.2rem' }}>{sec.time}</span>}
              {sec.group && <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 }}>{sec.group}</span>}
            </div>
          )}
          {sec.items.map(i => {
            if (i.note) {
              return <div key={i.id} style={{ fontSize: '0.84rem', color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.5, padding: '0.3rem 0' }}>{i.label}</div>
            }
            const done = itemDone(i, cadenceDays)
            return (
              <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <button onClick={() => onToggle(i.id)} className="press" aria-pressed={done} aria-label={done ? `Untick ${i.label}` : `Tick ${i.label}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minHeight: 40, background: 'none', border: 'none', padding: '0.15rem 0', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${done ? 'var(--gold)' : 'var(--border)'}`,
                    background: done ? 'var(--gold)' : 'transparent', color: 'var(--bg)', fontSize: '0.7rem',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>{done ? '✓' : ''}</span>
                  <span style={{ fontSize: '0.86rem', lineHeight: 1.4, color: 'var(--text)', opacity: done ? 0.45 : 1, textDecoration: done ? 'line-through' : 'none' }}>{i.label}</span>
                </button>
                {onToggleShared && (
                  <button onClick={() => onToggleShared(i.id)} disabled={!canShare}
                    title={i.shared ? 'Shared with your partner' : 'Share this step with your partner'}
                    style={{ background: 'none', border: 'none', cursor: canShare ? 'pointer' : 'default', minWidth: 32, minHeight: 32, flexShrink: 0, fontSize: '0.72rem', color: i.shared ? 'var(--gold)' : 'var(--muted)', opacity: i.shared ? 0.9 : 0.3 }}>⇆</button>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
