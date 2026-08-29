'use client'

import { useEffect, useState } from 'react'

// The guest's one-thumb portal. Landing screen = a row of big warm tap
// targets; each opens a single-screen form; every submit ends on a "left in
// the village ✨" confirmation. No account — an optional name is remembered
// in localStorage so a guest who comes back to add a second thing doesn't
// retype it. Photos live at the booth (Phase 3), not here.

type Action = 'thank_you' | 'guestbook' | 'note' | 'song' | 'from' | 'fridge'

const ACTIONS: { kind: Action; icon: string; label: string; blurb: string }[] = [
  { kind: 'thank_you', icon: '💌', label: 'Say thank you', blurb: 'Leave a little note by the well' },
  { kind: 'guestbook', icon: '📖', label: 'Sign the guestbook', blurb: 'Your name in the book' },
  { kind: 'note', icon: '💭', label: 'Leave a note', blurb: 'A thought, a wish, a memory' },
  { kind: 'song', icon: '🎵', label: 'Add a song', blurb: 'Something for the record player' },
  { kind: 'from', icon: '🗺️', label: 'Where you’re from', blurb: 'A pin on the map' },
  { kind: 'fridge', icon: '🧲', label: 'Add to the fridge', blurb: 'A doodle-note for the kitchen' },
]

const THANKS_CHIPS = ['Thank you for having us', 'What a night', 'So cozy in here', 'We’ll be back', 'This was special']
const FRIDGE_ICONS = ['❤️', '⭐', '🌻', '🍞', '☕', '🎈', '🐈', '🌙']

export default function GuestPortal({ token, title }: { token: string; title: string }) {
  const [open, setOpen] = useState<Action | null>(null)
  const [done, setDone] = useState<Action | null>(null)
  const [name, setName] = useState('')

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

        {!open && !done && (
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
            </div>
            <p style={S.footnote}>📸 Photos: find the little photo booth in the village.</p>
          </>
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
  const [icon, setIcon] = useState('❤️')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true); setErr(null)
    const payload: Record<string, unknown> = { kind: action, guest_name: name.trim() || null }
    if (action === 'song') { payload.title = songTitle.trim(); payload.url = songUrl.trim(); payload.body = songTitle.trim() }
    else if (action === 'from') { payload.place = place.trim(); payload.body = place.trim() }
    else if (action === 'fridge') { payload.icon = icon; payload.body = text.trim() }
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

      {action === 'fridge' && (
        <>
          <div style={S.chips}>
            {FRIDGE_ICONS.map(i => (
              <button key={i} onClick={() => setIcon(i)} style={{ ...S.chip, fontSize: '1.2rem', ...(icon === i ? S.chipOn : {}) }}>{i}</button>
            ))}
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="A few words for the fridge" rows={2} style={S.area} maxLength={120} />
        </>
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
  primary: {
    width: '100%', padding: '0.8rem', border: 'none', borderRadius: '12px',
    background: '#e8896b', color: '#fff', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
  },
}
