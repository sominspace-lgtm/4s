'use client'

import { useEffect, useRef } from 'react'
import { saveLayout, type LayoutState } from '@/lib/persistence/saveLayout'
import { TODAY_BLOCK_META, REORDERABLE, type TodayBlockConfig } from '@/lib/utils/todayBlocks'

// Same drawer, reorder-and-hide pattern as CustomizePanel.tsx (which does
// this for the top-level tabs) — scoped one level down, to what Today itself
// is made of. Today used to be one fixed stack; someone who never uses
// Reflection had no way to say so.
interface Props {
  open: boolean
  blocks: TodayBlockConfig[]
  current: LayoutState
  userId: string
  onChange: (blocks: TodayBlockConfig[]) => void
  onClose: () => void
}

export default function TodayCustomizePanel({ open, blocks, current, userId, onChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  async function update(next: TodayBlockConfig[]) {
    onChange(next)
    await saveLayout(userId, current, { todayBlocks: next })
  }

  function toggle(id: string) {
    update(blocks.map(b => b.id === id ? { ...b, hidden: !b.hidden } : b))
  }

  // Swaps within the reorderable subset only (see REORDERABLE) — One thing,
  // Capacity, and Calendar each render at a fixed spot regardless of their
  // position in this array, so moving them wouldn't do anything visible.
  // Their entries still carry a real `hidden` flag, just not a meaningful
  // position; the arrows are hidden for them below rather than pretending.
  function move(id: string, dir: -1 | 1) {
    const order = blocks.filter(b => REORDERABLE.has(b.id))
    const idx = order.findIndex(b => b.id === id)
    const j = idx + dir
    if (idx === -1 || j < 0 || j >= order.length) return
    const a = order[idx], b = order[j]
    update(blocks.map(x => (x.id === a.id ? b : x.id === b.id ? a : x)))
  }

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 199, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.2s',
      }} />

      <div ref={ref} style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '300px',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 200, padding: '1.5rem',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Customize Today
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
          }}>✕</button>
        </div>

        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.6, marginBottom: '0.5rem', lineHeight: 1.6 }}>
          Reorder with ↑↓ or hide blocks with the eye toggle. One thing stays recommended at the top, but nothing here is required.
        </div>

        {(() => {
          const reorderOrder = blocks.filter(b => REORDERABLE.has(b.id)).map(b => b.id)
          return blocks.map(b => {
            const meta = TODAY_BLOCK_META[b.id]
            const canReorder = REORDERABLE.has(b.id)
            const ri = reorderOrder.indexOf(b.id)
            return (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 0.7rem', borderRadius: '8px',
                background: b.hidden ? 'transparent' : 'var(--hover-bg)',
                border: '1px solid var(--border)', opacity: b.hidden ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }}>
              {/* Fixed-position blocks (One thing, Capacity, Calendar) get no
                  arrows — showing disabled ones would imply they do
                  something. A blank spacer keeps every row's label aligned
                  to the same left edge either way. */}
              {canReorder ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <button onClick={() => move(b.id, -1)} disabled={ri === 0} className="press" style={{
                    background: 'none', border: 'none', color: 'var(--muted)', cursor: ri === 0 ? 'default' : 'pointer',
                    fontSize: '0.55rem', lineHeight: 1, padding: '1px', opacity: ri === 0 ? 0.2 : 0.6,
                  }}>▲</button>
                  <button onClick={() => move(b.id, 1)} disabled={ri === reorderOrder.length - 1} className="press" style={{
                    background: 'none', border: 'none', color: 'var(--muted)', cursor: ri === reorderOrder.length - 1 ? 'default' : 'pointer',
                    fontSize: '0.55rem', lineHeight: 1, padding: '1px', opacity: ri === reorderOrder.length - 1 ? 0.2 : 0.6,
                  }}>▼</button>
                </div>
              ) : (
                <div style={{ width: '0.9rem', flexShrink: 0 }} title="Fixed position" />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text)', fontWeight: 300 }}>{meta.label}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.65 }}>{meta.hint}</div>
              </div>

              <button onClick={() => toggle(b.id)} title={b.hidden ? 'Show block' : 'Hide block'} className="press" style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.82rem', color: 'var(--muted)', opacity: b.hidden ? 0.3 : 0.7,
                padding: '2px', lineHeight: 1,
              }}>
                {b.hidden ? '🙈' : '👁'}
              </button>
              </div>
            )
          })
        })()}
      </div>
    </>
  )
}
