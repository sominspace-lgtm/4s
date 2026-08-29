'use client'

import { useState } from 'react'
import type { Gathering, GuestContribution, GatheringMemory } from '@/lib/hooks/useGathering'

// The host's Guest Mode panel — opened from the "Manage" button on the
// in-scene strip, never shown by default. Music playlist + photo album
// setup, guest moderation, and "end the gathering" → the keepsake editor.
// A panel, not a dashboard: everything here is host-only and one deliberate
// tap away.

const KIND_LABEL: Record<string, string> = {
  thank_you: 'Thank you', guestbook: 'Guestbook', note: 'Note',
  song: 'Song', from: 'From', fridge: 'Fridge', photo: 'Photo',
}

export default function VillageGuestPanel({
  gathering, contributions, guestUrl, qrDataUri, memories,
  onClose, onSetMusicUrl, onSetPhotoAlbumUrl, onModerate, onRemoveContribution,
  onCloseGathering, onUpdateMemory, onDeleteMemory,
}: {
  gathering: Gathering
  contributions: GuestContribution[]
  guestUrl: string | null
  qrDataUri: string | null
  memories: GatheringMemory[]
  onClose: () => void
  onSetMusicUrl?: (url: string) => void
  onSetPhotoAlbumUrl?: (url: string) => void
  onModerate?: (id: string, status: 'visible' | 'hidden') => void
  onRemoveContribution?: (id: string) => void
  onCloseGathering?: () => void | Promise<GatheringMemory | null>
  onUpdateMemory?: (id: string, patch: Partial<Pick<GatheringMemory, 'title' | 'summary' | 'status'>>) => void
  onDeleteMemory?: (id: string) => void
}) {
  const [music, setMusic] = useState(gathering.music_url ?? '')
  const [album, setAlbum] = useState(gathering.photo_album_url ?? '')
  const [ending, setEnding] = useState(false)
  const [recap, setRecap] = useState<GatheringMemory | null>(null)

  const endGathering = async () => {
    if (!onCloseGathering) return
    setEnding(true)
    const mem = await onCloseGathering()
    setEnding(false)
    if (mem) setRecap(mem)
    else onClose()
  }

  if (recap) {
    return <RecapEditor memory={recap} onSave={onUpdateMemory} onClose={onClose} />
  }

  return (
    <Shell onClose={onClose} title={gathering.title}>
      {/* Scan */}
      <Row>
        {qrDataUri && <img src={qrDataUri} alt="" width={54} height={54} style={{ borderRadius: 6, flexShrink: 0 }} />}
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          Guests scan the welcome sign in the village — or share{' '}
          {guestUrl && <button onClick={() => { try { navigator.clipboard?.writeText(guestUrl) } catch { /* */ } }} style={S.link}>this link</button>}.
        </div>
      </Row>

      <Field label="Music playlist" hint="Paste a Spotify or YouTube playlist link — it becomes the player guests see.">
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <input value={music} onChange={e => setMusic(e.target.value)} placeholder="https://open.spotify.com/playlist/…" style={S.input} />
          <button onClick={() => onSetMusicUrl?.(music)} style={S.save}>Save</button>
        </div>
      </Field>

      <Field label="Photo album" hint="A shared album guests add their photos to. The 📸 button opens this.">
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <input value={album} onChange={e => setAlbum(e.target.value)} placeholder="https://photos.app.goo.gl/…" style={S.input} />
          <button onClick={() => onSetPhotoAlbumUrl?.(album)} style={S.save}>Save</button>
        </div>
      </Field>

      {/* Moderation */}
      <div style={{ marginTop: '0.9rem' }}>
        <div style={S.sectionLabel}>What guests have left ({contributions.filter(c => c.status === 'visible').length})</div>
        <div style={{ maxHeight: '11rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {contributions.length === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', padding: '0.4rem 0' }}>Nothing yet.</div>}
          {contributions.slice().reverse().map(c => (
            <div key={c.id} style={{ ...S.modRow, opacity: c.status === 'hidden' ? 0.5 : 1 }}>
              <span style={S.badge}>{KIND_LABEL[c.kind] ?? c.kind}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: '0.73rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(c.meta.title as string) || (c.meta.place as string) || c.body || '—'}
                {c.guest_name && <span style={{ color: 'var(--muted)' }}> · {c.guest_name}</span>}
              </span>
              <button
                onClick={() => onModerate?.(c.id, c.status === 'visible' ? 'hidden' : 'visible')}
                title={c.status === 'visible' ? 'Hide from the village' : 'Show again'}
                style={S.iconBtn}
              >{c.status === 'visible' ? '🙈' : '👁'}</button>
              <button onClick={() => { if (confirm('Delete this for good?')) onRemoveContribution?.(c.id) }} title="Delete" style={S.iconBtn}>🗑</button>
            </div>
          ))}
        </div>
      </div>

      {/* End */}
      <button onClick={endGathering} disabled={ending} style={{ ...S.endBtn, opacity: ending ? 0.6 : 1 }}>
        {ending ? 'Saving the keepsake…' : 'End the gathering'}
      </button>
      <p style={{ fontSize: '0.66rem', color: 'var(--muted)', textAlign: 'center', margin: '0.4rem 0 0' }}>
        The village goes back to normal and a keepsake is saved.
      </p>

      {memories.length > 0 && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.7rem' }}>
          <div style={S.sectionLabel}>Past gatherings</div>
          {memories.slice(0, 5).map(m => (
            <div key={m.id} style={S.modRow}>
              <span style={{ flex: 1, fontSize: '0.73rem', color: 'var(--text)' }}>
                {m.title.replace('Tonight at the Village — ', '')} · {m.happened_on}
              </span>
              <button onClick={() => onUpdateMemory?.(m.id, { status: m.status === 'visible' ? 'hidden' : 'visible' })} style={S.iconBtn}>
                {m.status === 'visible' ? '🙈' : '👁'}
              </button>
              <button onClick={() => { if (confirm('Delete this keepsake?')) onDeleteMemory?.(m.id) }} style={S.iconBtn}>🗑</button>
            </div>
          ))}
        </div>
      )}
    </Shell>
  )
}

function RecapEditor({ memory, onSave, onClose }: {
  memory: GatheringMemory
  onSave?: (id: string, patch: Partial<Pick<GatheringMemory, 'title' | 'summary'>>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(memory.title)
  const s = memory.summary
  const [keepMsgs, setKeepMsgs] = useState<boolean[]>((s.messages ?? []).map(() => true))
  const [keepSongs, setKeepSongs] = useState<boolean[]>((s.songs ?? []).map(() => true))

  const save = () => {
    onSave?.(memory.id, {
      title,
      summary: {
        ...s,
        messages: (s.messages ?? []).filter((_, i) => keepMsgs[i]),
        songs: (s.songs ?? []).filter((_, i) => keepSongs[i]),
      },
    })
    onClose()
  }

  return (
    <Shell onClose={onClose} title="Tonight at the Village">
      <input value={title} onChange={e => setTitle(e.target.value)} style={{ ...S.input, fontSize: '0.9rem', marginBottom: '0.6rem' }} />
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.8rem' }}>
        {s.guests?.length ? `${s.guests.length} guest${s.guests.length === 1 ? '' : 's'}` : 'A quiet one'}
        {s.fromPlaces?.length ? ` · from ${s.fromPlaces.slice(0, 4).join(', ')}` : ''}
        {s.photoCount ? ` · ${s.photoCount} photo${s.photoCount === 1 ? '' : 's'}` : ''}
      </div>

      {(s.messages ?? []).length > 0 && (
        <div style={{ marginBottom: '0.7rem' }}>
          <div style={S.sectionLabel}>Messages to keep</div>
          {(s.messages ?? []).map((m, i) => (
            <label key={i} style={S.checkRow}>
              <input type="checkbox" checked={keepMsgs[i]} onChange={e => setKeepMsgs(k => k.map((v, j) => (j === i ? e.target.checked : v)))} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text)' }}>“{m.text}”{m.name && <span style={{ color: 'var(--muted)' }}> — {m.name}</span>}</span>
            </label>
          ))}
        </div>
      )}

      {(s.songs ?? []).length > 0 && (
        <div style={{ marginBottom: '0.7rem' }}>
          <div style={S.sectionLabel}>Songs</div>
          {(s.songs ?? []).map((song, i) => (
            <label key={i} style={S.checkRow}>
              <input type="checkbox" checked={keepSongs[i]} onChange={e => setKeepSongs(k => k.map((v, j) => (j === i ? e.target.checked : v)))} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text)' }}>{song}</span>
            </label>
          ))}
        </div>
      )}

      <button onClick={save} style={S.endBtn}>Save the keepsake</button>
    </Shell>
  )
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.panel} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontFamily: 'var(--font-display, var(--font-body))', color: 'var(--text)' }}>{title}</h3>
          <button onClick={onClose} style={{ ...S.iconBtn, fontSize: '0.9rem' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.8rem' }}>{children}</div>
}
function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.8rem' }}>
      <div style={S.sectionLabel}>{label}</div>
      {children}
      <div style={{ fontSize: '0.64rem', color: 'var(--muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>{hint}</div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'absolute', inset: 0, zIndex: 20,
    background: 'color-mix(in srgb, var(--text) 30%, transparent)', backdropFilter: 'blur(2px)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1rem',
    overflowY: 'auto',
  },
  panel: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
    padding: '1.1rem', width: 'min(24rem, 100%)', boxShadow: '0 20px 50px color-mix(in srgb, var(--text) 25%, transparent)',
    fontFamily: 'var(--font-body)', marginTop: '1rem',
  },
  sectionLabel: { fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.35rem' },
  input: {
    flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '0.5rem 0.6rem',
    border: '1px solid var(--border)', borderRadius: '9px', fontSize: '0.78rem',
    background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit', width: '100%',
  },
  save: { background: 'var(--gold)', color: 'var(--bg)', border: 'none', borderRadius: '9px', padding: '0 0.7rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 },
  link: { background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 'inherit', padding: 0, textDecoration: 'underline' },
  modRow: { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.4rem', background: 'var(--bg)', borderRadius: '8px' },
  badge: { fontSize: '0.58rem', color: 'var(--muted)', background: 'var(--hover-bg, color-mix(in srgb, var(--text) 8%, transparent))', borderRadius: '5px', padding: '0.1rem 0.3rem', flexShrink: 0 },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '0.15rem', lineHeight: 1, flexShrink: 0 },
  endBtn: {
    width: '100%', marginTop: '1rem', padding: '0.65rem', border: 'none', borderRadius: '11px',
    background: 'var(--gold)', color: 'var(--bg)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
  },
  checkRow: { display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.25rem 0', cursor: 'pointer' },
}
