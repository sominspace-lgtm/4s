'use client'

import { useState } from 'react'
import PlacesSheet from '@/components/places/PlacesSheet'
import { kindSpec, KIND_ORDER } from '@/lib/constants/placeKinds'
import { usePlaces } from '@/lib/hooks/usePlaces'

// Manual entry only (Phase 2). Places must be fully usable with zero external
// services — this is that path, not a fallback for when Phase 3's place
// lookup is unavailable. Phase 3 adds a search box above this same form that
// fills these fields in; it does not replace them.
export default function AddPlacePanel({ open, spaceId, hasSpace, onClose }: {
  open: boolean
  spaceId: string | null
  hasSpace: boolean
  onClose: () => void
}) {
  const { addPlace } = usePlaces()
  const [name, setName] = useState('')
  const [kind, setKind] = useState('place')
  const [note, setNote] = useState('')
  const [address, setAddress] = useState('')
  const [shared, setShared] = useState(false)
  const [saving, setSaving] = useState(false)

  function reset() {
    setName(''); setKind('place'); setNote(''); setAddress(''); setShared(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { error } = await addPlace({
      name: name.trim(),
      kind,
      note: note.trim() || null,
      address: address.trim() || null,
      shared,
    }, spaceId)
    setSaving(false)
    if (!error) { reset(); onClose() }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.78rem',
    padding: '0.55rem 0.75rem', outline: 'none', width: '100%',
  }

  return (
    <PlacesSheet open={open} onClose={onClose} title="Save a place">
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={inputStyle} />

        <select value={kind} onChange={e => setKind(e.target.value)} style={inputStyle}>
          {KIND_ORDER.map(k => <option key={k} value={k}>{kindSpec(k).label}</option>)}
        </select>

        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address or area (optional)" style={inputStyle} />

        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note — why you're saving it (optional)" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />

        {hasSpace && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} />
            Share with household
          </label>
        )}

        <div style={{ fontSize: '0.66rem', color: 'var(--muted)', opacity: 0.7, lineHeight: 1.5 }}>
          No coordinates yet — that&rsquo;s fine. This pin will show in the list under &ldquo;no location&rdquo; until you add them or look it up.
        </div>

        <button type="submit" disabled={!name.trim() || saving} className="btn btn-primary press" style={{ fontSize: '0.74rem', alignSelf: 'flex-start' }}>
          {saving ? 'Saving…' : 'Save pin'}
        </button>
      </form>
    </PlacesSheet>
  )
}
