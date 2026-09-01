'use client'

import { useState } from 'react'
import { WorkRow } from './MasterDashboard'
import { BOARD_COLUMNS, effectiveColumn, type BoardColumn } from '@/lib/utils/boardColumn'
import type { WorkItem } from '@/lib/hooks/useWorkItems'
import Icon from '@/components/ui/Icon'

interface Props {
  items: WorkItem[]
  onStatus: (id: string, s: WorkItem['status']) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, patch: Partial<WorkItem>) => void
}

// The notice board from the Village vision: tasks as movable cards across
// Small/Growing/Projects/Later instead of one flat list. Each card is the
// same WorkRow used everywhere else — this is a layout, not a second task
// model. Column is a stored choice once someone drags or picks one
// (board_column); until then it's derived from energy + due date (see
// lib/utils/boardColumn.ts), so every task lands somewhere without a
// backfill and dragging is optional, not required busywork.
//
// Two ways to move a card: HTML5 drag-and-drop for the mouse, and a plain
// <select> per card for everyone else — native selects are fully keyboard
// operable (Tab to focus, arrows to change), which covers the accessible
// alternative without inventing custom arrow-key reordering.
export default function NoticeBoard({ items, onStatus, onRemove, onUpdate }: Props) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<BoardColumn | null>(null)

  function moveTo(id: string, col: BoardColumn) {
    onUpdate(id, { board_column: col })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.8rem' }}>
      {BOARD_COLUMNS.map(col => {
        const colItems = items.filter(i => effectiveColumn(i) === col.id)
        const isDragTarget = dragOverCol === col.id

        return (
          <div
            key={col.id}
            onDragOver={e => { e.preventDefault(); setDragOverCol(col.id) }}
            onDragLeave={() => setDragOverCol(c => (c === col.id ? null : c))}
            onDrop={e => {
              e.preventDefault()
              if (dragId) moveTo(dragId, col.id)
              setDragId(null)
              setDragOverCol(null)
            }}
            style={{
              background: isDragTarget ? 'color-mix(in srgb, var(--gold) 6%, var(--hover-bg))' : 'var(--hover-bg)',
              border: `1px dashed ${isDragTarget ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: '10px', padding: '0.65rem', minHeight: '90px',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <div style={{
              fontSize: '0.66rem', letterSpacing: '0.04em', color: 'var(--muted)',
              marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem',
            }}>
              <span aria-hidden style={{ display: 'inline-flex' }}><Icon name={col.icon} size={13} /></span> {col.label}
              <span style={{ opacity: 0.5 }}>· {colItems.length}</span>
            </div>

            {colItems.length === 0 && (
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.4, fontStyle: 'italic', padding: '0.3rem 0' }}>
                Nothing here.
              </div>
            )}

            {colItems.map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDragId(item.id)}
                onDragEnd={() => { setDragId(null); setDragOverCol(null) }}
                style={{
                  marginBottom: '0.5rem', opacity: dragId === item.id ? 0.4 : 1,
                  cursor: 'grab', background: 'var(--surface)', borderRadius: '9px', padding: '0 0.1rem',
                }}
              >
                <WorkRow item={item} onStatus={onStatus} onRemove={onRemove} onUpdate={onUpdate} />
                <select
                  aria-label={`Move "${item.title}" to a different column`}
                  value={effectiveColumn(item)}
                  onChange={e => moveTo(item.id, e.target.value as BoardColumn)}
                  style={{
                    fontSize: '0.58rem', marginTop: '0.15rem', background: 'transparent',
                    border: '1px solid var(--faint)', borderRadius: '5px', color: 'var(--muted)',
                    padding: '0.1rem 0.3rem', fontFamily: 'var(--font-body)', cursor: 'pointer',
                  }}
                >
                  {BOARD_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
