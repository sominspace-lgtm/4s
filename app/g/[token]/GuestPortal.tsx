'use client'

import { useEffect, useState } from 'react'

// The guest's one-thumb portal. Landing screen = a row of big warm tap
// targets; each opens a single-screen form; every submit ends on a "left in
// the village ✨" confirmation. No account — an optional name is remembered
// in localStorage so a guest who comes back to add a second thing doesn't
// retype it. Photos live at the booth (Phase 3), not here.

type Action = 'thank_you' | 'guestbook' | 'note' | 'song' | 'from'

const ACTIONS: { kind: Action; icon: string; label: string; blurb: string }[] = [
  { kind: 'thank_you', icon: '💌', label: 'Say thank you', blurb: 'A little note by the well' },
  { kind: 'guestbook', icon: '📖', label: 'Sign the guestbook', blurb: 'Your name in the book' },
  { kind: 'note', icon: '💭', label: 'Leave a note', blurb: 'A thought, a wish, a memory' },
  { kind: 'song', icon: '🎵', label: 'Add a song', blurb: 'For the record player' },
  { kind: 'from', icon: '🗺️', label: 'Where you’re from', blurb: 'A pin on the map' },
]

const THANKS_CHIPS = ['Thank you for having us', 'What a night', 'So cozy in here', 'We’ll be back', 'This was special']

interface GuestInfo { wifiName?: string; wifiPassword?: string; notes?: string }

export default function GuestPortal({ token, title, photoAlbumUrl, musicUrl, guestInfo }: {
  token: string
  title: string
  photoAlbumUrl?: string | null
  musicUrl?: string | null
  guestInfo?: GuestInfo
}) {
  const [open, setOpen] = useState<Action | null>(null)
  const [done, setDone] = useState<Action | null>(null)
  const [showQueue, setShowQueue] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [name, setName] = useState('')
  const hasInfo = !!(guestInfo && (guestInfo.notes || guestInfo.wifiName))

  useEffect(() => {
    try { setName(localStorage.getItem('4s-guest-name') ?? '') } catch { /* ignore */ }
  }, [])
  const rememberName = (v: string) => {
    setName(v)
    try { v.trim() ? localStorage.setItem('4s-guest-name', v.trim()) : localStorage.removeItem('4s-guest-name') } catch { /* ignore */ }
  }

  return (
    <main style={S.shell}>
      <div style={S.wrap}>
        <header style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#a8987f' }}>Welcome to our village</div>
          <h1 style={S.h1}>{title}</h1>
          <p style={{ fontSize: '0.86rem', color: '#8a7d6f', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
            Leave a little piece of yourself in our home. No sign-up, nothing to install.
          </p>
        </header>

        {!open && !done && !showQueue && !showInfo && (
          <>
            <label style={S.nameField}>
              <span style={S.nameLabel}>Your name</span>
              <input
                value={name}
                onChange={e => rememberName(e.target.value)}
                placeholder="optional — so the village knows who came"
                style={S.input}
                autoComplete="name"
              />
            </label>
            <div style={S.grid}>
              {ACTIONS.map(a => (
                <button key={a.kind} onClick={() => setOpen(a.kind)} style={S.tile}>
                  <span style={{ fontSize: '1.7rem', lineHeight: 1 }}>{a.icon}</span>
                  <span style={S.tileLabel}>{a.label}</span>
                  <span style={S.tileBlurb}>{a.blurb}</span>
                </button>
              ))}
              {photoAlbumUrl && (
                <a href={photoAlbumUrl} target="_blank" rel="noopener noreferrer" style={{ ...S.tile, textDecoration: 'none' }}>
                  <span style={{ fontSize: '1.7rem', lineHeight: 1 }}>📸</span>
                  <span style={S.tileLabel}>Add photos</span>
                  <span style={S.tileBlurb}>Opens the shared album</span>
                </a>
              )}
              <button onClick={() => setShowQueue(true)} style={S.tile}>
                <span style={{ fontSize: '1.7rem', lineHeight: 1 }}>🎧</span>
                <span style={S.tileLabel}>What’s playing</span>
                <span style={S.tileBlurb}>See the queue &amp; vote</span>
              </button>
              {hasInfo && (
                <button onClick={() => setShowInfo(true)} style={S.tile}>
                  <span style={{ fontSize: '1.7rem', lineHeight: 1 }}>🏠</span>
                  <span style={S.tileLabel}>House info</span>
                  <span style={S.tileBlurb}>Wifi &amp; where things are</span>
                </button>
              )}
            </div>
            {!photoAlbumUrl && <p style={S.footnote}>📸 Ask your host to open up the photo album.</p>}
          </>
        )}

        {showQueue && !open && !done && (
          <SongQueue token={token} musicUrl={musicUrl} onBack={() => setShowQueue(false)} onAddSong={() => { setShowQueue(false); setOpen('song') }} />
        )}

        {showInfo && !open && !done && guestInfo && (
          <div style={S.card}>
            <button onClick={() => setShowInfo(false)} style={S.back}>← back</button>
            <div style={{ fontSize: '1.9rem' }}>🏠</div>
            <h2 style={S.h2}>House info</h2>
            {guestInfo.wifiName && (
              <div style={{ margin: '0.8rem 0', padding: '0.8rem', background: '#f6ecd8', borderRadius: '12px', textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', color: '#a8987f', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Wifi</div>
                <div style={{ fontSize: '0.95rem', color: '#4a3f35', marginTop: '0.2rem' }}>{guestInfo.wifiName}</div>
                {guestInfo.wifiPassword && (
                  <div style={{ fontSize: '0.95rem', color: '#4a3f35', fontFamily: 'ui-monospace, monospace' }}>{guestInfo.wifiPassword}</div>
                )}
              </div>
            )}
            {guestInfo.notes && (
              <p style={{ fontSize: '0.9rem', color: '#6a5f52', lineHeight: 1.7, whiteSpace: 'pre-wrap', textAlign: 'left', margin: 0 }}>
                {guestInfo.notes}
              </p>
            )}
          </div>
        )}

        {open && !done && (
          <ActionForm
            token={token}
            action={open}
            name={name}
            onName={rememberName}
            onBack={() => setOpen(null)}
            onDone={() => { setDone(open); setOpen(null) }}
          />
        )}

        {done && (
          <div style={S.card}>
            <div style={{ fontSize: '2.4rem' }}>✨</div>
            <h2 style={S.h2}>Left in the village</h2>
            <p style={{ fontSize: '0.9rem', color: '#8a7d6f', lineHeight: 1.6, margin: '0.4rem 0 1.2rem' }}>
              It’ll appear on the family’s screen in a moment.
            </p>
            <button onClick={() => setDone(null)} style={S.primary}>Leave something else</button>
          </div>
        )}
      </div>
    </main>
  )
}

function ActionForm({ token, action, name, onName, onBack, onDone }: {
  token: string
  action: Action
  name: string
  onName: (v: string) => void
  onBack: () => void
  onDone: () => void
}) {
  const meta = ACTIONS.find(a => a.kind === action)!
  const [text, setText] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [songUrl, setSongUrl] = useState('')
  const [place, setPlace] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true); setErr(null)
    const payload: Record<string, unknown> = { kind: action, guest_name: name.trim() || null }
    if (action === 'song') { payload.title = songTitle.trim(); payload.url = songUrl.trim(); payload.body = songTitle.trim() }
    else if (action === 'from') { payload.place = place.trim(); payload.body = place.trim() }
    else payload.body = text.trim()

    try {
      const res = await fetch(`/api/g/${token}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Something went wrong.'); setBusy(false); return }
      onDone()
    } catch {
      setErr('No connection — try again.')
      setBusy(false)
    }
  }

  const canSubmit =
    action === 'song' ? songTitle.trim().length > 0
    : action === 'from' ? place.trim().length > 1
    : text.trim().length > 0

  return (
    <div style={S.card}>
      <button onClick={onBack} style={S.back}>← back</button>
      <div style={{ fontSize: '1.9rem' }}>{meta.icon}</div>
      <h2 style={S.h2}>{meta.label}</h2>

      {action === 'thank_you' && (
        <>
          <div style={S.chips}>
            {THANKS_CHIPS.map(c => (
              <button key={c} onClick={() => setText(c)} style={{ ...S.chip, ...(text === c ? S.chipOn : {}) }}>{c}</button>
            ))}
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="…or write your own" rows={3} style={S.area} maxLength={280} />
        </>
      )}

      {(action === 'guestbook' || action === 'note') && (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={action === 'guestbook' ? 'A line for the book' : 'A thought, a wish, a memory'}
          rows={4}
          style={S.area}
          maxLength={280}
        />
      )}

      {action === 'song' && (
        <>
          <input value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder="Song & artist" style={S.input} maxLength={120} />
          <input value={songUrl} onChange={e => setSongUrl(e.target.value)} placeholder="Link (optional)" style={{ ...S.input, marginTop: '0.5rem' }} maxLength={400} inputMode="url" />
        </>
      )}

      {action === 'from' && (
        <input value={place} onChange={e => setPlace(e.target.value)} placeholder="Town, or town & country" style={S.input} maxLength={60} />
      )}

      <input
        value={name}
        onChange={e => onName(e.target.value)}
        placeholder="Your name (optional)"
        style={{ ...S.input, marginTop: '0.7rem' }}
        autoComplete="name"
      />

      {err && <p style={{ color: '#b4553f', fontSize: '0.8rem', margin: '0.6rem 0 0' }}>{err}</p>}

      <button onClick={submit} disabled={!canSubmit || busy} style={{ ...S.primary, marginTop: '0.9rem', opacity: !canSubmit || busy ? 0.5 : 1 }}>
        {busy ? 'Leaving it…' : 'Leave it in the village'}
      </button>
    </div>
  )
}

function SongQueue({ token, musicUrl, onBack, onAddSong }: {
  token: string
  musicUrl?: string | null
  onBack: () => void
  onAddSong: () => void
}) {
  const [songs, setSongs] = useState<{ id: string; title: string; by: string | null; votes: number }[]>([])
  const [voted, setVoted] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await fetch(`/api/g/${token}/vote`)
      const data = await res.json()
      if (res.ok) setSongs(data.songs ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }
  useEffect(() => {
    try { setVoted(new Set(JSON.parse(localStorage.getItem('4s-guest-votes') || '[]'))) } catch { /* ignore */ }
    load()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const vote = async (id: string) => {
    if (voted.has(id)) return
    setSongs(s => s.map(x => (x.id === id ? { ...x, votes: x.votes + 1 } : x)).sort((a, b) => b.votes - a.votes))
    const next = new Set(voted); next.add(id); setVoted(next)
    try { localStorage.setItem('4s-guest-votes', JSON.stringify([...next])) } catch { /* ignore */ }
    try { await fetch(`/api/g/${token}/vote`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contributionId: id }) }) } catch { /* ignore */ }
  }

  const embed = musicUrl ? toEmbed(musicUrl) : null

  return (
    <div style={S.card}>
      <button onClick={onBack} style={S.back}>← back</button>
      <div style={{ fontSize: '1.9rem' }}>🎧</div>
      <h2 style={S.h2}>What’s playing</h2>

      {embed && (
        <iframe
          src={embed}
          style={{ width: '100%', height: embed.includes('spotify') ? 152 : 200, border: 'none', borderRadius: '12px', marginBottom: '0.8rem' }}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          loading="lazy"
        />
      )}
      {!embed && musicUrl && (
        <a href={musicUrl} target="_blank" rel="noopener noreferrer" style={{ ...S.primary, display: 'block', textDecoration: 'none', marginBottom: '0.8rem' }}>Open the playlist ↗</a>
      )}

      <div style={{ textAlign: 'left', margin: '0.4rem 0 0.8rem' }}>
        {loading && <p style={{ fontSize: '0.82rem', color: '#9a8b76' }}>Loading the queue…</p>}
        {!loading && songs.length === 0 && <p style={{ fontSize: '0.82rem', color: '#9a8b76' }}>No requests yet — be the first.</p>}
        {songs.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0', borderBottom: '1px solid #efe3c8' }}>
            <button
              onClick={() => vote(s.id)}
              disabled={voted.has(s.id)}
              style={{ ...S.voteBtn, ...(voted.has(s.id) ? { background: '#e8896b', color: '#fff', borderColor: '#e8896b' } : {}) }}
            >▲ {s.votes}</button>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.86rem', color: '#463b30', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
              {s.by && <div style={{ fontSize: '0.68rem', color: '#a8987f' }}>added by {s.by}</div>}
            </div>
          </div>
        ))}
      </div>

      <button onClick={onAddSong} style={S.primary}>Add a song 🎵</button>
    </div>
  )
}

// A share/watch link → an embeddable player URL. Falls back to a plain
// "open" link (above) when the shape isn't recognised.
function toEmbed(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('open.spotify.com')) {
      return `https://open.spotify.com/embed${u.pathname}`
    }
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const list = u.searchParams.get('list')
      const v = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v')
      if (list) return `https://www.youtube.com/embed/videoseries?list=${list}`
      if (v) return `https://www.youtube.com/embed/${v}`
    }
  } catch { /* ignore */ }
  return null
}

const S: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100dvh',
    padding: '1.4rem 1.1rem 3rem',
    background: 'radial-gradient(130% 80% at 50% 0%, #f7edda 0%, #efe1c6 55%, #e6d4b4 100%)',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  wrap: { maxWidth: '25rem', margin: '0 auto' },
  h1: { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 400, fontSize: '1.7rem', color: '#463b30', margin: '0.15rem 0 0', letterSpacing: '0.01em' },
  h2: { fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.25rem', color: '#463b30', margin: '0.3rem 0 0.8rem' },
  nameField: { display: 'block', marginBottom: '1rem' },
  nameLabel: { display: 'block', fontSize: '0.72rem', color: '#a8987f', marginBottom: '0.3rem', letterSpacing: '0.03em' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' },
  tile: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem',
    background: '#fffdf7', border: '1px solid #e6d8bd', borderRadius: '16px',
    padding: '1rem 0.9rem', textAlign: 'left', cursor: 'pointer',
    boxShadow: '0 6px 16px rgba(120, 96, 60, 0.1)',
  },
  tileLabel: { fontSize: '0.92rem', fontWeight: 600, color: '#463b30' },
  tileBlurb: { fontSize: '0.72rem', color: '#9a8b76', lineHeight: 1.35 },
  footnote: { textAlign: 'center', fontSize: '0.76rem', color: '#a8987f', marginTop: '1.3rem' },
  card: {
    position: 'relative',
    background: '#fffdf7', border: '1px solid #e6d8bd', borderRadius: '20px',
    padding: '2.2rem 1.3rem 1.5rem', textAlign: 'center',
    boxShadow: '0 12px 34px rgba(120, 96, 60, 0.16)',
  },
  back: { position: 'absolute', left: '1rem', top: '1rem', background: 'none', border: 'none', color: '#a8987f', fontSize: '0.8rem', cursor: 'pointer' },
  input: {
    width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.8rem',
    border: '1px solid #e0d0b2', borderRadius: '11px', fontSize: '0.92rem',
    background: '#fdfaf2', color: '#463b30', outline: 'none',
  },
  area: {
    width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.8rem',
    border: '1px solid #e0d0b2', borderRadius: '11px', fontSize: '0.92rem',
    background: '#fdfaf2', color: '#463b30', outline: 'none', resize: 'none',
    fontFamily: 'inherit', marginTop: '0.6rem',
  },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' },
  chip: {
    background: '#f4ead4', border: '1px solid #e3d3b3', borderRadius: '999px',
    padding: '0.4rem 0.7rem', fontSize: '0.78rem', color: '#6d5f4c', cursor: 'pointer',
  },
  chipOn: { background: '#e8896b', borderColor: '#e8896b', color: '#fff' },
  voteBtn: {
    background: '#f4ead4', border: '1px solid #e3d3b3', borderRadius: '9px',
    padding: '0.35rem 0.5rem', fontSize: '0.74rem', color: '#6d5f4c', cursor: 'pointer',
    whiteSpace: 'nowrap', minWidth: '3rem',
  },
  primary: {
    width: '100%', padding: '0.8rem', border: 'none', borderRadius: '12px',
    background: '#e8896b', color: '#fff', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
  },
}
