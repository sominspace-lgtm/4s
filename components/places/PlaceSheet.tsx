'use client'

import { useState } from 'react'
import PlacesSheet from '@/components/places/PlacesSheet'
import PlaceKindFields from '@/components/places/PlaceKindFields'
import ProvenanceBadge from '@/components/places/ProvenanceBadge'
import { kindSpec, KIND_ORDER } from '@/lib/constants/placeKinds'
import { usePlaces, type Place, type PlaceStatus } from '@/lib/hooks/usePlaces'

const STATUS_LABEL: Record<PlaceStatus, string> = {
  idea: 'Want to go', been: 'Been', favourite: 'Favourite', archived: 'Archived',
}

// Type-adaptive place detail. Order, top to bottom: name, kind + city, one
// primary action, editable note, kind-specific fields, tags, destructive
// actions as a tertiary link at the bottom. No rating anywhere — see
// supabase/migrations/places_travel.sql for why. Google/lookup refresh isn't
// here yet; place lookup (Phase 3) adds that block.
export default function PlaceSheet({ place, open, onClose }: {
  place: Place | null
  open: boolean
  onClose: () => void
}) {
  const { updatePlace, removePlace } = usePlaces()
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [editingFields, setEditingFields] = useState(false)
  const [tagDraft, setTagDraft] = useState('')

  if (!place) return <PlacesSheet open={open} onClose={onClose} title="Place">{null}</PlacesSheet>

  const spec = kindSpec(place.kind)
  const mapsHref = place.maps_url
    ?? (place.lat != null && place.lng != null ? `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=17/${place.lat}/${place.lng}` : null)

  async function saveNote() {
    await updatePlace(place!.id, { note: noteDraft.trim() || null })
    setEditingNote(false)
  }

  async function addTag(e: React.FormEvent) {
    e.preventDefault()
    const tag = tagDraft.trim()
    if (!tag || place!.tags.includes(tag)) { setTagDraft(''); return }
    await updatePlace(place!.id, { tags: [...place!.tags, tag] })
    setTagDraft('')
  }

  async function removeTag(tag: string) {
    await updatePlace(place!.id, { tags: place!.tags.filter(t => t !== tag) })
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.78rem',
    padding: '0.5rem 0.7rem', outline: 'none', width: '100%',
  }

  return (
    <PlacesSheet open={open} onClose={onClose} title={spec.label}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span aria-hidden style={{ fontSize: '1.1rem', color: `var(${spec.color})` }}>{spec.icon}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', color: 'var(--text)' }}>
              {place.name}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            {spec.label}{place.city ? ` · ${place.city}` : ''}
          </div>
        </div>

        {/* Status — the only "rating" this product has: whether you'd go. */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {(['idea', 'been', 'favourite'] as PlaceStatus[]).map(s => (
            <button
              key={s}
              onClick={() => updatePlace(place!.id, { status: s })}
              className="btn press"
              style={{
                fontSize: '0.68rem',
                background: place.status === s ? 'color-mix(in srgb, var(--gold) 14%, transparent)' : 'transparent',
                color: place.status === s ? 'var(--gold)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {mapsHref && (
          <a href={mapsHref} target="_blank" rel="noreferrer" className="btn btn-primary press" style={{ fontSize: '0.74rem', textAlign: 'center', textDecoration: 'none' }}>
            Open in Maps
          </a>
        )}

        {/* Note — the field people actually read back later. */}
        <div>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.75, marginBottom: '0.4rem' }}>
            Note
          </div>
          {editingNote ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <textarea
                autoFocus value={noteDraft} onChange={e => setNoteDraft(e.target.value)}
                rows={3} style={{ ...inputStyle, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button onClick={saveNote} className="btn btn-secondary press" style={{ fontSize: '0.68rem' }}>Save</button>
                <button onClick={() => setEditingNote(false)} className="btn btn-ghost press" style={{ fontSize: '0.68rem' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setEditingNote(true); setNoteDraft(place!.note ?? '') }}
              className="press"
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
                fontSize: '0.78rem', color: place.note ? 'var(--text)' : 'var(--muted)',
                opacity: place.note ? 0.9 : 0.6, fontFamily: 'var(--font-body)', lineHeight: 1.6,
              }}
            >
              {place.note ?? 'add a note'}
            </button>
          )}
        </div>

        {(place.address || place.lat != null) && (
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            {place.address ?? `${place.lat?.toFixed(4)}, ${place.lng?.toFixed(4)}`}
            <ProvenanceBadge source={place.provenance?.address} verifiedAt={place.verified_at} />
          </div>
        )}

        {/* Kind-specific fields */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <div style={{ fontSize: '0.68rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.75 }}>
              Details
            </div>
            <button onClick={() => setEditingFields(v => !v)} className="btn btn-ghost press" style={{ fontSize: '0.64rem' }}>
              {editingFields ? 'Done' : 'Edit'}
            </button>
          </div>
          <PlaceKindFields
            place={place}
            editing={editingFields}
            onChange={details => updatePlace(place!.id, { details })}
          />
        </div>

        {/* Kind picker — reassigning a place's type is common early on. */}
        {editingFields && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.74rem' }}>
            <span style={{ color: 'var(--muted)' }}>Kind</span>
            <select value={place.kind} onChange={e => updatePlace(place!.id, { kind: e.target.value })} style={inputStyle}>
              {KIND_ORDER.map(k => <option key={k} value={k}>{kindSpec(k).label}</option>)}
            </select>
          </label>
        )}

        {/* Tags */}
        <div>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.75, marginBottom: '0.4rem' }}>
            Tags
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {place.tags.map(tag => (
              <span key={tag} className="pill" style={{ fontSize: '0.66rem', padding: '0.3rem 0.6rem' }}>
                {tag}
                <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: '0.6rem' }}>✕</button>
              </span>
            ))}
          </div>
          <form onSubmit={addTag} style={{ display: 'flex', gap: '0.4rem' }}>
            <input value={tagDraft} onChange={e => setTagDraft(e.target.value)} placeholder="add a tag" style={inputStyle} />
            <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.68rem' }}>Add</button>
          </form>
        </div>

        <button
          onClick={() => { removePlace(place!.id); onClose() }}
          className="press"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.5, fontSize: '0.66rem', padding: 0, textAlign: 'left', marginTop: '0.4rem' }}
        >
          Remove this pin
        </button>
      </div>
    </PlacesSheet>
  )
}
