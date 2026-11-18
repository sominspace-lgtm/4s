'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { NowPlaying, Choices, Track } from '@/lib/spotify/server'

// Music on the Village (2026-11-18). A glass chip under the clock, the same
// family as AmbientInfo: small while you use the app, bigger once the wall
// goes idle. Tap it for the player: controls, up next, search to add a
// song, playlists and speakers. While you host, guests can add songs from
// the guest link, and their names show next to what they picked.

const POLL_MS = 10_000
type Tab = 'next' | 'add' | 'lists' | 'speakers'
type QueueItem = Track & { by: string | null }

const glassSmall: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
  backdropFilter: 'blur(10px) saturate(1.1)', WebkitBackdropFilter: 'blur(10px) saturate(1.1)',
  boxShadow: '0 4px 14px rgba(0,0,0,0.2)', color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,0.45)',
}
const glassBig: React.CSSProperties = {
  ...glassSmall, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 12px 34px rgba(0,0,0,0.3)',
}
const panelGlass: React.CSSProperties = {
  background: 'rgba(28, 24, 32, 0.62)', border: '1px solid rgba(255,255,255,0.16)',
  backdropFilter: 'blur(22px) saturate(1.3)', WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
  boxShadow: '0 18px 44px rgba(0,0,0,0.35)', color: '#fff',
}

function Icon({ name, size = 18 }: { name: 'play' | 'pause' | 'next' | 'prev' | 'note'; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as const
  if (name === 'play') return <svg {...p}><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
  if (name === 'pause') return <svg {...p}><rect x="6.5" y="5" width="4" height="14" rx="1.2" /><rect x="13.5" y="5" width="4" height="14" rx="1.2" /></svg>
  if (name === 'next') return <svg {...p}><path d="M5 6.2v11.6a.9.9 0 0 0 1.4.75L14.5 13a1.2 1.2 0 0 0 0-2L6.4 5.45A.9.9 0 0 0 5 6.2z" /><rect x="16.5" y="5" width="2.6" height="14" rx="1.2" /></svg>
  if (name === 'prev') return <svg {...p} style={{ transform: 'scaleX(-1)' }}><path d="M5 6.2v11.6a.9.9 0 0 0 1.4.75L14.5 13a1.2 1.2 0 0 0 0-2L6.4 5.45A.9.9 0 0 0 5 6.2z" /><rect x="16.5" y="5" width="2.6" height="14" rx="1.2" /></svg>
  return <svg {...p}><path d="M17 3.5v10.6a3.4 3.4 0 1 1-2-3.1V7.2l-6 1.5v7.4a3.4 3.4 0 1 1-2-3.1V6.6a1 1 0 0 1 .76-.97l8-2A1 1 0 0 1 17 3.5z" /></svg>
}

/** Three small bars that move while music plays. */
function Bars({ on, size }: { on: boolean; size: number }) {
  return (
    <span aria-hidden style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 1.5, height: size, flexShrink: 0 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: Math.max(2, size / 6), height: on ? '100%' : '30%', borderRadius: 1, background: 'currentColor', opacity: 0.85,
          transformOrigin: 'bottom', animation: on ? `ss-eq 0.9s ${i * 0.18}s ease-in-out infinite alternate` : 'none',
        }} />
      ))}
      <style>{'@keyframes ss-eq { from { transform: scaleY(0.25) } to { transform: scaleY(1) } }'}</style>
    </span>
  )
}

function Art({ src, size, radius }: { src: string | null; size: number; radius: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', flexShrink: 0, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.14)' }}>
      {src ? <img src={src} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: 'cover' }} /> : <Icon name="note" size={size * 0.5} />}
    </span>
  )
}

export default function MusicChip({ ambient = false, hosting = false, queueOn = true, onQueueOn }: {
  ambient?: boolean
  /** A gathering is on: show the guest queue switch and guest names. */
  hosting?: boolean
  queueOn?: boolean
  onQueueOn?: (on: boolean) => void
}) {
  const [people, setPeople] = useState<NowPlaying[] | null>(null)
  const [who, setWho] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('next')
  const [queue, setQueue] = useState<QueueItem[] | null>(null)
  const [picks, setPicks] = useState<Choices | null>(null)
  const [speaker, setSpeaker] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Track[] | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/home/music', { cache: 'no-store' }).catch(() => null)
    if (res?.ok) setPeople((await res.json()).people ?? [])
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(() => { if (document.visibilityState === 'visible') load() }, POLL_MS)
    return () => clearInterval(id)
  }, [load])

  const current = people && people.length
    ? people.find(p => p.userId === who) ?? people.find(p => p.playing?.isPlaying) ?? people.find(p => p.playing) ?? people[0]
    : null
  const np = current?.playing ?? null
  const uid = current?.userId ?? null

  const loadQueue = useCallback(async () => {
    if (!uid) return
    const res = await fetch(`/api/home/music/queue?userId=${encodeURIComponent(uid)}`, { cache: 'no-store' }).catch(() => null)
    setQueue(res?.ok ? (await res.json()).upNext ?? [] : [])
  }, [uid])

  // While the player is open, keep up next fresh (guests add from their phones).
  useEffect(() => {
    if (!open) return
    loadQueue()
    const id = setInterval(loadQueue, POLL_MS)
    return () => clearInterval(id)
  }, [open, loadQueue, np?.title])

  useEffect(() => {
    if (!open || (tab !== 'lists' && tab !== 'speakers') || !uid) return
    let live = true
    setPicks(null)
    fetch(`/api/home/music/choices?userId=${encodeURIComponent(uid)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { playlists: [], devices: [] }))
      .then((c: Choices) => { if (!live) return; setPicks(c); setSpeaker(c.devices.find(d => d.active)?.id ?? c.devices[0]?.id ?? null) })
      .catch(() => live && setPicks({ playlists: [], devices: [] }))
    return () => { live = false }
  }, [open, tab, uid])

  // Search as you type, a beat after the last key.
  useEffect(() => {
    if (tab !== 'add' || !uid) return
    const text = q.trim()
    if (text.length < 2) { setResults(null); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/home/music/queue?userId=${encodeURIComponent(uid)}&q=${encodeURIComponent(text)}`, { cache: 'no-store' }).catch(() => null)
      setResults(res?.ok ? (await res.json()).results ?? [] : [])
    }, 350)
    return () => clearTimeout(t)
  }, [q, tab, uid])

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  if (!people || !current) return null

  function say(m: string) { setMsg(m); setTimeout(() => setMsg(null), 2600) }

  async function send(body: Record<string, unknown>) {
    const res = await fetch('/api/home/music', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, ...body }),
    }).catch(() => null)
    if (!res?.ok) { say((await res?.json().catch(() => null))?.error ?? 'Spotify did not answer. Try again.'); return false }
    setTimeout(() => { load(); if (open) loadQueue() }, 700)
    return true
  }

  async function toggle() {
    if (!np) { setOpen(true); setTab('lists'); return }
    const next = !np.isPlaying
    setPeople(ps => ps && ps.map(p => (p.userId === uid && p.playing ? { ...p, playing: { ...p.playing, isPlaying: next } } : p)))
    await send({ action: next ? 'play' : 'pause' })
  }

  async function add(t: Track) {
    if (added.has(t.uri)) return
    if (await send({ action: 'queue', uri: t.uri })) { setAdded(s => new Set(s).add(t.uri)); say(`Added ${t.title}`) }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'next', label: 'Up next' }, { id: 'add', label: 'Add' }, { id: 'lists', label: 'Playlists' }, { id: 'speakers', label: 'Speakers' },
  ]
  const big = ambient && !open
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '0.45rem 0.35rem', borderRadius: 10 }
  const plain: React.CSSProperties = { background: 'none', border: 'none', color: 'inherit', fontFamily: 'inherit', cursor: 'pointer', padding: 0, textAlign: 'left' }
  const ctrl: React.CSSProperties = { ...plain, width: 44, height: 44, borderRadius: 22, display: 'grid', placeItems: 'center' }

  return (
    <div ref={ref} style={{ position: 'relative', pointerEvents: 'auto', fontFamily: 'var(--font-body)' }}>
      <button onClick={() => setOpen(o => !o)} aria-label={np ? `Music: ${np.title}` : 'Music'} aria-expanded={open} style={{
        ...plain, ...(big ? glassBig : glassSmall), display: 'flex', alignItems: 'center', gap: big ? 12 : 7,
        padding: big ? '0.7rem 0.95rem 0.7rem 0.7rem' : '0.3rem 0.55rem 0.3rem 0.3rem', borderRadius: big ? 16 : 10,
        maxWidth: big ? '17rem' : '12rem', transition: 'all 500ms ease',
      }}>
        <Art src={np?.art ?? null} size={big ? 46 : 24} radius={big ? 9 : 5} />
        <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: big ? 2 : 0 }}>
          <span style={{ fontSize: big ? '0.98rem' : '0.7rem', fontWeight: 500, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {np ? np.title : 'Play something'}
          </span>
          <span style={{ fontSize: big ? '0.74rem' : '0.56rem', opacity: 0.85, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {np ? np.artist : 'Spotify'}
          </span>
        </span>
        {np && <Bars on={np.isPlaying} size={big ? 14 : 9} />}
      </button>

      {open && (
        <div role="dialog" aria-label="Music" style={{
          ...panelGlass, position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 20, width: 'min(20rem, calc(100vw - 2rem))',
          maxHeight: 'min(34rem, 70vh)', display: 'flex', flexDirection: 'column', borderRadius: 18, overflow: 'hidden',
        }}>
          <div style={{ padding: '0.9rem 0.9rem 0.5rem' }}>
            {people.length > 1 && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                {people.map(p => (
                  <button key={p.userId} onClick={() => { setWho(p.userId); setQueue(null); setResults(null) }} style={{
                    ...plain, padding: '0.3rem 0.75rem', borderRadius: 999, fontSize: '0.75rem',
                    background: p.userId === uid ? 'rgba(255,255,255,0.2)' : 'transparent',
                  }}>{p.name}</button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Art src={np?.art ?? null} size={60} radius={10} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{np ? np.title : 'Nothing playing'}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.75, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {np ? [np.artist, np.device].filter(Boolean).join(' · ') : 'Pick a playlist to start'}
                </div>
              </div>
            </div>
            {np && np.durationMs > 0 && (
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.18)', margin: '0.75rem 0 0.2rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (np.progressMs / np.durationMs) * 100)}%`, background: 'rgba(255,255,255,0.85)' }} />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 4 }}>
              <button style={ctrl} aria-label="Previous" disabled={!np} onClick={() => send({ action: 'previous' })}><Icon name="prev" size={20} /></button>
              <button style={{ ...ctrl, background: 'rgba(255,255,255,0.92)', color: '#1d1a20' }} aria-label={np?.isPlaying ? 'Pause' : 'Play'} onClick={toggle}>
                <Icon name={np?.isPlaying ? 'pause' : 'play'} size={20} />
              </button>
              <button style={ctrl} aria-label="Next" disabled={!np} onClick={() => send({ action: 'next' })}><Icon name="next" size={20} /></button>
            </div>
            {hosting && onQueueOn && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: '0.55rem 0.7rem', borderRadius: 12, background: 'rgba(255,255,255,0.08)', fontSize: '0.8rem', cursor: 'pointer' }}>
                <span style={{ flex: 1 }}>Guests can add songs<span style={{ display: 'block', fontSize: '0.68rem', opacity: 0.65 }}>From the guest link, while you host</span></span>
                <input type="checkbox" checked={queueOn} onChange={e => onQueueOn(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#fff' }} />
              </label>
            )}
            <div style={{ display: 'flex', gap: 2, marginTop: 10, padding: 3, borderRadius: 10, background: 'rgba(255,255,255,0.08)' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  ...plain, flex: 1, textAlign: 'center', padding: '0.4rem 0', borderRadius: 8, fontSize: '0.74rem',
                  background: tab === t.id ? 'rgba(255,255,255,0.2)' : 'transparent', fontWeight: tab === t.id ? 600 : 400,
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          <div style={{ overflowY: 'auto', padding: '0 0.55rem 0.7rem' }}>
            {tab === 'next' && (
              queue === null ? <Muted>Loading…</Muted>
                : queue.length === 0 ? <Muted>{np ? 'Nothing queued. Add a song.' : 'Start something first.'}</Muted>
                  : queue.map((t, i) => (
                    <div key={`${t.uri}-${i}`} style={row}>
                      <Art src={t.art} size={36} radius={6} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.65, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.artist}</div>
                      </div>
                      {t.by && <span style={{ fontSize: '0.66rem', padding: '0.15rem 0.5rem', borderRadius: 999, background: 'rgba(255,255,255,0.16)', whiteSpace: 'nowrap', maxWidth: '6rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.by}</span>}
                    </div>
                  ))
            )}

            {tab === 'add' && (
              <>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search songs" autoFocus style={{
                  width: '100%', boxSizing: 'border-box', margin: '0.2rem 0 0.4rem', padding: '0.6rem 0.8rem', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none',
                }} />
                {results === null ? <Muted>{np ? 'Songs go to the end of the queue.' : 'Start something first, then add songs.'}</Muted>
                  : results.length === 0 ? <Muted>No songs found.</Muted>
                    : results.map(t => (
                      <button key={t.uri} onClick={() => add(t)} style={{ ...plain, ...row, width: '100%' }}>
                        <Art src={t.art} size={36} radius={6} />
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ display: 'block', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                          <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.65, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.artist}</span>
                        </span>
                        <span style={{ fontSize: '0.72rem', opacity: added.has(t.uri) ? 0.6 : 1 }}>{added.has(t.uri) ? 'Added' : '+ Add'}</span>
                      </button>
                    ))}
              </>
            )}

            {tab === 'lists' && (
              !picks ? <Muted>Loading…</Muted>
                : picks.playlists.length === 0 ? <Muted>No playlists yet.</Muted>
                  : picks.playlists.map(p => (
                    <button key={p.uri} onClick={async () => { if (await send({ action: 'playlist', uri: p.uri, ...(speaker ? { deviceId: speaker } : {}) })) setTab('next') }} style={{ ...plain, ...row, width: '100%' }}>
                      <Art src={p.art} size={36} radius={6} />
                      <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    </button>
                  ))
            )}

            {tab === 'speakers' && (
              !picks ? <Muted>Loading…</Muted>
                : picks.devices.length === 0 ? <Muted>No speakers found. Open Spotify on a speaker, phone or computer and it shows up here.</Muted>
                  : picks.devices.map(d => (
                    <button key={d.id} onClick={async () => { setSpeaker(d.id); if (np) await send({ action: 'transfer', deviceId: d.id }) }} style={{ ...plain, ...row, width: '100%' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0, background: d.id === speaker ? '#7be0a0' : 'rgba(255,255,255,0.3)' }} />
                      <span style={{ fontSize: '0.85rem', flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: '0.68rem', opacity: 0.6 }}>{d.type}</span>
                    </button>
                  ))
            )}
          </div>
          {msg && <div style={{ padding: '0.55rem 0.9rem', fontSize: '0.78rem', borderTop: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.2)' }}>{msg}</div>}
        </div>
      )}
    </div>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '0.7rem 0.4rem', fontSize: '0.8rem', opacity: 0.65, lineHeight: 1.5 }}>{children}</div>
}
