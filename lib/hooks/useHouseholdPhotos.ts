'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Our photos (2026-10-24): the household album. Rows in household_photos,
// files in the private household-photos bucket, shown through short-lived
// signed links. guestOnly limits it to photos marked "guests can see".

export interface HouseholdPhoto { id: string; space_id: string; added_by: string | null; path: string; caption: string | null; show_guests: boolean; created_at: string; url?: string }

/**
 * One photo in the album, whatever it came from (2026-10-24):
 *  'album'   saved to the album (uploaded, or picked from someone's Google Photos)
 *  'drive'   in the shared account's "4S Photos" Drive folder, shown automatically
 *  'checkin' a weekly check-in photo, shown once that week is open to both of you
 * Only 'album' photos can be shown to guests; making a Drive or check-in photo
 * guest-visible saves a copy into the album first.
 */
export interface AlbumItem { key: string; source: 'album' | 'drive' | 'checkin'; url: string; label?: string; at: string; show_guests: boolean; photo?: HouseholdPhoto }

const BUCKET = 'household-photos'

async function shrink(file: Blob): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 2048 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    return await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('no image'))), 'image/jpeg', 0.85))
  } catch { return file }
}

export function useHouseholdPhotos(spaceId: string | null, guestOnly = false) {
  const [photos, setPhotos] = useState<HouseholdPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [extras, setExtras] = useState<AlbumItem[]>([])
  const [driveFolder, setDriveFolder] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    if (!spaceId) { setPhotos([]); setLoading(false); return }
    const supabase = createClient()
    let q = supabase.from('household_photos').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }).limit(200)
    if (guestOnly) q = q.eq('show_guests', true)
    const { data } = await q
    const rows = (data as HouseholdPhoto[] | null) ?? []
    if (rows.length) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(rows.map(r => r.path), 60 * 60)
      const byPath = new Map((signed ?? []).map(s => [s.path, s.signedUrl]))
      rows.forEach(r => { r.url = byPath.get(r.path) ?? undefined })
    }
    setPhotos(rows)
    setLoading(false)

    // Guests only ever see album photos marked for them.
    if (guestOnly) { setExtras([]); return }
    const more: AlbumItem[] = []
    // Check-in photos: the database only returns the ones open to this person.
    const { data: ck } = await supabase.from('checkins').select('id, week_of, photo_path, user_id').eq('space_id', spaceId).not('photo_path', 'is', null).order('week_of', { ascending: false }).limit(60)
    const ckRows = (ck as { id: string; week_of: string; photo_path: string }[] | null) ?? []
    if (ckRows.length) {
      const { data: signed } = await supabase.storage.from('checkin-photos').createSignedUrls(ckRows.map(r => r.photo_path), 60 * 60)
      const byPath = new Map((signed ?? []).filter(x => x.signedUrl).map(x => [x.path, x.signedUrl]))
      for (const r of ckRows) {
        const u = byPath.get(r.photo_path)
        if (u) more.push({ key: `ck-${r.id}`, source: 'checkin', url: u, label: `Check-in, week of ${r.week_of.slice(5, 10).replace('-', '/')}`, at: r.week_of, show_guests: false })
      }
    }
    // The shared account's "4S Photos" folder in Drive.
    try {
      const res = await fetch('/api/google/drive/photos?account=shared')
      const j = await res.json() as { folder?: boolean; photos?: { id: string; name: string; created: string | null }[] }
      setDriveFolder(!!j.folder)
      for (const p of j.photos ?? []) more.push({ key: `dr-${p.id}`, source: 'drive', url: `/api/google/drive/photos?account=shared&id=${p.id}`, label: p.name, at: p.created ?? '', show_guests: false })
    } catch { setDriveFolder(null) }
    setExtras(more)
  }, [spaceId, guestOnly])

  useEffect(() => {
    void load()
    const on = () => { void load() }
    window.addEventListener('4s:photos-changed', on)
    return () => window.removeEventListener('4s:photos-changed', on)
  }, [load])

  const notify = () => window.dispatchEvent(new CustomEvent('4s:photos-changed'))

  async function add(files: Blob[]): Promise<string | null> {
    if (!spaceId) return 'No household yet.'
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Sign in first.'
    for (const f of files.slice(0, 20)) {
      const blob = await shrink(f)
      const path = `${spaceId}/${crypto.randomUUID()}.jpg`
      const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      if (up.error) return 'A photo did not upload.'
      const { error } = await supabase.from('household_photos').insert({ space_id: spaceId, added_by: user.id, path })
      if (error) { await supabase.storage.from(BUCKET).remove([path]); return 'A photo did not save.' }
    }
    notify(); return null
  }

  async function setGuests(id: string, on: boolean) {
    setPhotos(p => p.map(x => (x.id === id ? { ...x, show_guests: on } : x)))
    await createClient().from('household_photos').update({ show_guests: on }).eq('id', id)
    notify()
  }

  async function remove(p: HouseholdPhoto) {
    setPhotos(list => list.filter(x => x.id !== p.id))
    const supabase = createClient()
    await supabase.from('household_photos').delete().eq('id', p.id)
    await supabase.storage.from(BUCKET).remove([p.path])
    notify()
  }

  /** A Drive or check-in photo made visible to guests: copy it into the album, marked for guests. */
  async function shareWithGuests(item: AlbumItem): Promise<string | null> {
    try {
      const blob = await (await fetch(item.url)).blob()
      if (!spaceId) return 'No household yet.'
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 'Sign in first.'
      const path = `${spaceId}/${crypto.randomUUID()}.jpg`
      const up = await supabase.storage.from(BUCKET).upload(path, await shrink(blob), { contentType: 'image/jpeg', upsert: false })
      if (up.error) return 'Could not copy that photo.'
      const { error } = await supabase.from('household_photos').insert({ space_id: spaceId, added_by: user.id, path, caption: item.label ?? null, show_guests: true })
      if (error) return 'Could not save that photo.'
      notify(); return null
    } catch { return 'Could not copy that photo.' }
  }

  // Everything, newest first. A Drive or check-in photo already copied into
  // the album (same caption) is shown once, as the album copy.
  const captions = new Set(photos.map(p => p.caption).filter(Boolean))
  const items: AlbumItem[] = [
    ...photos.filter(p => p.url).map(p => ({ key: p.id, source: 'album' as const, url: p.url!, label: p.caption ?? undefined, at: p.created_at, show_guests: p.show_guests, photo: p })),
    ...extras.filter(x => !x.label || !captions.has(x.label)),
  ].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))

  return { photos, items, driveFolder, loading, add, setGuests, remove, shareWithGuests }
}
