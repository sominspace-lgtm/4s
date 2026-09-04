'use client'

import { useEffect, useState } from 'react'

// The what's-on strip across the top of the village wall during a live
// gathering (2026-09-03). One legible line at a time, cycling slowly:
// a pinned host message, then the next thing on the agenda, then what's
// playing / up next. Replaces AmbientInfo while the doors are open
// (Village.tsx gates that on !guestLive). Non-interactive.

export interface MarqueeProps {
  musicUrl?: string | null
  /** The next unfinished agenda beat, if any. */
  nextAgenda?: { time: string; label: string } | null
  /** The song at the top of the votes, if any. */
  topVotedSong?: string | null
  /** A guest message the hosts pinned, if any. */
  pinnedMessage?: { name: string | null; body: string } | null
}

export default function GatheringMarquee({ musicUrl, nextAgenda, topVotedSong, pinnedMessage }: MarqueeProps) {
  const lines: string[] = []
  if (pinnedMessage) {
    lines.push(pinnedMessage.name ? `“${pinnedMessage.body}” — ${pinnedMessage.name}` : `“${pinnedMessage.body}”`)
  }
  if (nextAgenda) {
    lines.push(nextAgenda.time ? `Next · ${nextAgenda.time} · ${nextAgenda.label}` : `Next · ${nextAgenda.label}`)
  }
  if (topVotedSong) lines.push(`Up next · ${topVotedSong}`)
  else if (musicUrl) lines.push('Playlist is on')

  const [i, setI] = useState(0)
  useEffect(() => {
    setI(0)
    if (lines.length < 2) return
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const t = setInterval(() => setI(n => (n + 1) % lines.length), 6000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length, lines.join('|')])

  if (!lines.length) return null
  const text = lines[Math.min(i, lines.length - 1)]

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', top: '4%', left: 0, right: 0, zIndex: 3,
        display: 'flex', justifyContent: 'center', pointerEvents: 'none', padding: '0 1rem',
      }}
    >
      <div style={{
        maxWidth: '90%',
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(0.9rem, 2.4vw, 1.4rem)',
        color: '#fff',
        textShadow: '0 1px 6px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.4)',
        textAlign: 'center', lineHeight: 1.3,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {text}
      </div>
    </div>
  )
}
