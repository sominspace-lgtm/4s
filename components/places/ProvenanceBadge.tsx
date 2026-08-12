'use client'

import type { PlaceProvenanceSource } from '@/lib/hooks/usePlaces'

// The ONLY place a provenance label gets rendered (2026-08-12).
//
// The badge is computed from the provenance map, not chosen by the caller —
// if a field renders without consulting `provenance`, it is claiming to be
// fact. Absent key = 'user' (silence is the signal for "you told me this").
// 'lookup' = a geocoder confirmed it. 'ai' = a model guessed it, and always
// renders muted with an "est." feel, never bold, never a headline number.
export default function ProvenanceBadge({ source, verifiedAt }: {
  source: PlaceProvenanceSource | undefined
  verifiedAt?: string | null
}) {
  if (!source || source === 'user') return null

  if (source === 'lookup') {
    return (
      <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.75 }}>
        checked{verifiedAt ? ` ${relativeTime(verifiedAt)}` : ''}
      </span>
    )
  }

  return (
    <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.75, fontStyle: 'italic' }}>
      est.
    </span>
  )
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}
