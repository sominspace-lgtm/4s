'use client'

import { useEffect, useState } from 'react'
import type { IconName } from '@/components/ui/Icon'

// The one guest contribution form, shared by the phone portal
// (app/g/[token]/GuestPortal.tsx) and the wall (components/village/
// GuestWallActions.tsx). Those two used to carry near-identical copies of
// this that drifted apart (name persistence, thank-you chips, labels) —
// every guest-mode change had to be made twice. This owns the per-kind
// form body and the POST; each parent keeps its own landing grid and its
// own confirmation screen (the copy and styling there genuinely differ).
//
// Payload shapes are byte-identical to what both files sent before — the
// /api/g/[token] route and its KIND_FIELDS allowlist are unchanged.

export type GuestActionKind = 'thank_you' | 'guestbook' | 'note' | 'song' | 'from' | 'find'

const PING_REASONS = ['At the door', 'Need a hand', 'Phone call', 'Come say hi']

export interface GuestActionDef {
  kind: GuestActionKind
  /** Wall icon (components/ui/Icon). */
  icon: IconName
  /** Phone tile glyph. */
  emoji: string
  label: string
  blurb: string
}

// Single source of truth for labels/icons. Wording follows the phone
// portal's (slightly warmer than the wall's old terse labels).
export const GUEST_ACTIONS: GuestActionDef[] = [
  { kind: 'thank_you', icon: 'heart', emoji: '💌', label: 'Say thank you', blurb: 'A little note by the well' },
  { kind: 'guestbook', icon: 'clipboard', emoji: '📖', label: 'Sign the guestbook', blurb: 'Your name in the book' },
  { kind: 'note', icon: 'brain', emoji: '💭', label: 'Leave a note', blurb: 'A thought, a wish, a memory' },
  { kind: 'song', icon: 'mic', emoji: '🎵', label: 'Add a song', blurb: 'For the record player' },
  { kind: 'from', icon: 'pin', emoji: '🗺️', label: 'Where you’re from', blurb: 'A pin on the map' },
  { kind: 'find', icon: 'bell', emoji: '🔔', label: 'Find a host', blurb: 'Call Sylvia or Harry over' },
]

export const THANKS_CHIPS = ['Thank you for having us', 'What a night', 'So cozy in here', 'We’ll be back', 'This was special']

/** Guest name, remembered across visits (and shared phone↔wall). */
export function useGuestName(): [string, (v: string) => void] {
  const [name, setName] = useState('')
  useEffect(() => {
    try { setName(localStorage.getItem('4s-guest-name') ?? '') } catch { /* ignore */ }
  }, [])
  const remember = (v: string) => {
    setName(v)
    try {
      if (v.trim()) localStorage.setItem('4s-guest-name', v.trim())
      else localStorage.removeItem('4s-guest-name')
    } catch { /* ignore */ }
  }
  return [name, remember]
}

export interface GuestActionFormProps {
  token: string
  surface: 'wall' | 'phone'
  kind: GuestActionKind
  guestName: string
  onGuestName: (v: string) => void
  onBack: () => void
  onDone: () => void
  /** Host display names, for the 'find a host' picker. */
  hosts?: { name: string }[]
}

export default function GuestActionForm({ token, surface, kind, guestName, onGuestName, onBack, onDone, hosts = [] }: GuestActionFormProps) {
  const s = surface === 'phone' ? PHONE : WALL
  const def = GUEST_ACTIONS.find(a => a.kind === kind)!
  const [text, setText] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [songUrl, setSongUrl] = useState('')
  const [place, setPlace] = useState('')
  const [reason, setReason] = useState('')
  const [who, setWho] = useState<'both' | 'host1' | 'host2'>('both')
  const [pingSent, setPingSent] = useState<null | { sent: number }>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const canSubmit =
    kind === 'song' ? songTitle.trim().length > 0
      : kind === 'from' ? place.trim().length > 1
        : kind === 'find' ? reason.trim().length > 0
          : text.trim().length > 0

  const submitPing = async () => {
    setBusy(true); setErr(null)
    try {
      const res = await fetch(`/api/g/${token}/ping`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ who, reason: reason.trim(), note: text.trim() || null, guest_name: guestName.trim() || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(data.error ?? 'Something went wrong.'); setBusy(false); return }
      setPingSent({ sent: data.sent ?? 0 })
      setBusy(false)
    } catch {
      setErr('No connection — try again.')
      setBusy(false)
    }
  }

  const submit = async () => {
    if (kind === 'find') return submitPing()
    setBusy(true); setErr(null)
    const payload: Record<string, unknown> = { kind, guest_name: guestName.trim() || null }
    if (kind === 'song') { payload.title = songTitle.trim(); payload.url = songUrl.trim(); payload.body = songTitle.trim() }
    else if (kind === 'from') { payload.place = place.trim(); payload.body = place.trim() }
    else payload.body = text.trim()

    try {
      const res = await fetch(`/api/g/${token}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(data.error ?? 'Something went wrong.'); setBusy(false); return }
      onDone()
    } catch {
      setErr('No connection — try again.')
      setBusy(false)
    }
  }

  if (kind === 'find' && pingSent) {
    return (
      <div style={s.wrap}>
        <div style={{ fontSize: surface === 'phone' ? '2rem' : '1.2rem', textAlign: 'center' }}>🔔</div>
        <p style={{ ...s.err, color: surface === 'phone' ? '#6a5f52' : 'var(--text)', textAlign: 'center', fontSize: surface === 'phone' ? '0.9rem' : '0.78rem' }}>
          {pingSent.sent > 0 ? 'They’re on their way.' : 'We’ll let them know.'}
        </p>
        <button onClick={onBack} className={surface === 'wall' ? 'press' : undefined} style={s.primary}>Done</button>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <button onClick={onBack} style={s.back}>← back</button>
      {surface === 'phone' && (
        <>
          <div style={{ fontSize: '1.9rem' }}>{def.emoji}</div>
          <h2 style={PHONE.h2}>{def.label}</h2>
        </>
      )}

      {kind === 'find' && (
        <>
          {hosts.length > 1 && (
            <div style={s.chips}>
              <button onClick={() => setWho('both')} style={{ ...s.chip, ...(who === 'both' ? s.chipOn : {}) }}>Anyone</button>
              <button onClick={() => setWho('host1')} style={{ ...s.chip, ...(who === 'host1' ? s.chipOn : {}) }}>{hosts[0].name}</button>
              <button onClick={() => setWho('host2')} style={{ ...s.chip, ...(who === 'host2' ? s.chipOn : {}) }}>{hosts[1].name}</button>
            </div>
          )}
          <div style={{ ...s.chips, marginTop: hosts.length > 1 ? '0.4rem' : 0 }}>
            {PING_REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)} style={{ ...s.chip, ...(reason === r ? s.chipOn : {}) }}>{r}</button>
            ))}
          </div>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Anything to add (optional)" style={{ ...s.input, marginTop: '0.5rem' }} maxLength={140} />
        </>
      )}

      {kind === 'thank_you' && (
        <>
          <div style={s.chips}>
            {THANKS_CHIPS.map(c => (
              <button key={c} onClick={() => setText(c)} style={{ ...s.chip, ...(text === c ? s.chipOn : {}) }}>{c}</button>
            ))}
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="…or write your own" rows={3} style={s.area} maxLength={280} />
        </>
      )}

      {(kind === 'guestbook' || kind === 'note') && (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={kind === 'guestbook' ? 'A line for the book' : 'A thought, a wish, a memory'}
          rows={4}
          style={s.area}
          maxLength={280}
        />
      )}

      {kind === 'song' && (
        <>
          <input value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder="Song & artist" style={s.input} maxLength={120} />
          <input value={songUrl} onChange={e => setSongUrl(e.target.value)} placeholder="Link (optional)" style={{ ...s.input, marginTop: '0.5rem' }} maxLength={400} inputMode="url" />
        </>
      )}

      {kind === 'from' && (
        <input value={place} onChange={e => setPlace(e.target.value)} placeholder="Town, or town & country" style={s.input} maxLength={60} />
      )}

      <input
        value={guestName}
        onChange={e => onGuestName(e.target.value)}
        placeholder="Your name (optional)"
        style={{ ...s.input, marginTop: '0.7rem' }}
        autoComplete="name"
      />

      {err && <p style={s.err}>{err}</p>}

      <button
        onClick={submit}
        disabled={!canSubmit || busy}
        className={surface === 'wall' ? 'press' : undefined}
        style={{ ...s.primary, opacity: !canSubmit || busy ? 0.5 : 1 }}
      >
        {busy ? (kind === 'find' ? 'Letting them know…' : 'Leaving it…') : (kind === 'find' ? 'Let them know' : 'Leave it in the village')}
      </button>
    </div>
  )
}

type StyleSet = Record<'wrap' | 'back' | 'input' | 'area' | 'chips' | 'chip' | 'chipOn' | 'primary' | 'err' | 'h2', React.CSSProperties>

const PHONE: StyleSet = {
  wrap: {
    position: 'relative',
    background: '#fffdf7', border: '1px solid #e6d8bd', borderRadius: '20px',
    padding: '2.2rem 1.3rem 1.5rem', textAlign: 'center',
    boxShadow: '0 12px 34px rgba(120, 96, 60, 0.16)',
  },
  back: { position: 'absolute', left: '1rem', top: '1rem', background: 'none', border: 'none', color: '#a8987f', fontSize: '0.8rem', cursor: 'pointer' },
  h2: { fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.25rem', color: '#463b30', margin: '0.3rem 0 0.8rem' },
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
    marginTop: '0.9rem',
  },
  err: { color: '#b4553f', fontSize: '0.8rem', margin: '0.6rem 0 0' },
}

const WALL: StyleSet = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  back: { alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.68rem', cursor: 'pointer', padding: 0 },
  h2: {},
  input: {
    width: '100%', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '0.4rem 0.55rem', fontSize: '0.75rem', color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
  },
  area: {
    width: '100%', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '0.4rem 0.55rem', fontSize: '0.75rem', color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
    resize: 'none', marginTop: '0.4rem',
  },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '0.35rem' },
  chip: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999,
    padding: '0.3rem 0.55rem', fontSize: '0.68rem', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit',
  },
  chipOn: { background: 'var(--rose)', borderColor: 'var(--rose)', color: 'var(--bg)' },
  primary: {
    background: 'var(--rose)', color: 'var(--bg)', border: 'none', borderRadius: 10,
    padding: '0.5rem', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  err: { color: 'var(--rose)', fontSize: '0.7rem', margin: 0 },
}
