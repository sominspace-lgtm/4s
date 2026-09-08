'use client'

import { useEffect, useState } from 'react'
import PlacesSheet from '@/components/places/PlacesSheet'
import { kindSpec, KIND_ORDER } from '@/lib/constants/placeKinds'
import { usePlaces } from '@/lib/hooks/usePlaces'
import { haversineKm } from '@/lib/utils/geo'
import { HOME_COORD, NEARBY_KM } from '@/lib/constants/home'
import Icon from '@/components/ui/Icon'

// Manual entry only (Phase 2). Places must be fully usable with zero external
// services — this is that path, not a fallback for when Phase 3's place
// lookup is unavailable. Phase 3 adds a search box above this same form that
// fills these fields in; it does not replace them.
export default function AddPlacePanel({ open, spaceId, hasSpace, onClose, initialKind }: {
  open: boolean
  spaceId: string | null
  hasSpace: boolean
  onClose: () => void
  /** Pre-selects a kind chip — used by the empty-state starter cards. */
  initialKind?: string
}) {
  const { addPlace } = usePlaces()
  const [name, setName] = useState('')
  const [kinds, setKinds] = useState<string[]>([initialKind ?? 'place'])
  // Re-seed the kind when the panel opens from a different starter card.
  useEffect(() => { if (open) setKinds([initialKind ?? 'place']) }, [open, initialKind])
  const [note, setNote] = useState('')
  const [address, setAddress] = useState('')
  // Filled in silently by the address lookup below — never shown as its own
  // field, just carried through to addPlace() so the pin lands with real
  // coordinates instead of the "no location yet" fallback.
  const [geo, setGeo] = useState<{ lat: number; lng: number; city: string | null; country: string | null } | null>(null)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'looking' | 'found' | 'not-found'>('idle')
  // Shared by default (2026-09-09) — a saved place is household business the
  // same way a chore or a shopping item is, so the pin lands on the shared
  // map unless you tick "keep this private". On a solo account
  // usePlaces.addPlace resolves shared with no real space to space_id null
  // regardless, so it stays personal until a partner joins.
  const [isPrivate, setIsPrivate] = useState(false)
  const [saving, setSaving] = useState(false)

  function reset() {
    setName(''); setKinds([initialKind ?? 'place']); setNote(''); setAddress(''); setIsPrivate(false)
    setGeo(null); setGeoStatus('idle')
  }

  function toggleKind(k: string) {
    setKinds(prev => prev.includes(k) ? (prev.length > 1 ? prev.filter(x => x !== k) : prev) : [...prev, k])
  }

  // Fires on blur, which covers paste (2026-08-25 fix) — this address field
  // never called a geocode endpoint at all before, on paste or otherwise;
  // that was the actual bug, not a paste-specific quirk. See
  // lib/places/geocode.ts's own header comment.
  async function lookupAddress() {
    const q = address.trim()
    if (q.length < 5) { setGeo(null); setGeoStatus('idle'); return }
    setGeoStatus('looking')
    try {
      const res = await fetch(`/api/places/geocode?q=${encodeURIComponent(q)}`)
      const body = await res.json().catch(() => ({ found: false }))
      if (body.found) {
        setGeo({ lat: body.lat, lng: body.lng, city: body.city, country: body.country })
        // Replace whatever was typed with the clean street-only address the
        // lookup returned (2026-08-25 fix) — someone had typed the full
        // "1292 Briar Crest Dr, San Jose, CA" into this one field, which
        // then got saved verbatim as `address` right alongside a separately
        // saved `city`, so anywhere the two get joined for display
        // ("address, city, country") showed San Jose twice. A clean street
        // portion here means nothing downstream ever duplicates it again.
        if (body.address) setAddress(body.address)
        setGeoStatus('found')
      } else {
        setGeo(null); setGeoStatus('not-found')
      }
    } catch {
      setGeo(null); setGeoStatus('not-found')
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    // Auto-tag anything within ~5 miles of home as "nearby" so it lands in
    // the Near us filter without a manual tag.
    const near = geo && haversineKm({ lat: geo.lat, lng: geo.lng }, HOME_COORD) <= NEARBY_KM
    const { error } = await addPlace({
      name: name.trim(),
      kind: kinds[0],
      kinds,
      note: note.trim() || null,
      address: address.trim() || null,
      city: geo?.city ?? null,
      country: geo?.country ?? null,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      tags: near ? ['nearby'] : [],
      shared: !isPrivate,
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

        {/* Multi-select (2026-08-25) — was a single <select>, one kind per
            pin. Chip toggle, same idiom PinFilters already uses for tags;
            the first one picked stays the "primary" kind (map icon/color,
            everything else that only ever reads one). */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {KIND_ORDER.map(k => {
            const active = kinds.includes(k)
            const spec = kindSpec(k)
            return (
              <button key={k} type="button" onClick={() => toggleKind(k)} className="btn press" style={{
                fontSize: '0.7rem', padding: '0.35rem 0.65rem',
                background: active ? 'color-mix(in srgb, var(--gold) 14%, transparent)' : 'transparent',
                color: active ? 'var(--gold)' : 'var(--muted)', border: '1px solid var(--border)',
              }}>
                <span aria-hidden style={{ marginRight: '0.3rem' }}>{spec.icon}</span>{spec.label}
              </button>
            )
          })}
        </div>

        <div>
          <input
            value={address}
            onChange={e => { setAddress(e.target.value); setGeoStatus('idle'); setGeo(null) }}
            onBlur={lookupAddress}
            placeholder="Address or area (optional)"
            style={inputStyle}
          />
          {geoStatus === 'looking' && (
            <div style={{ fontSize: '0.64rem', color: 'var(--muted)', opacity: 0.7, marginTop: '0.3rem' }}>Looking that up…</div>
          )}
          {geoStatus === 'found' && geo && (
            <div style={{ fontSize: '0.64rem', color: 'var(--emerald)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3em' }}>
              <Icon name="pin" size={10} /> Found it{geo.city ? `: ${[geo.city, geo.country].filter(Boolean).join(', ')}` : ''}
            </div>
          )}
          {geoStatus === 'not-found' && (
            <div style={{ fontSize: '0.64rem', color: 'var(--muted)', opacity: 0.7, marginTop: '0.3rem' }}>
              Couldn&rsquo;t place that automatically — it&rsquo;ll save fine, just without map coordinates yet.
            </div>
          )}
        </div>

        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note: why you're saving it (optional)" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />

        {hasSpace && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
            Keep this private
          </label>
        )}
        {hasSpace && !isPrivate && (
          <div style={{ fontSize: '0.66rem', color: 'var(--muted)', opacity: 0.7 }}>
            Goes on your shared map, so you both see it.
          </div>
        )}

        {geoStatus !== 'found' && (
          <div style={{ fontSize: '0.66rem', color: 'var(--muted)', opacity: 0.7, lineHeight: 1.5 }}>
            No coordinates yet, that&rsquo;s fine. This pin will show in the list under &ldquo;no location&rdquo; until you add an address it can look up.
          </div>
        )}

        <button type="submit" disabled={!name.trim() || saving} className="btn btn-primary press" style={{ fontSize: '0.74rem', alignSelf: 'flex-start' }}>
          {saving ? 'Saving…' : 'Save pin'}
        </button>
      </form>
    </PlacesSheet>
  )
}
