'use client'

import { useMemo } from 'react'
import { mediaEmbed } from '@/lib/utils/mediaEmbed'
import type { GuestContribution } from '@/lib/hooks/useGathering'

// The wall's party screen during a live gathering — the room's shared
// display. Now-playing, the up-next queue (guest song picks by votes), and
// a QR to add a song or a photo. Full-card overlay, any tap on the backdrop
// closes it. Read-only: voting happens on the guests' phones.

export default function VillagePartyScreen({
  title, musicUrl, contributions, guestUrl, qrDataUri, onClose,
}: {
  title: string
  musicUrl: string | null
  contributions: GuestContribution[]
  guestUrl: string | null
  qrDataUri: string | null
  onClose: () => void
}) {
  const embed = mediaEmbed(musicUrl)

  const songs = useMemo(() =>
    contributions
      .filter(c => c.kind === 'song' && c.status === 'visible')
      .map(c => ({ id: c.id, title: (c.meta.title as string) || c.body || 'a song', by: c.guest_name, votes: c.upvotes ?? 0 }))
      .sort((a, b) => b.votes - a.votes),
  [contributions])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 15, cursor: 'pointer',
        background: 'color-mix(in srgb, var(--bg) 95%, transparent)', backdropFilter: 'blur(4px)',
        display: 'flex', flexDirection: 'column', padding: '1.4rem', gap: '1rem', overflowY: 'auto',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ cursor: 'default', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '38rem', width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display, var(--font-body))', color: 'var(--text)' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem' }}>✕</button>
        </div>

        {embed ? (
          <iframe
            title="Now playing"
            src={embed.src}
            style={{ width: '100%', height: embed.height, border: 'none', borderRadius: 14 }}
            loading="lazy"
            allow="encrypted-media; clipboard-write; picture-in-picture"
          />
        ) : musicUrl ? (
          <a href={musicUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>Open the playlist →</a>
        ) : (
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)', fontStyle: 'italic' }}>
            No playlist yet — set one from the manage panel.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '1.2rem', alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: '0.66rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Up next — voted by the room
            </div>
            {songs.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', fontStyle: 'italic' }}>Nothing requested yet.</div>
            ) : (
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {songs.map((s, i) => (
                  <li key={s.id} style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--gold)', fontVariantNumeric: 'tabular-nums', width: '1.4rem', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: '0.95rem', color: 'var(--text)' }}>
                      {s.title}
                      {s.by && <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}> · {s.by}</span>}
                    </span>
                    {s.votes > 0 && <span style={{ fontSize: '0.78rem', color: 'var(--muted)', flexShrink: 0 }}>♥ {s.votes}</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {qrDataUri && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
              <img src={qrDataUri} alt="Scan to join" style={{ width: 132, height: 132, borderRadius: 10, background: '#fff', padding: 6 }} />
              <span style={{ fontSize: '0.66rem', color: 'var(--muted)', textAlign: 'center', maxWidth: 132 }}>
                Scan to add a song or a photo
              </span>
              {guestUrl && <span style={{ fontSize: '0.58rem', color: 'var(--muted)', opacity: 0.6 }}>{guestUrl.replace(/^https?:\/\//, '')}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
