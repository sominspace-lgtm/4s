'use client'

import { useEffect, useState } from 'react'

// The one guest-facing board during a live gathering — a frosted-glass
// panel floating in the sky over the village (2026-09-03). Everything a
// guest glances up for: the join QR, what's playing, the next thing on
// the plan, the wifi. Replaces the scattered easel-QR + top marquee.

export interface SkyBoxProps {
  qrDataUri: string | null
  guestUrl: string | null
  title?: string | null
  musicUrl?: string | null
  topVotedSong?: string | null
  nextAgenda?: { time: string; label: string } | null
  pinnedMessage?: { name: string | null; body: string } | null
  wifi?: { name?: string; password?: string }
}

export default function GatheringSkyBox({
  qrDataUri, guestUrl, title, musicUrl, topVotedSong, nextAgenda, pinnedMessage, wifi,
}: SkyBoxProps) {
  // Rotate the secondary line so one panel carries several things without
  // getting tall. Pinned message wins when there is one.
  const rotating: string[] = []
  if (nextAgenda) rotating.push(nextAgenda.time ? `Next · ${nextAgenda.time} · ${nextAgenda.label}` : `Next · ${nextAgenda.label}`)
  if (topVotedSong) rotating.push(`Up next · ${topVotedSong}`)
  const wifiStr = wifi && (wifi.name || wifi.password)
    ? `Wifi · ${wifi.name ?? ''}${wifi.password ? ` · ${wifi.password}` : ''}`
    : null
  if (wifiStr) rotating.push(wifiStr)
  if (!rotating.length && musicUrl) rotating.push('Playlist is on')

  const [i, setI] = useState(0)
  useEffect(() => {
    setI(0)
    if (rotating.length < 2) return
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const t = setInterval(() => setI(n => (n + 1) % rotating.length), 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotating.length, rotating.join('|')])

  const nowPlaying = topVotedSong ?? (musicUrl ? 'the playlist' : null)
  const secondary = pinnedMessage
    ? (pinnedMessage.name ? `“${pinnedMessage.body}” — ${pinnedMessage.name}` : `“${pinnedMessage.body}”`)
    : (rotating[Math.min(i, rotating.length - 1)] ?? null)

  return (
    <div
      style={{
        position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)', zIndex: 4,
        display: 'flex', gap: '0.85rem', alignItems: 'center',
        padding: '0.7rem 0.9rem', maxWidth: 'min(92%, 26rem)',
        borderRadius: 18,
        background: 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.22)',
        backdropFilter: 'blur(14px) saturate(1.2)', WebkitBackdropFilter: 'blur(14px) saturate(1.2)',
        boxShadow: '0 16px 44px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.25)',
        fontFamily: 'var(--font-body)', color: '#fff',
        textShadow: '0 1px 6px rgba(0,0,0,0.4)',
      }}
    >
      {qrDataUri && (
        <div style={{ flexShrink: 0, background: '#fff', borderRadius: 8, padding: 5, lineHeight: 0 }}>
          <img src={qrDataUri} alt="Scan to join" style={{ width: 76, height: 76, display: 'block' }} />
        </div>
      )}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontSize: 'clamp(0.9rem, 2.4vw, 1.15rem)', fontWeight: 500, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title?.trim() || 'The doors are open'}
        </div>
        {nowPlaying && (
          <div style={{ fontSize: 'clamp(0.72rem, 1.9vw, 0.86rem)', opacity: 0.92, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ♪ Now playing · {nowPlaying}
          </div>
        )}
        {secondary && (
          <div style={{ fontSize: 'clamp(0.68rem, 1.8vw, 0.8rem)', opacity: 0.82, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {secondary}
          </div>
        )}
        {guestUrl && !qrDataUri && (
          <div style={{ fontSize: '0.66rem', opacity: 0.7 }}>{guestUrl.replace(/^https?:\/\//, '')}</div>
        )}
      </div>
    </div>
  )
}
