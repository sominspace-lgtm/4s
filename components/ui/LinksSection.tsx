'use client'

import { useState } from 'react'
import type { SavedLink } from '@/lib/types/savedLink'
import IconButton from '@/components/ui/IconButton'

function hostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

// Paste a link from anywhere — Instagram, TikTok, a blog, a hotel's own site
// — and keep it attached to the pin or trip it's about (2026-09-24). Shared
// by PlaceSheet and TripDetail rather than built twice; both just hand it
// their own addLink/removeLink from usePlaces.ts/useTrips.ts.
//
// A title comes from app/api/link-preview reading the page's own og:title —
// the same mechanism iMessage/Discord/Slack use to show a preview when you
// paste a link there, not an AI call. Saving never depends on that
// succeeding: a failed or slow lookup still saves the bare URL, titled by
// its hostname instead of left blank.
export default function LinksSection({ links, onAdd, onRemove }: {
  links: SavedLink[]
  onAdd: (url: string, title: string | null, image: string | null) => Promise<void>
  onRemove: (linkId: string) => void
}) {
  const [pasting, setPasting] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    const url = pasting.trim()
    if (!/^https?:\/\//.test(url)) return
    setSaving(true)
    const preview = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.json()).catch(() => ({ title: null, image: null }))
    await onAdd(url, preview.title ?? null, preview.image ?? null)
    setSaving(false)
    setPasting('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', gap: '0.35rem' }}>
        <input
          value={pasting} onChange={e => setPasting(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save() }}
          placeholder="Paste a link — Instagram, TikTok, anything" style={{
            flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
            padding: '0.4rem 0.6rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.74rem', outline: 'none',
          }}
        />
        <button onClick={save} disabled={saving || !/^https?:\/\//.test(pasting.trim())} className="btn btn-ghost press" style={{ fontSize: '0.68rem' }}>
          {saving ? '…' : 'Save'}
        </button>
      </div>

      {links.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {links.map(link => (
            <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0' }}>
              {link.image && (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary external hosts, next/image can't optimize these
                <img src={link.image} alt="" onError={e => { e.currentTarget.style.display = 'none' }}
                  style={{ width: '2.2rem', height: '2.2rem', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
              )}
              <a href={link.url} target="_blank" rel="noopener noreferrer" style={{
                flex: 1, minWidth: 0, fontSize: '0.76rem', color: 'var(--text)', textDecoration: 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {link.title || hostname(link.url)}
              </a>
              <IconButton label={`Remove link ${link.title || hostname(link.url)}`} onClick={() => onRemove(link.id)} size={9} style={{ opacity: 0.35, flexShrink: 0 }}>✕</IconButton>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
