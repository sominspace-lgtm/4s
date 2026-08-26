'use client'

import { useEffect, useState } from 'react'
import PlacesSheet from '@/components/places/PlacesSheet'
import PlaceKindFields from '@/components/places/PlaceKindFields'
import ProvenanceBadge from '@/components/places/ProvenanceBadge'
import { kindSpec, KIND_ORDER } from '@/lib/constants/placeKinds'
import { usePlaces, type Place, type PlaceStatus } from '@/lib/hooks/usePlaces'
import { useDateIdeas } from '@/lib/hooks/useDateIdeas'
import { getPlacePhotoUrls } from '@/lib/storage/placePhotos'
import Icon, { type IconName } from '@/components/ui/Icon'

const STATUS_LABEL: Record<PlaceStatus, string> = {
  idea: 'Want to go', good: 'Good — go again', hmm: 'Hmm — no strong opinion', bad: 'Not again', archived: 'Archived',
}

const STATUS_ICON: Partial<Record<PlaceStatus, IconName>> = {
  good: 'thumbsUp', hmm: 'shrug', bad: 'thumbsDown',
}

// Type-adaptive place detail. Order, top to bottom: name, kind + city, one
// primary action, editable note, kind-specific fields, tags, destructive
// actions as a tertiary link at the bottom. No rating anywhere — see
// supabase/migrations/places_travel.sql for why. Google/lookup refresh isn't
// here yet; place lookup (Phase 3) adds that block.
export default function PlaceSheet({ place, open, onClose, spaceId, hasSpace }: {
  place: Place | null
  open: boolean
  onClose: () => void
  /** For the private/share toggle — the household space to share into, and
   *  whether one actually exists (a solo account has neither). */
  spaceId?: string | null
  hasSpace?: boolean
}) {
  const { updatePlace, removePlace, addPhoto, removePhoto } = usePlaces()
  // Date ideas share this pin rather than copying it — see the "Save as a
  // date idea" action below.
  const { ideas, addIdea } = useDateIdeas(spaceId ?? null)
  const [savingIdea, setSavingIdea] = useState(false)
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
  // Address lookup (2026-08-25) — see lookupAddress()/saveAddress() above.
  const [geoLatLng, setGeoLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'looking' | 'found' | 'not-found'>('idle')
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
  const linkedIdea = ideas.find(i => i.place_id === place.id) ?? null
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
      ...(geoLatLng ? { lat: geoLatLng.lat, lng: geoLatLng.lng } : {}),
    })
    setEditingAddress(false)
    setGeoLatLng(null); setGeoStatus('idle')
  }

  // Same fix as AddPlacePanel's — this edit flow never called a geocode
  // endpoint either (2026-08-25). City/country fill the existing draft
  // fields so they're visibly editable before saving; lat/lng ride along
  // silently via geoLatLng, same "not its own field" reasoning as there.
  async function lookupAddress() {
    const q = addressDraft.trim()
    if (q.length < 5) { setGeoLatLng(null); setGeoStatus('idle'); return }
    setGeoStatus('looking')
    try {
      const res = await fetch(`/api/places/geocode?q=${encodeURIComponent(q)}`)
      const body = await res.json().catch(() => ({ found: false }))
      if (body.found) {
        setGeoLatLng({ lat: body.lat, lng: body.lng })
        if (body.city && !cityDraft.trim()) setCityDraft(body.city)
        if (body.country && !countryDraft.trim()) setCountryDraft(body.country)
        // Same "city repeated" fix as AddPlacePanel's — replace the typed
        // text with the clean street-only address the lookup returned, so
        // saveAddress() never persists a full "...San Jose, CA" string
        // alongside a separately saved city that then shows twice wherever
        // address+city get joined for display.
        if (body.address) setAddressDraft(body.address)
        setGeoStatus('found')
      } else {
        setGeoLatLng(null); setGeoStatus('not-found')
      }
    } catch {
      setGeoLatLng(null); setGeoStatus('not-found')
    }
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
                display: 'inline-flex', alignItems: 'center', gap: '0.3em',
              }}
            >
              {STATUS_ICON[s] && <Icon name={STATUS_ICON[s]!} size={11} />}
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {/* Auto-shared by default at creation (2026-08-21) — this is the
            post-creation opt-out/opt-back-in, added because AddPlacePanel's
            toggle only ever applied once, at save time. */}
        {hasSpace && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--muted)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={place.space_id === null}
              onChange={e => updatePlace(place!.id, { space_id: e.target.checked ? null : spaceId ?? null })}
            />
            Keep this private
          </label>
        )}

        {/* Save this pin as a date idea (2026-08-24) — creates a date_ideas
            row LINKED to this place rather than re-typing its name into a
            second list, which is the whole point: one place, one row, two
            views of it. Already-linked shows as a statement, not a button,
            so there's no way to create a duplicate from here. */}
        {linkedIdea ? (
          <div style={{ fontSize: '0.7rem', color: 'var(--blush)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span aria-hidden>♡</span> Saved as a date idea
            {linkedIdea.status !== 'idea' && <span style={{ color: 'var(--muted)', opacity: 0.8 }}>· {linkedIdea.status}</span>}
          </div>
        ) : (
          <button
            onClick={async () => {
              setSavingIdea(true)
              await addIdea(place!.name, { place_id: place!.id, notes: place!.note ?? null })
              setSavingIdea(false)
            }}
            disabled={savingIdea}
            className="btn btn-ghost press"
            style={{ fontSize: '0.72rem' }}
          >{savingIdea ? 'Saving…' : '♡ Save as a date idea'}</button>
        )}

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
              <input
                autoFocus value={addressDraft}
                onChange={e => { setAddressDraft(e.target.value); setGeoStatus('idle'); setGeoLatLng(null) }}
                onBlur={lookupAddress}
                placeholder="Street address" style={inputStyle}
              />
              {geoStatus === 'looking' && (
                <div style={{ fontSize: '0.64rem', color: 'var(--muted)', opacity: 0.7 }}>Looking that up…</div>
              )}
              {geoStatus === 'found' && (
                <div style={{ fontSize: '0.64rem', color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '0.3em' }}>
                  <Icon name="pin" size={10} /> Found it — filled in below
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input value={cityDraft} onChange={e => setCityDraft(e.target.value)} placeholder="City" style={inputStyle} />
                <input value={countryDraft} onChange={e => setCountryDraft(e.target.value)} placeholder="Country" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button onClick={saveAddress} className="btn btn-secondary press" style={{ fontSize: '0.68rem' }}>Save</button>
                <button onClick={() => { setEditingAddress(false); setGeoLatLng(null); setGeoStatus('idle') }} className="btn btn-ghost press" style={{ fontSize: '0.68rem' }}>Cancel</button>
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

        {/* Kind picker — reassigning a place's type is common early on.
            Multi-select now (2026-08-25): a pin can carry more than one
            category (a place that's both a gym and a cafe). `kinds` falls
            back to `[kind]` for any pin saved before the kinds column
            existed. The first one toggled on stays `kind` — still what the
            map pin icon/color and every other single-kind reader uses. */}
        {editingFields && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Kind</span>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {KIND_ORDER.map(k => {
                const current = place.kinds?.length ? place.kinds : [place.kind]
                const active = current.includes(k)
                const spec = kindSpec(k)
                return (
                  <button key={k} type="button" className="btn press" style={{
                    fontSize: '0.7rem', padding: '0.35rem 0.65rem',
                    background: active ? 'color-mix(in srgb, var(--gold) 14%, transparent)' : 'transparent',
                    color: active ? 'var(--gold)' : 'var(--muted)', border: '1px solid var(--border)',
                  }}
                    onClick={() => {
                      const next = active
                        ? (current.length > 1 ? current.filter(x => x !== k) : current)
                        : [...current, k]
                      updatePlace(place!.id, { kinds: next, kind: next[0] })
                    }}
                  >
                    <span aria-hidden style={{ marginRight: '0.3rem' }}>{spec.icon}</span>{spec.label}
                  </button>
                )
              })}
            </div>
          </div>
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
