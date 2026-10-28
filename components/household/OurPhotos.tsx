'use client'

import { withUndo } from '@/lib/ui/undo'
import { useEffect, useState } from 'react'
import { useHouseholdPhotos, type AlbumItem } from '@/lib/hooks/useHouseholdPhotos'
import { useGoogleStatus } from '@/lib/hooks/useGoogle'
import GooglePhotosButton from '@/components/ui/GooglePhotosButton'

// Our photos (2026-10-24): the household album, filled three ways.
//  1. On its own: every photo in the shared Google account's Drive folder
//     "4S Photos" shows here, nothing to pick. (Google no longer lets apps
//     read a Google Photos library by themselves; Drive they can.)
//  2. On its own: weekly check-in photos, once that week is open to you both.
//  3. By choice: a photo from this phone, or one of your own from Google
//     Photos. A personal photo is only ever here because someone added it.
// The eye decides what guests can see; in guest mode only those show.

const BADGE: Record<AlbumItem['source'], string | null> = { album: null, drive: 'Drive', checkin: 'Check-in' }

export default function OurPhotos({ spaceId, guestMode = false }: { spaceId: string | null; guestMode?: boolean }) {
  const { items, driveFolder, loading, add, setGuests, remove, shareWithGuests, reload } = useHouseholdPhotos(spaceId, guestMode)
  const { status } = useGoogleStatus()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [big, setBig] = useState<AlbumItem | null>(null)
  const [moving, setMoving] = useState(false)

  // The old form's check-in photos still sitting in Drive (2026-10-27) are
  // copied into 4S the first time this opens, then show as check-in photos.
  useEffect(() => {
    if (guestMode || !spaceId) return
    let alive = true
    // Usually there is nothing to move; the note only shows if it takes a while.
    const t = setTimeout(() => { if (alive) setMoving(true) }, 1200)
    fetch('/api/checkin-photo', { method: 'POST' })
      .then(r => r.ok ? r.json() as Promise<{ moved: number; failed: number }> : { moved: 0, failed: 0 })
      .then(j => {
        if (!alive) return
        if (j.moved > 0) void reload()
        if (j.failed > 0) setErr(`${j.failed} old check-in ${j.failed === 1 ? 'photo' : 'photos'} could not be opened in Drive. Make sure Google is connected in Connect.`)
      })
      .catch(() => {})
      .finally(() => { clearTimeout(t); if (alive) setMoving(false) })
    return () => { alive = false; clearTimeout(t) }
  }, [guestMode, spaceId, reload])

  async function addFiles(files: Blob[]) {
    if (files.length === 0) return
    setBusy(true); setErr(null)
    setErr(await add(files))
    setBusy(false)
  }

  async function toggleGuests(item: AlbumItem) {
    if (item.photo) { await setGuests(item.photo.id, !item.show_guests); return }
    // A Drive or check-in photo: guests get a copy saved into the album.
    setBusy(true); setErr(await shareWithGuests(item)); setBusy(false)
  }

  if (guestMode && items.length === 0) return null

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
        <div className="t-card">Our photos</div>
        {!guestMode && <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>👁 = guests can see it</div>}
      </div>

      {!guestMode && status.household?.connected && driveFolder === false && (
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '0.7rem', padding: '0.6rem 0.8rem', borderRadius: 10, background: 'var(--surface2)' }}>
          Make a folder called <strong>4S Photos</strong> in the shared account&rsquo;s Google Drive. Every photo you put in it shows here on its own.
        </div>
      )}

      {!guestMode && spaceId && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
          <label className="btn btn-secondary press" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
            {busy ? 'Adding…' : 'Add from this phone'}
            <input type="file" accept="image/*" multiple disabled={busy} onChange={e => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
          </label>
          <GooglePhotosButton max={20} account="mine" label="Add one of mine" onPick={addFiles} />
        </div>
      )}
      {moving && <div style={{ fontSize: '0.76rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Bringing in your old check-in photos…</div>}
      {err && <div style={{ fontSize: '0.8rem', color: 'var(--rose)', marginBottom: '0.5rem' }}>{err}</div>}

      {!loading && items.length === 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>No photos yet.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(7.5rem, 30%), 1fr))', gap: '0.45rem' }}>
        {items.map(it => (
          <div key={it.key} style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 10, overflow: 'hidden', background: 'var(--surface2)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.url} alt={it.label ?? ''} loading="lazy" onClick={() => setBig(it)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} />
            {!guestMode && (
              <button onClick={() => toggleGuests(it)} disabled={busy}
                aria-label={it.show_guests ? 'Guests can see this. Tap to hide it from guests.' : 'Hidden from guests. Tap to show guests.'}
                className="press" style={{
                  position: 'absolute', top: 5, left: 5, width: 32, height: 32, borderRadius: 16, border: 'none', cursor: 'pointer',
                  background: it.show_guests ? 'var(--gold)' : 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '0.85rem',
                }}>{it.show_guests ? '👁' : '◌'}</button>
            )}
            {!guestMode && BADGE[it.source] && (
              <span style={{ position: 'absolute', bottom: 5, left: 5, fontSize: '0.66rem', padding: '0.1rem 0.4rem', borderRadius: 6, background: 'rgba(0,0,0,0.5)', color: '#fff' }}>{BADGE[it.source]}</span>
            )}
          </div>
        ))}
      </div>

      {big && (
        <div role="dialog" aria-modal="true" aria-label="Photo" onClick={() => setBig(null)} style={{
          position: 'fixed', inset: 0, zIndex: 980, background: 'rgba(10,8,6,0.85)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '0.8rem', padding: '1rem',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big.url} alt="" style={{ maxWidth: '100%', maxHeight: '78dvh', borderRadius: 12, objectFit: 'contain' }} />
          {big.label && <div style={{ color: '#f1e8d8', fontSize: '0.86rem' }}>{big.label}</div>}
          {!guestMode && (
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn-secondary press" onClick={() => { void toggleGuests(big); setBig(null) }}>
                {big.show_guests ? 'Hide from guests' : 'Let guests see it'}
              </button>
              {big.photo && (
                <button className="btn btn-ghost press" style={{ color: '#f3c1b8' }} onClick={() => { const p = big.photo!; setBig(null); withUndo('Removing the photo', () => remove(p)) }}>Remove</button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
