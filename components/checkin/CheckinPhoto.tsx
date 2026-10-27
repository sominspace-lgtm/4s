'use client'

import { useEffect, useState } from 'react'
import { getCheckinPhotoUrls } from '@/lib/storage/checkinPhotos'

/** The file id in a Drive link ("open?id=…" or "/file/d/…/"). */
function driveId(url: string): string | null {
  const m = url.match(/[?&]id=([A-Za-z0-9_-]{10,})/) ?? url.match(/\/d\/([A-Za-z0-9_-]{10,})/)
  return m ? m[1] : null
}

// The check-in photo (2026-09-08) — the bucket is private, so this fetches
// a short-lived signed URL on mount. The old Google Form's photos live in
// Drive (2026-10-27); /api/checkin-photo streams those instead.
export default function CheckinPhoto({ path, driveUrl = null }: { path: string | null; driveUrl?: string | null }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!path) return
    let alive = true
    getCheckinPhotoUrls([path]).then(map => { if (alive) setUrl(map[path] ?? null) })
    return () => { alive = false }
  }, [path])

  const id = !path && driveUrl ? driveId(driveUrl) : null
  const src = path ? url : id ? `/api/checkin-photo?id=${id}` : null
  if (!src || failed) return null
  return (
    <img src={src} alt="This week" loading="lazy" onError={() => setFailed(true)} style={{
      width: '100%', borderRadius: 8, marginTop: '0.5rem', display: 'block',
      maxHeight: '12rem', objectFit: 'cover',
    }} />
  )
}
