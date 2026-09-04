'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/ui/Icon'
import GuestActionForm, { GUEST_ACTIONS, useGuestName, type GuestActionKind } from '@/components/guest/GuestActionForm'

// Guest actions on the wall itself — the same contributions the
// /g/[token] phone portal collects, posted to the same endpoint. The
// per-kind form body is shared (components/guest/GuestActionForm.tsx);
// this file owns the wall's landing grid, its confirmation line, and the
// theme-styled shell. This is the ONLY interactive surface in guest mode.

type Kind = GuestActionKind

export default function GuestWallActions({ token, photoAlbumUrl = null, onInteract }: { token: string; photoAlbumUrl?: string | null; onInteract?: () => void }) {
  const [open, setOpen] = useState<Kind | null>(null)
  const [showQueue, setShowQueue] = useState(false)
  const [showBye, setShowBye] = useState(false)
  const [justLeft, setJustLeft] = useState(false)
  const [name, rememberName] = useGuestName()
  const [hosts, setHosts] = useState<{ name: string }[]>([])

  useEffect(() => {
    let alive = true
    fetch(`/api/g/${token}/ping`).then(r => r.json()).then(d => {
      if (alive && Array.isArray(d.hosts)) setHosts(d.hosts)
    }).catch(() => { /* the picker just won't show names */ })
    return () => { alive = false }
  }, [token])

  if (showQueue) {
    return (
      <div style={shell}>
        <WallSongQueue token={token} onBack={() => setShowQueue(false)} onAddSong={() => { setShowQueue(false); setOpen('song'); onInteract?.() }} />
      </div>
    )
  }

  if (showBye) {
    return (
      <div style={shell}>
        <WallGoodbye photoAlbumUrl={photoAlbumUrl} onBack={() => setShowBye(false)} />
      </div>
    )
  }

  if (justLeft) {
    return (
      <div style={shell}>
        <div style={{ fontSize: '0.82rem', color: 'var(--text)', textAlign: 'center' }}>✨ Left in the village.</div>
        <button onClick={() => setJustLeft(false)} className="press" style={pillBtn}>Leave something else</button>
      </div>
    )
  }

  if (open) {
    return (
      <div style={shell}>
        <GuestActionForm
          token={token}
          surface="wall"
          kind={open}
          guestName={name}
          onGuestName={rememberName}
          hosts={hosts}
          onBack={() => setOpen(null)}
          onDone={() => { setOpen(null); setJustLeft(true); onInteract?.() }}
        />
      </div>
    )
  }

  return (
    <div style={shell}>
      <div style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text)' }}>Leave something</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: '0.4rem' }}>
        {GUEST_ACTIONS.map(a => (
          <button key={a.kind} onClick={() => { setOpen(a.kind); onInteract?.() }} className="press" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '0.6rem 0.3rem', cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit',
          }}>
            <Icon name={a.icon} size={17} />
            <span style={{ fontSize: '0.62rem', textAlign: 'center' }}>{a.label}</span>
          </button>
        ))}
        <button onClick={() => { setShowQueue(true); onInteract?.() }} className="press" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '0.6rem 0.3rem', cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit',
        }}>
          <Icon name="mic" size={17} />
          <span style={{ fontSize: '0.62rem', textAlign: 'center' }}>What&rsquo;s playing</span>
        </button>
        <button onClick={() => { setShowBye(true); onInteract?.() }} className="press" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '0.6rem 0.3rem', cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit',
        }}>
          <span style={{ fontSize: 17, lineHeight: 1 }}>👋</span>
          <span style={{ fontSize: '0.62rem', textAlign: 'center' }}>Heading home</span>
        </button>
      </div>
    </div>
  )
}

// The wall's goodbye screen (2026-09-04) — a guest who used the wall all
// night needs their OWN phone for photos, so this is the one place a QR
// still shows: scan it to open the shared album later. Generated client
// -side with the same `qrcode` lib Village.tsx uses for the join link.
function WallGoodbye({ photoAlbumUrl, onBack }: { photoAlbumUrl: string | null; onBack: () => void }) {
  const [qr, setQr] = useState<string | null>(null)
  useEffect(() => {
    if (!photoAlbumUrl) { setQr(null); return }
    let alive = true
    import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(photoAlbumUrl, { margin: 1, width: 240 }))
      .then(uri => { if (alive) setQr(uri) })
      .catch(() => { if (alive) setQr(null) })
    return () => { alive = false }
  }, [photoAlbumUrl])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', textAlign: 'center' }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.68rem', cursor: 'pointer', padding: 0 }}>← back</button>
      <span style={{ fontSize: 22 }}>👋</span>
      <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text)' }}>Thanks for coming</div>
      {photoAlbumUrl ? (
        <>
          <div style={{ fontSize: '0.66rem', color: 'var(--muted)' }}>Scan with your phone to add your photos later</div>
          {qr && <img src={qr} alt="Scan to open the photo album" width={130} height={130} style={{ borderRadius: 8, background: '#fff', padding: 6 }} />}
        </>
      ) : (
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>The village will remember that you were here.</div>
      )}
    </div>
  )
}

// The song queue, wall-styled (2026-09-04) — mirrors GuestPortal's phone
// version (same /api/g/[token]/vote endpoint, same vote-once-per-device
// dedup), just theme-tokened instead of the phone's cream look. The
// playlist embed itself already lives in MusicCard elsewhere on the wall;
// this is only the request queue + voting.
function WallSongQueue({ token, onBack, onAddSong }: { token: string; onBack: () => void; onAddSong: () => void }) {
  const [songs, setSongs] = useState<{ id: string; title: string; by: string | null; votes: number }[]>([])
  const [voted, setVoted] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try { setVoted(new Set(JSON.parse(localStorage.getItem('4s-guest-votes') || '[]'))) } catch { /* ignore */ }
    const load = async () => {
      try {
        const res = await fetch(`/api/g/${token}/vote`)
        const data = await res.json()
        if (res.ok) setSongs(data.songs ?? [])
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [token])

  const vote = async (id: string) => {
    if (voted.has(id)) return
    setSongs(s => s.map(x => (x.id === id ? { ...x, votes: x.votes + 1 } : x)).sort((a, b) => b.votes - a.votes))
    const next = new Set(voted); next.add(id); setVoted(next)
    try { localStorage.setItem('4s-guest-votes', JSON.stringify([...next])) } catch { /* ignore */ }
    try { await fetch(`/api/g/${token}/vote`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contributionId: id }) }) } catch { /* ignore */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.68rem', cursor: 'pointer', padding: 0 }}>← back</button>
      {loading && <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Loading the queue…</div>}
      {!loading && songs.length === 0 && <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>No requests yet — be the first.</div>}
      {songs.map(s => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => vote(s.id)}
            disabled={voted.has(s.id)}
            style={{
              fontSize: '0.68rem', padding: '0.2rem 0.4rem', borderRadius: 8, border: '1px solid var(--border)',
              background: voted.has(s.id) ? 'var(--rose)' : 'var(--surface)', color: voted.has(s.id) ? 'var(--bg)' : 'var(--text)',
              cursor: voted.has(s.id) ? 'default' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >▲ {s.votes}</button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
            {s.by && <div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>added by {s.by}</div>}
          </div>
        </div>
      ))}
      <button onClick={onAddSong} className="press" style={pillBtn}>Add a song 🎵</button>
    </div>
  )
}

const shell: React.CSSProperties = {
  background: 'color-mix(in srgb, var(--rose) 9%, var(--surface2))',
  border: '1px solid color-mix(in srgb, var(--rose) 24%, var(--border))',
  borderRadius: 14, padding: '0.7rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
}
const pillBtn: React.CSSProperties = {
  background: 'var(--rose)', color: 'var(--bg)', border: 'none', borderRadius: 10,
  padding: '0.5rem', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
