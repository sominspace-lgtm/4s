'use client'

import { useState } from 'react'
import Icon, { type IconName } from '@/components/ui/Icon'

// Guest actions on the wall itself — the same contributions the /g/[token]
// phone portal collects (leave a note, sign the guestbook, add a song, where
// you're from, a fridge magnet), posted to the same endpoint with the
// gathering token. Theme-styled for the wall (the phone portal keeps its own
// warm cream look). This is the ONLY interactive surface in guest mode; no
// house controls, no shortcuts.

type Kind = 'thank_you' | 'guestbook' | 'note' | 'song' | 'from' | 'fridge'

const ACTIONS: { kind: Kind; icon: IconName; label: string }[] = [
  { kind: 'thank_you', icon: 'heart',      label: 'Say thanks' },
  { kind: 'guestbook', icon: 'clipboard',  label: 'Guestbook' },
  { kind: 'note',      icon: 'brain',      label: 'Leave a note' },
  { kind: 'song',      icon: 'mic',        label: 'Add a song' },
  { kind: 'from',      icon: 'pin',        label: "Where you're from" },
  { kind: 'fridge',    icon: 'household',  label: 'Fridge magnet' },
]

const FRIDGE_ICONS = ['❤️', '⭐', '🌻', '🍞', '☕', '🎈', '🐈', '🌙']

export default function GuestWallActions({ token, onInteract }: { token: string; onInteract?: () => void }) {
  const [open, setOpen] = useState<Kind | null>(null)
  const [justLeft, setJustLeft] = useState(false)

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
        <GuestForm
          token={token} kind={open}
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
        {ACTIONS.map(a => (
          <button key={a.kind} onClick={() => { setOpen(a.kind); onInteract?.() }} className="press" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '0.6rem 0.3rem', cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit',
          }}>
            <Icon name={a.icon} size={17} />
            <span style={{ fontSize: '0.62rem', textAlign: 'center' }}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function GuestForm({ token, kind, onBack, onDone }: { token: string; kind: Kind; onBack: () => void; onDone: () => void }) {
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [songUrl, setSongUrl] = useState('')
  const [place, setPlace] = useState('')
  const [icon, setIcon] = useState('❤️')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const canSubmit = kind === 'song' ? songTitle.trim().length > 0
    : kind === 'from' ? place.trim().length > 1
    : text.trim().length > 0

  const submit = async () => {
    setBusy(true); setErr(null)
    const payload: Record<string, unknown> = { kind, guest_name: name.trim() || null }
    if (kind === 'song') { payload.title = songTitle.trim(); payload.url = songUrl.trim(); payload.body = songTitle.trim() }
    else if (kind === 'from') { payload.place = place.trim(); payload.body = place.trim() }
    else if (kind === 'fridge') { payload.icon = icon; payload.body = text.trim() }
    else payload.body = text.trim()
    try {
      const res = await fetch(`/api/g/${token}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(data.error ?? 'Something went wrong.'); setBusy(false); return }
      onDone()
    } catch {
      setErr('No connection — try again.'); setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.68rem', cursor: 'pointer', padding: 0 }}>← back</button>

      {kind === 'song' ? (
        <>
          <input value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder="Song & artist" style={field} maxLength={120} />
          <input value={songUrl} onChange={e => setSongUrl(e.target.value)} placeholder="Link (optional)" style={field} maxLength={400} inputMode="url" />
        </>
      ) : kind === 'from' ? (
        <input value={place} onChange={e => setPlace(e.target.value)} placeholder="Town, or town & country" style={field} maxLength={60} />
      ) : (
        <>
          {kind === 'fridge' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {FRIDGE_ICONS.map(i => (
                <button key={i} onClick={() => setIcon(i)} style={{
                  background: icon === i ? 'var(--gold)' : 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 999, padding: '0.2rem 0.45rem', fontSize: '1rem', cursor: 'pointer',
                }}>{i}</button>
              ))}
            </div>
          )}
          <textarea
            value={text} onChange={e => setText(e.target.value)} rows={3}
            placeholder={kind === 'guestbook' ? 'A line for the book' : kind === 'thank_you' ? 'Thank you for having us…' : 'A thought, a wish, a memory'}
            style={{ ...field, resize: 'none' }} maxLength={280}
          />
        </>
      )}

      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name (optional)" style={field} autoComplete="name" />
      {err && <div style={{ color: 'var(--rose)', fontSize: '0.7rem' }}>{err}</div>}
      <button onClick={submit} disabled={!canSubmit || busy} className="press" style={{ ...pillBtn, opacity: !canSubmit || busy ? 0.5 : 1 }}>
        {busy ? 'Leaving it…' : 'Leave it in the village'}
      </button>
    </div>
  )
}

const shell: React.CSSProperties = {
  background: 'color-mix(in srgb, var(--rose) 9%, var(--surface2))',
  border: '1px solid color-mix(in srgb, var(--rose) 24%, var(--border))',
  borderRadius: 14, padding: '0.7rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
}
const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '0.4rem 0.55rem', fontSize: '0.75rem', color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
}
const pillBtn: React.CSSProperties = {
  background: 'var(--rose)', color: 'var(--bg)', border: 'none', borderRadius: 10,
  padding: '0.5rem', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
