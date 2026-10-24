'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Our photos (2026-10-24): the household album. Rows in household_photos,
// files in the private household-photos bucket, shown through short-lived
// signed links. guestOnly limits it to photos marked "guests can see".

export interface HouseholdPhoto { id: string; space_id: string; added_by: string | null; path: string; caption: string | null; show_guests: boolean; created_at: string; url?: string }

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

  return { photos, loading, add, setGuests, remove }
}
