'use client'

import { useCallback, useEffect, useState } from 'react'
import type { NowPlaying, Choices } from '@/lib/spotify/server'

// Music on the wall screen (2026-11-18). What each linked person is playing
// on Spotify, with play, pause and skip, and a sheet to start a playlist on a
// speaker. Hidden when nobody in the household has linked Spotify.

const POLL_MS = 10_000

const SAMPLE: NowPlaying[] = [
  { userId: 'a', name: 'You', playing: { title: 'Sunday Kitchen', artist: 'The Slow Mornings', art: null, isPlaying: true, progressMs: 62_000, durationMs: 214_000, device: 'Living room' } },
  { userId: 'b', name: 'Partner', playing: null },
]
const SAMPLE_CHOICES: Choices = {
  playlists: [
    { uri: 'spotify:playlist:aaaaaaaaaaaaaaaaaaaaaa', name: 'Dinner jazz', art: null },
    { uri: 'spotify:playlist:bbbbbbbbbbbbbbbbbbbbbb', name: 'Cleaning day', art: null },
    { uri: 'spotify:playlist:cccccccccccccccccccccc', name: 'Rainy Sunday', art: null },
  ],
  devices: [
    { id: 'dev1aaaaaaaa', name: 'Living room', type: 'Speaker', active: true },
    { id: 'dev2bbbbbbbb', name: 'Kitchen Echo', type: 'Speaker', active: false },
  ],
}

/** `dock` places it fixed above the app's bottom bar (the iPad in shared mode) instead of inside the wall screen. */
export default function MusicBar({ preview, calm, onToast, dock }: { preview?: boolean; calm: boolean; onToast?: (m: string) => void; dock?: boolean }) {
  const [people, setPeople] = useState<NowPlaying[] | null>(preview ? SAMPLE : null)
  const [who, setWho] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)
  const [picks, setPicks] = useState<Choices | null>(null)
  const [speaker, setSpeaker] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const say = (m: string) => { if (onToast) onToast(m); else { setMsg(m); setTimeout(() => setMsg(null), 2600) } }

  const load = useCallback(async () => {
    if (preview) return
    const res = await fetch('/api/home/music', { cache: 'no-store' }).catch(() => null)
    if (res?.ok) setPeople((await res.json()).people ?? [])
  }, [preview])

  useEffect(() => {
    if (preview) return
    load()
    const id = setInterval(() => { if (document.visibilityState === 'visible') load() }, POLL_MS)
    return () => clearInterval(id)
  }, [load, preview])

  if (!people || people.length === 0) return null
  // Whose music: the one you picked, else whoever is playing, else the first.
  const current = people.find(p => p.userId === who) ?? people.find(p => p.playing?.isPlaying) ?? people.find(p => p.playing) ?? people[0]
  const np = current.playing

  async function send(body: Record<string, unknown>) {
    if (preview) return true
    const res = await fetch('/api/home/music', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: current.userId, ...body }),
    }).catch(() => null)
    if (!res?.ok) {
      const err = await res?.json().catch(() => null)
      say(err?.error ?? 'Spotify did not answer. Try again.')
      return false
    }
    setTimeout(load, 700)
    return true
  }

  async function toggle() {
    if (!np) { openSheet(); return }
    const next = !np.isPlaying
    setPeople(ps => ps && ps.map(p => p.userId === current.userId && p.playing ? { ...p, playing: { ...p.playing, isPlaying: next } } : p))
    await send({ action: next ? 'play' : 'pause' })
  }

  async function openSheet(userId: string = current.userId) {
    setSheet(true); setPicks(preview ? SAMPLE_CHOICES : null)
    if (preview) { setSpeaker(SAMPLE_CHOICES.devices.find(d => d.active)?.id ?? null); return }
    const res = await fetch(`/api/home/music/choices?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' }).catch(() => null)
    const c: Choices = res?.ok ? await res.json() : { playlists: [], devices: [] }
    setPicks(c)
    setSpeaker(c.devices.find(d => d.active)?.id ?? c.devices[0]?.id ?? null)
  }

  async function playList(uri: string) {
    if (await send({ action: 'playlist', uri, ...(speaker ? { deviceId: speaker } : {}) })) setSheet(false)
  }

  async function moveTo(id: string) {
    setSpeaker(id)
    if (np) await send({ action: 'transfer', deviceId: id })
  }

  // Over the Village it is clear glass, the same as the time and date chip
  // in the corner (AmbientInfo). The wall screen keeps its cream card.
  const glass: React.CSSProperties = dock
    ? { background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 12px 34px rgba(0,0,0,0.3)', textShadow: '0 1px 8px rgba(0,0,0,0.45)', backdropFilter: 'blur(10px) saturate(1.1)', WebkitBackdropFilter: 'blur(10px) saturate(1.1)' }
    : calm
      ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(240,228,210,0.75)', border: '1px solid rgba(255,255,255,0.08)' }
      : { background: 'rgba(255, 252, 245, 0.78)', color: '#3f362e', border: '1px solid rgba(230, 216, 189, 0.8)' }
  const round: React.CSSProperties = {
    width: 44, height: 44, borderRadius: 22, border: 'none', background: 'transparent', color: 'inherit',
    fontSize: '1.15rem', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0,
  }

  return (
    <>
      {msg && (
        <div style={{ position: 'fixed', left: 14, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 160px)', zIndex: 150, padding: '0.55rem 0.9rem', borderRadius: 12, background: 'rgba(40, 34, 30, 0.86)', color: '#fffaf0', fontSize: '0.88rem', maxWidth: 'calc(100vw - 28px)' }}>{msg}</div>
      )}
      <div style={{
        position: dock ? 'fixed' : 'absolute', left: 14, bottom: dock ? 'calc(env(safe-area-inset-bottom, 0px) + 96px)' : 14, zIndex: dock ? 150 : undefined, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 6px 6px',
        borderRadius: dock ? 16 : 18, maxWidth: 'min(460px, calc(100vw - 88px))', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', ...glass,
      }}>
        <button onClick={() => openSheet()} aria-label="Play something" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1, background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, overflow: 'hidden', background: dock ? 'rgba(255,255,255,0.14)' : calm ? 'rgba(255,255,255,0.08)' : '#efe3cc', display: 'grid', placeItems: 'center', fontSize: '1.3rem', opacity: calm ? 0.6 : 1 }}>
            {np?.art ? <img src={np.art} alt="" width={48} height={48} style={{ width: 48, height: 48, objectFit: 'cover' }} /> : '♪'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.98rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {np ? np.title : 'Play something'}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {np ? [np.artist, np.device].filter(Boolean).join(' · ') : `${current.name}'s Spotify`}
            </div>
          </div>
        </button>
        {np && <button style={round} aria-label="Previous" onClick={() => send({ action: 'previous' })}>⏮</button>}
        <button style={round} aria-label={np?.isPlaying ? 'Pause' : 'Play'} onClick={toggle}>{np?.isPlaying ? '⏸' : '▶'}</button>
        {np && <button style={round} aria-label="Next" onClick={() => send({ action: 'next' })}>⏭</button>}
      </div>

      {sheet && (
        <div onClick={() => setSheet(false)} style={{ position: dock ? 'fixed' : 'absolute', inset: 0, zIndex: dock ? 210 : undefined, background: 'rgba(20,18,26,0.35)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 'min(420px, 100%)', maxHeight: '78vh', overflowY: 'auto', marginBottom: dock ? 150 : 70, padding: '0.8rem', borderRadius: 18,
            background: 'rgba(255, 252, 245, 0.97)', border: '1px solid #e6d8bd', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', color: '#4a3f35',
          }}>
            {people.length > 1 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {people.map(p => (
                  <button key={p.userId} onClick={() => { setWho(p.userId); openSheet(p.userId) }} style={{
                    padding: '0.45rem 0.9rem', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem',
                    background: p.userId === current.userId ? '#f3e7cf' : 'transparent', color: 'inherit',
                  }}>{p.name}</button>
                ))}
              </div>
            )}
            {!picks ? (
              <div style={{ padding: '1rem 0.5rem', opacity: 0.6 }}>Loading…</div>
            ) : (
              <>
                <Label>Speaker</Label>
                {picks.devices.length === 0 ? (
                  <div style={{ fontSize: '0.88rem', opacity: 0.65, padding: '0.2rem 0.6rem 0.6rem', lineHeight: 1.5 }}>No speakers found. Open Spotify on a speaker, phone or computer and it shows up here.</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0.2rem 0.4rem 0.6rem' }}>
                    {picks.devices.map(d => (
                      <button key={d.id} onClick={() => moveTo(d.id)} style={{
                        padding: '0.5rem 0.9rem', borderRadius: 999, border: '1px solid #e6d8bd', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem',
                        background: d.id === speaker ? '#f3e7cf' : 'transparent', color: 'inherit',
                      }}>{d.name}</button>
                    ))}
                  </div>
                )}
                <Label>Playlists</Label>
                {picks.playlists.length === 0 && <div style={{ fontSize: '0.88rem', opacity: 0.65, padding: '0.2rem 0.6rem' }}>No playlists yet.</div>}
                {picks.playlists.map(p => (
                  <button key={p.uri} onClick={() => playList(p.uri)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '0.45rem 0.5rem', borderRadius: 10,
                    border: 'none', cursor: 'pointer', background: 'transparent', color: 'inherit', fontSize: '0.98rem', fontFamily: 'inherit',
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: '#efe3cc', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {p.art ? <img src={p.art} alt="" width={40} height={40} style={{ width: 40, height: 40, objectFit: 'cover' }} /> : '♪'}
                    </div>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )

}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.55, padding: '0.3rem 0.5rem' }}>{children}</div>
}
