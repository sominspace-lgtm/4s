'use client'

import { useEffect, useState } from 'react'
import { useHouseholdPhotos } from '@/lib/hooks/useHouseholdPhotos'

// A small framed photo in the corner of the village (2026-10-24), from Our
// photos, changing every 30 seconds. With guests over, only the photos
// marked for guests show. Tap it to see it big.

export default function VillagePhotoFrame({ spaceId, guestOnly }: { spaceId: string | null; guestOnly: boolean }) {
  const { photos } = useHouseholdPhotos(spaceId, guestOnly)
  const [i, setI] = useState(0)
  const [big, setBig] = useState(false)

  useEffect(() => {
    if (photos.length < 2) return
    const t = setInterval(() => setI(n => (n + 1) % photos.length), 30_000)
    return () => clearInterval(t)
  }, [photos.length])

  const p = photos.length ? photos[i % photos.length] : null
  if (!p?.url) return null

  return (
    <>
      <button onClick={() => setBig(true)} aria-label="Our photos" className="press" style={{
        position: 'absolute', left: '2.5%', bottom: '5%', zIndex: 5, padding: 5, paddingBottom: 14,
        width: 'clamp(64px, 13%, 150px)', background: '#fbf6ec', border: '1px solid #e3d3b5', borderRadius: 3,
        boxShadow: '0 6px 16px -6px rgba(40,25,10,0.45)', transform: 'rotate(-3deg)', cursor: 'zoom-in',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={p.id} src={p.url} alt="" className="fade-in" style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
      </button>
      {big && (
        <div role="dialog" aria-modal="true" aria-label="Photo" onClick={() => setBig(false)} style={{
          position: 'fixed', inset: 0, zIndex: 4100, background: 'rgba(10,8,6,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt="" style={{ maxWidth: '100%', maxHeight: '90dvh', borderRadius: 12, objectFit: 'contain' }} />
        </div>
      )}
    </>
  )
}
