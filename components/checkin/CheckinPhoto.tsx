'use client'

import { useEffect, useState } from 'react'
import { getCheckinPhotoUrls } from '@/lib/storage/checkinPhotos'

// The check-in photo (2026-09-08) — the bucket is private, so this fetches
// a short-lived signed URL on mount.
export default function CheckinPhoto({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!path) return
    let alive = true
    getCheckinPhotoUrls([path]).then(map => { if (alive) setUrl(map[path] ?? null) })
    return () => { alive = false }
  }, [path])

  if (!path || !url) return null
  return (
    <img src={url} alt="This week" loading="lazy" style={{
      width: '100%', borderRadius: 8, marginTop: '0.5rem', display: 'block',
      maxHeight: '12rem', objectFit: 'cover',
    }} />
  )
}
