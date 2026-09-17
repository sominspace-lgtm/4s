'use client'

import { useState } from 'react'
import { useLists } from '@/lib/hooks/useLists'
import { usePlaces } from '@/lib/hooks/usePlaces'

// The other direction of the Bathroom codes list (2026-09-23): Places → Info
// is where you go to browse every code across every place; this is where you
// go to save or check ONE, right on the pin it belongs to, exactly where
// you're already looking when you actually need it — "conveniently saving
// codes so we can reference them easily later" means the save has to happen
// at the place, not on a separate list screen you have to remember exists.
//
// Same household_lists row either way, keyed by list name "Bathroom codes"
// (case-insensitive, matching NamedList.tsx) and this item's place_id — so a
// code set from here shows up in the Info tab's list too, and vice versa.
export default function PlaceBathroomCode({ spaceId, placeId, placeName }: {
  spaceId: string | null
  placeId: string
  placeName: string
}) {
  const { lists, loading, addList, addItem, updateItem } = useLists(spaceId)
  const { updatePlace } = usePlaces()
  const list = lists.find(l => l.name.trim().toLowerCase() === 'bathroom codes')
  const item = list?.items.find(i => i.place_id === placeId)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading) return null

  async function save() {
    const code = draft.trim()
    if (!code) return
    setSaving(true)
    if (item && list) {
      await updateItem(list.id, item.id, { note: code })
    } else {
      // The place's own name becomes the item's label — the code itself is
      // what actually matters here and lives in `note`; a second "what's
      // this called" field would just be the place name typed back in.
      const listId = list?.id ?? (await addList('Bathroom codes')).id
      if (listId) await addItem(listId, placeName, { note: code, place_id: placeId })
    }
    // A saved code implies a bathroom exists — keep the plain checkbox
    // (PlaceHasBathroom.tsx) in sync rather than leaving it unchecked next
    // to a code that says otherwise. One-directional: unchecking that box
    // later must never delete the code, it's just a lighter, independent flag.
    await updatePlace(placeId, { has_bathroom: true })
    setSaving(false)
    setEditing(false)
  }

  if (!editing && !item) {
    return (
      <button onClick={() => { setDraft(''); setEditing(true) }} className="press" style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        color: 'var(--gold)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem',
      }}>
        🚻 Save a bathroom code
      </button>
    )
  }

  if (!editing && item) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.76rem' }}>
        <span style={{ color: 'var(--muted)' }}>🚻 Bathroom code:</span>
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{item.note}</span>
        <button onClick={() => { setDraft(item.note ?? ''); setEditing(true) }} className="press" style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--gold)', fontSize: '0.66rem',
        }}>edit</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
      <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>🚻</span>
      <input
        autoFocus value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        placeholder="Code, e.g. 1234#" style={{
          flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
          padding: '0.35rem 0.55rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.74rem', outline: 'none',
        }}
      />
      <button onClick={save} disabled={saving || !draft.trim()} className="btn btn-secondary press" style={{ fontSize: '0.66rem' }}>
        {saving ? '…' : 'Save'}
      </button>
    </div>
  )
}
