'use client'

import { useEffect, useState } from 'react'
import PlacesSheet from '@/components/places/PlacesSheet'
import PlaceKindFields from '@/components/places/PlaceKindFields'
import ProvenanceBadge from '@/components/places/ProvenanceBadge'
import { kindSpec, KIND_ORDER } from '@/lib/constants/placeKinds'
import { usePlaces, type Place, type PlaceStatus } from '@/lib/hooks/usePlaces'
import { getPlacePhotoUrls } from '@/lib/storage/placePhotos'

const STATUS_LABEL: Record<PlaceStatus, string> = {
  idea: 'Want to go', good: '👍 Good — go again', hmm: '🤷 Hmm — no strong opinion', bad: '👎 Not again', archived: 'Archived',
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
  const { updatePlace, removePlace, addPhoto, removePhoto } = usePlaces()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [editingFields, setEditingFields] = useState(false)
  const [tagDraft, setTagDraft] = useState('')
  const [editingAddress, setEditingAddress] = useState(false)
  const [addressDraft, setAddressDraft] = useState('')
  const [cityDraft, setCityDraft] = useState('')
  const [countryDraft, setCountryDraft] = useState('')
  const [editingVisited, setEditingVisited] = useState(false)
  const [visitedDraft, setVisitedDraft] = useState('')
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!place || place.photo_paths.length === 0) { setPhotoUrls({}); return }
    let cancelled = false
    getPlacePhotoUrls(place.photo_paths).then(urls => { if (!cancelled) setPhotoUrls(urls) })
    return () => { cancelled = true }
  }, [place?.id, place?.photo_paths])

  if (!place) return <PlacesSheet open={open} onClose={onClose} title="Place">{null}</PlacesSheet>

  const spec = kindSpec(place.kind)
  const mapsHref = place.maps_url
    ?? (place.lat != null && place.lng != null ? `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=17/${place.lat}/${place.lng}` : null)

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !place) return
    setUploading(true)
    await addPhoto(place, file)
    setUploading(false)
  }

  async function saveName() {
    const trimmed = nameDraft.trim()
    if (!trimmed) { setEditingName(false); return }
    await updatePlace(place!.id, { name: trimmed })
    setEditingName(false)
  }

  async function saveNote() {
    await updatePlace(place!.id, { note: noteDraft.trim() || null })
    setEditingNote(false)
  }

  async function saveAddress() {
    await updatePlace(place!.id, {
      address: addressDraft.trim() || null,
      city: cityDraft.trim() || null,
      country: countryDraft.trim() || null,
    })
    setEditingAddress(false)
  }

  async function saveVisited() {
    await updatePlace(place!.id, { first_visited_on: visitedDraft || null })
    setEditingVisited(false)
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
          {editingName ? (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.2rem' }}>
              <span aria-hidden style={{ fontSize: '1.1rem', color: `var(${spec.color})`, flexShrink: 0 }}>{spec.icon}</span>
              <input
                autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                style={{ ...inputStyle, fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', padding: '0.3rem 0.5rem' }}
              />
              <button onClick={saveName} className="btn btn-secondary press" style={{ fontSize: '0.68rem', flexShrink: 0 }}>Save</button>
              <button onClick={() => setEditingName(false)} className="btn btn-ghost press" style={{ fontSize: '0.68rem', flexShrink: 0 }}>Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => { setEditingName(true); setNameDraft(place!.name) }}
              className="press"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem',
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span aria-hidden style={{ fontSize: '1.1rem', color: `var(${spec.color})` }}>{spec.icon}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', color: 'var(--text)' }}>
                {place.name}
              </span>
            </button>
          )}
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            {spec.label}{place.city ? ` · ${place.city}` : ''}
          </div>
          {place.kind === 'unset' && (
            <div style={{ fontSize: '0.68rem', color: 'var(--amber)', opacity: 0.85, marginTop: '0.3rem' }}>
              Needs a type — pick one below in Details.
            </div>
          )}
        </div>

        {/* Status — the only "rating" this product has: whether you'd go. */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {(['idea', 'good', 'hmm', 'bad'] as PlaceStatus[]).map(s => (
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

        {/* Photos */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <div style={{ fontSize: '0.68rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.75 }}>
              Photos
            </div>
            <label className="btn btn-ghost press" style={{ fontSize: '0.64rem', cursor: 'pointer' }}>
              {uploading ? 'Uploading…' : '+ Add'}
              <input type="file" accept="image/*" onChange={handlePhotoPick} disabled={uploading} style={{ display: 'none' }} />
            </label>
          </div>
          {place.photo_paths.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: '0.4rem' }}>
              {place.photo_paths.map(path => (
                <div key={path} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: 'var(--surface2)' }}>
                  {photoUrls[path] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrls[path]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  )}
                  <button
                    onClick={() => removePhoto(place!, path)}
                    title="Remove photo"
                    className="press"
                    style={{
                      position: 'absolute', top: '3px', right: '3px', width: '18px', height: '18px',
                      borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff',
                      fontSize: '0.6rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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

        <div>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.75, marginBottom: '0.4rem' }}>
            Address
          </div>
          {editingAddress ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <input autoFocus value={addressDraft} onChange={e => setAddressDraft(e.target.value)} placeholder="Street address" style={inputStyle} />
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input value={cityDraft} onChange={e => setCityDraft(e.target.value)} placeholder="City" style={inputStyle} />
                <input value={countryDraft} onChange={e => setCountryDraft(e.target.value)} placeholder="Country" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button onClick={saveAddress} className="btn btn-secondary press" style={{ fontSize: '0.68rem' }}>Save</button>
                <button onClick={() => setEditingAddress(false)} className="btn btn-ghost press" style={{ fontSize: '0.68rem' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditingAddress(true)
                setAddressDraft(place!.address ?? '')
                setCityDraft(place!.city ?? '')
                setCountryDraft(place!.country ?? '')
              }}
              className="press"
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
                fontSize: '0.74rem', color: place.address || place.city ? 'var(--text)' : 'var(--muted)',
                opacity: place.address || place.city ? 0.9 : 0.6, fontFamily: 'var(--font-body)', lineHeight: 1.6,
              }}
            >
              {place.address || place.city
                ? [place.address, place.city, place.country].filter(Boolean).join(', ')
                : place.lat != null
                  ? `${place.lat.toFixed(4)}, ${place.lng?.toFixed(4)}`
                  : 'add an address'}
              <ProvenanceBadge source={place.provenance?.address} verifiedAt={place.verified_at} />
            </button>
          )}
        </div>

        {/* First visited — auto-stamped the first time status goes to
            good/hmm/bad, editable by hand too (e.g. backfilling an old spot). */}
        <div>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.75, marginBottom: '0.4rem' }}>
            First visited
          </div>
          {editingVisited ? (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <input type="date" autoFocus value={visitedDraft} onChange={e => setVisitedDraft(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
              <button onClick={saveVisited} className="btn btn-secondary press" style={{ fontSize: '0.68rem' }}>Save</button>
              <button onClick={() => setEditingVisited(false)} className="btn btn-ghost press" style={{ fontSize: '0.68rem' }}>Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => { setEditingVisited(true); setVisitedDraft(place!.first_visited_on ?? '') }}
              className="press"
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
                fontSize: '0.78rem', color: place.first_visited_on ? 'var(--text)' : 'var(--muted)',
                opacity: place.first_visited_on ? 0.9 : 0.6, fontFamily: 'var(--font-body)', lineHeight: 1.6,
              }}
            >
              {place.first_visited_on ?? 'set a date'}
            </button>
          )}
        </div>

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
