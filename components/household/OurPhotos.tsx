'use client'

import { useState } from 'react'
import { useHouseholdPhotos, type HouseholdPhoto } from '@/lib/hooks/useHouseholdPhotos'
import GooglePhotosButton from '@/components/ui/GooglePhotosButton'

// Our photos (2026-10-24): the household album. Its photos come from the
// shared Google account. A personal photo is only ever here because someone
// chose to add it (from their phone, or one of theirs from Google Photos);
// nothing is pulled from a personal account on its own. The eye on each
// photo decides whether guests can see it; in guest mode only those show.

export default function OurPhotos({ spaceId, guestMode = false }: { spaceId: string | null; guestMode?: boolean }) {
  const { photos, loading, add, setGuests, remove } = useHouseholdPhotos(spaceId, guestMode)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [big, setBig] = useState<HouseholdPhoto | null>(null)

  async function addFiles(files: Blob[]) {
    if (files.length === 0) return
    setBusy(true); setErr(null)
    setErr(await add(files))
    setBusy(false)
  }

  if (guestMode && photos.length === 0) return null

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
        <div className="t-card">Our photos</div>
        {!guestMode && <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>👁 = guests can see it</div>}
      </div>

      {!guestMode && spaceId && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
          <GooglePhotosButton max={20} account="shared" label="From shared Google Photos" onPick={addFiles} />
          <label className="btn btn-ghost press" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
            {busy ? 'Adding…' : 'Add from this phone'}
            <input type="file" accept="image/*" multiple disabled={busy} onChange={e => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
          </label>
          <GooglePhotosButton max={20} account="mine" label="Add one of mine" onPick={addFiles} />
        </div>
      )}
      {err && <div style={{ fontSize: '0.8rem', color: 'var(--rose)', marginBottom: '0.5rem' }}>{err}</div>}

      {!loading && photos.length === 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>No photos yet. Add a few you both love.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(7.5rem, 30%), 1fr))', gap: '0.45rem' }}>
        {photos.map(p => (
          <div key={p.id} style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 10, overflow: 'hidden', background: 'var(--surface2)' }}>
            {p.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.url} alt={p.caption ?? ''} loading="lazy" onClick={() => setBig(p)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} />
            )}
            {!guestMode && (
              <button onClick={() => setGuests(p.id, !p.show_guests)} aria-label={p.show_guests ? 'Guests can see this. Tap to hide it from guests.' : 'Hidden from guests. Tap to show guests.'}
                className="press" style={{
                  position: 'absolute', top: 5, left: 5, width: 32, height: 32, borderRadius: 16, border: 'none', cursor: 'pointer',
                  background: p.show_guests ? 'var(--gold)' : 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '0.85rem', opacity: p.show_guests ? 1 : 0.8,
                }}>{p.show_guests ? '👁' : '◌'}</button>
            )}
          </div>
        ))}
      </div>

      {big && (
        <div role="dialog" aria-modal="true" aria-label="Photo" onClick={() => setBig(null)} style={{
          position: 'fixed', inset: 0, zIndex: 980, background: 'rgba(10,8,6,0.85)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '0.8rem', padding: '1rem',
        }}>
          {big.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={big.url} alt="" style={{ maxWidth: '100%', maxHeight: '78dvh', borderRadius: 12, objectFit: 'contain' }} />
          )}
          {!guestMode && (
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn-secondary press" onClick={() => { void setGuests(big.id, !big.show_guests); setBig({ ...big, show_guests: !big.show_guests }) }}>
                {big.show_guests ? 'Hide from guests' : 'Let guests see it'}
              </button>
              <button className="btn btn-ghost press" style={{ color: '#f3c1b8' }} onClick={() => { if (window.confirm('Remove this photo from the album?')) { void remove(big); setBig(null) } }}>Remove</button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
