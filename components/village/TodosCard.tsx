'use client'

import { useState } from 'react'
import { useLists } from '@/lib/hooks/useLists'
import Icon from '@/components/ui/Icon'

// Household checklists on the Village home panel — tick items off right here,
// add new ones. Backed by useLists (household_lists), the same lists that
// live in Household → Reference. Shows every list; if there are none, one tap
// starts a "To do" list.

export default function TodosCard({ spaceId, onInteract }: { spaceId: string | null; onInteract?: () => void }) {
  const { lists, loading, addList, addItem, toggleItem } = useLists(spaceId)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const add = async (listId: string) => {
    const t = (drafts[listId] ?? '').trim()
    if (!t) return
    await addItem(listId, t)
    setDrafts(d => ({ ...d, [listId]: '' }))
    onInteract?.()
  }

  return (
    <div className="organic" style={{
      background: 'color-mix(in srgb, var(--gold) 9%, var(--surface2))',
      border: '1px solid color-mix(in srgb, var(--gold) 22%, var(--border))',
      borderRadius: 14, padding: '0.65rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span aria-hidden style={{ display: 'inline-flex', color: 'var(--gold)' }}><Icon name="check" size={16} /></span>
        <span style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text)', flex: 1 }}>To-do lists</span>
      </div>

      {!loading && lists.length === 0 && (
        <button
          onClick={() => { addList('To do'); onInteract?.() }}
          style={{
            alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--gold)', fontSize: '0.7rem', padding: 0,
          }}
        >+ Start a list</button>
      )}

      {lists.map(list => {
        const openItems = list.items.filter(i => !i.done)
        return (
          <div key={list.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {lists.length > 1 && (
              <div style={{ fontSize: '0.64rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {list.name}
              </div>
            )}
            {openItems.slice(0, 6).map(item => (
              <button key={item.id} onClick={() => { toggleItem(list.id, item.id); onInteract?.() }} className="press" style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left', padding: '0.1rem 0', fontFamily: 'inherit',
              }}>
                <span style={{ width: 15, height: 15, flexShrink: 0, borderRadius: 4, border: '1.5px solid var(--border)' }} />
                <span style={{ fontSize: '0.74rem', color: 'var(--text)' }}>{item.label}</span>
              </button>
            ))}
            {openItems.length === 0 && (
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontStyle: 'italic' }}>All done.</div>
            )}
            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.15rem' }}>
              <input
                value={drafts[list.id] ?? ''}
                onChange={e => setDrafts(d => ({ ...d, [list.id]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') add(list.id) }}
                placeholder="Add an item"
                style={{
                  flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '0.3rem 0.5rem', fontSize: '0.7rem', color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button onClick={() => add(list.id)} className="press" aria-label="Add" style={{
                background: 'var(--gold)', color: 'var(--bg)', border: 'none', borderRadius: 8,
                padding: '0 0.5rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, lineHeight: 1,
              }}>+</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
