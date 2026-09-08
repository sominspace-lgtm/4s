'use client'

import { useEffect, useState } from 'react'
import { getPlacePhotoUrls } from '@/lib/storage/placePhotos'
import type { Place } from '@/lib/hooks/usePlaces'

// First-photo thumbnails for a set of pins (2026-09-09). One batched
// getPlacePhotoUrls call (private bucket, 1-hour signed URLs) keyed off
// each place's photo_paths[0]. Refetches only when that set of first
// paths actually changes, not on every list re-sort.
export function usePlacePhotos(places: Place[]): Record<string, string> {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})

  const firstPaths = places
    .map(p => (p.photo_paths[0] ? `${p.id}|${p.photo_paths[0]}` : null))
    .filter(Boolean)
    .sort()
    .join(',')

  useEffect(() => {
    const pairs = firstPaths ? firstPaths.split(',').map(s => s.split('|') as [string, string]) : []
    if (pairs.length === 0) { setThumbs({}); return }
    let alive = true
    getPlacePhotoUrls(pairs.map(([, path]) => path)).then(byPath => {
      if (!alive) return
      const byId: Record<string, string> = {}
      for (const [id, path] of pairs) {
        if (byPath[path]) byId[id] = byPath[path]
      }
      setThumbs(byId)
    })
    return () => { alive = false }
  }, [firstPaths])

  return thumbs
}
