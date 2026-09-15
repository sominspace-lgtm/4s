'use client'

import { useState } from 'react'
import { useLists, type HouseholdList } from '@/lib/hooks/useLists'
import { usePlaces, type Place } from '@/lib/hooks/usePlaces'
import { kindSpec } from '@/lib/constants/placeKinds'
import IconButton from '@/components/ui/IconButton'

const inputStyle: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '0.4rem 0.6rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.72rem', outline: 'none',
}

// Arbitrary named lists — "Bathroom codes", "Dream hotels", "Gift ideas for
// Mom" (2026-09-22). Sits alongside the games/watch backlog inside the
// renamed "Lists" section (see HouseholdWatchlist.tsx): same collapsible
// pattern, but each list is whatever name you give it rather than a fixed
// domain, and each item can optionally link to a Places pin and carry a
// reminder — the two things a plain checklist item can't do on its own.
export default function HouseholdCustomLists({ spaceId }: { spaceId: string | null }) {
  const { lists, loading, addList, addItem, updateItem, toggleItem, removeItem, removeList } = useLists(spaceId)
  const { places } = usePlaces()
  const [newListName, setNewListName] = useState('')
  const [addingList, setAddingList] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {lists.length === 0 && !loading && !addingList && (
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
          No lists yet — bathroom codes, dream hotels, whatever you want to keep track of.
        </div>
      )}

      {lists.map(list => (
        <ListCard
          key={list.id}
          list={list}
          places={places}
          onAddItem={(label, extra) => addItem(list.id, label, extra)}
          onUpdateItem={(itemId, patch) => updateItem(list.id, itemId, patch)}
          onToggleItem={itemId => toggleItem(list.id, itemId)}
          onRemoveItem={itemId => removeItem(list.id, itemId)}
          onRemoveList={() => removeList(list.id)}
        />
      ))}

      {addingList ? (
        <form
          onSubmit={async e => {
            e.preventDefault()
            if (!newListName.trim()) return
            await addList(newListName.trim())
            setNewListName('')
            setAddingList(false)
          }}
          style={{ display: 'flex', gap: '0.35rem' }}
        >
          <input autoFocus value={newListName} onChange={e => setNewListName(e.target.value)}
            placeholder="List name — e.g. Bathroom codes" style={{ ...inputStyle, flex: 1 }} />
          <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.68rem' }}>Create</button>
          <button type="button" onClick={() => setAddingList(false)} className="btn btn-ghost press" style={{ fontSize: '0.68rem' }}>Cancel</button>
        </form>
      ) : (
        <button onClick={() => setAddingList(true)} className="btn btn-ghost press" style={{ fontSize: '0.68rem', alignSelf: 'flex-start' }}>
          + New list
        </button>
      )}
    </div>
  )
}

function ListCard({ list, places, onAddItem, onUpdateItem, onToggleItem, onRemoveItem, onRemoveList }: {
  list: HouseholdList
  places: Place[]
  onAddItem: (label: string, extra?: { note?: string; place_id?: string | null; remind_at?: string | null }) => Promise<void>
  onUpdateItem: (itemId: string, patch: Record<string, unknown>) => Promise<void>
  onToggleItem: (itemId: string) => void
  onRemoveItem: (itemId: string) => void
  onRemoveList: () => void
}) {
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [linkPlaceId, setLinkPlaceId] = useState('')
  const [remindOn, setRemindOn] = useState('')

  return (
    <details style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem 0.8rem' }}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text)', flex: 1 }}>{list.name}</span>
        <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>{list.items.length}</span>
        <IconButton label={`Delete list ${list.name}`} onClick={onRemoveList} size={9} style={{ opacity: 0.35 }}>✕</IconButton>
      </summary>

      <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {list.items.length === 0 && (
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>Nothing on this list yet.</div>
        )}

        {list.items.map(item => {
          const place = item.place_id ? places.find(p => p.id === item.place_id) : null
          return (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0' }}>
              <button onClick={() => onToggleItem(item.id)} aria-pressed={item.done} aria-label={item.done ? `Mark ${item.label} not done` : `Mark ${item.label} done`}
                className="press" style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: 'pointer', padding: 0,
                  border: `1px solid ${item.done ? 'var(--emerald)' : 'var(--border)'}`,
                  background: item.done ? 'color-mix(in srgb, var(--emerald) 30%, transparent)' : 'transparent',
                }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text)', textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.55 : 1 }}>
                  {item.label}
                </div>
                {(item.note || place || item.remind_at) && (
                  <div style={{ fontSize: '0.64rem', color: 'var(--muted)', opacity: 0.75, display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {item.note && <span>{item.note}</span>}
                    {place && (
                      <span style={{ color: `var(${kindSpec(place.kind).color})` }}>
                        {kindSpec(place.kind).icon} {place.name}
                      </span>
                    )}
                    {item.remind_at && (
                      <button onClick={() => onUpdateItem(item.id, { remind_at: null })} title="Remove reminder" className="press"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--gold)', fontSize: '0.64rem' }}>
                        🔔 {new Date(item.remind_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <IconButton label={`Remove ${item.label}`} onClick={() => onRemoveItem(item.id)} size={9} style={{ opacity: 0.35, flexShrink: 0 }}>✕</IconButton>
            </div>
          )
        })}

        <form
          onSubmit={async e => {
            e.preventDefault()
            if (!label.trim()) return
            await onAddItem(label.trim(), {
              note: note.trim() || undefined,
              place_id: linkPlaceId || undefined,
              // Noon, not midnight — the daily reminder cron runs once at
              // 4am UTC and checks "has this arrived yet", so a reminder is
              // day-granularity in practice no matter what time is picked;
              // noon keeps it clearly "today", not accidentally tomorrow
              // across US timezones if it were midnight UTC.
              remind_at: remindOn ? `${remindOn}T12:00:00Z` : undefined,
            })
            setLabel(''); setNote(''); setLinkPlaceId(''); setRemindOn('')
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.3rem' }}
        >
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Add an item" style={{ ...inputStyle, flex: 1 }} />
            <button type="submit" className="btn btn-ghost press" style={{ fontSize: '0.66rem' }}>Add</button>
          </div>
          {/* Note + place link are optional, so they only show once you're
              actually typing something — an empty form shouldn't look like
              three required fields for "buy milk". */}
          {label.trim() && (
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note — e.g. a code" style={{ ...inputStyle, flex: 1, minWidth: '8rem' }} />
              <input type="date" value={remindOn} onChange={e => setRemindOn(e.target.value)} title="Remind me on"
                style={{ ...inputStyle, cursor: 'pointer' }} />
              {places.length > 0 && (
                <select value={linkPlaceId} onChange={e => setLinkPlaceId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', maxWidth: '9rem' }}>
                  <option value="">Link a place…</option>
                  {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>
          )}
        </form>
      </div>
    </details>
  )
}
