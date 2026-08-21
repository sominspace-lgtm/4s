'use client'

import { useState } from 'react'
import { useNotes, type Note } from '@/lib/hooks/useNotes'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
  padding: '0.6rem 0.75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', outline: 'none',
}

function preview(body: string): string {
  const line = body.split('\n').find(l => l.trim()) ?? ''
  return line.length > 80 ? line.slice(0, 80) + '…' : line
}

function updatedLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Apple Notes, roughly (2026-08-21): a list of cards, a full editor behind
// each one. Replaces the old Life/Domains grid — nine fixed categories, each
// holding only one-line captures with no title and no real editing — with
// one flexible list that can hold anything and actually be revised over
// time.
//
// "Everything can be shared if chosen to" is the actual design principle
// here, not a Notes-specific feature: every note has the same space_id
// null-or-set switch chores, meals, and goals already have. Toggling Share
// on a note moves it from personal (space_id null) into the household space
// — same mechanism, not a parallel one.
export default function NotesHub({ userId }: { userId: string }) {
  const { spaces } = useSharedSpaces(userId)
  const spaceId = spaces[0]?.id ?? null

  const personal = useNotes(null)
  const shared = useNotes(spaceId)
  const notes = [...personal.notes, ...shared.notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.updated_at.localeCompare(a.updated_at)
  })
  const loading = personal.loading || shared.loading

  const [openId, setOpenId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const open = notes.find(n => n.id === openId) ?? null

  // A note's home hook is whichever scope it currently lives in — personal
  // while space_id is null, shared once it isn't. Needed because update/
  // remove have to hit the right useNotes instance's Supabase call.
  function hookFor(n: Note) { return n.space_id ? shared : personal }

  function openNote(n: Note) {
    setOpenId(n.id); setDraftTitle(n.title); setDraftBody(n.body)
  }

  async function newNote() {
    const id = await personal.add()
    if (id) { setOpenId(id); setDraftTitle(''); setDraftBody('') }
  }

  async function saveOpen() {
    if (!open) return
    await hookFor(open).update(open.id, { title: draftTitle, body: draftBody })
    setOpenId(null)
  }

  async function toggleShare(n: Note) {
    // Moving scopes: remove from wherever it lives now, re-add in the other.
    // Simpler and more honest than trying to UPDATE space_id across two
    // separate useNotes instances that each own their own query — this way
    // there's exactly one code path for "a note's scope changed" regardless
    // of which direction.
    if (n.space_id) {
      await shared.update(n.id, { space_id: null })
    } else {
      if (!spaceId) return
      await personal.update(n.id, { space_id: spaceId })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 'var(--text-card)', fontFamily: 'var(--font-display)', color: 'var(--text)' }}>Notes</div>
        <button onClick={newNote} className="btn btn-primary press" style={{ fontSize: '0.72rem' }}>+ New note</button>
      </div>

      {!loading && notes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.7 }}>
          Nothing here yet. Jot down whatever's on your mind — a note is just a note, no category required.
        </div>
      )}

      <div className="grid-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.7rem' }}>
        {notes.map(n => (
          <button
            key={n.id}
            onClick={() => openNote(n)}
            className="press"
            style={{
              textAlign: 'left', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '0.8rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.3rem',
              fontFamily: 'var(--font-body)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {n.pinned && <span style={{ fontSize: '0.65rem', color: 'var(--gold)' }}>📌</span>}
              <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {n.title || 'Untitled'}
              </span>
              {n.space_id && <span title="Shared with household" style={{ fontSize: '0.62rem', color: 'var(--gold)' }}>⇆</span>}
            </div>
            {preview(n.body) && (
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {preview(n.body)}
              </div>
            )}
            <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.6 }}>{updatedLabel(n.updated_at)}</div>
          </button>
        ))}
      </div>

      {open && (
        <div
          onClick={() => setOpenId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '1rem',
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="organic"
            style={{
              width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto',
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
              padding: '1.4rem 1.5rem', boxShadow: 'var(--elev-3)',
              display: 'flex', flexDirection: 'column', gap: '0.7rem',
            }}
          >
            <input
              value={draftTitle} onChange={e => setDraftTitle(e.target.value)}
              placeholder="Title" autoFocus
              style={{ ...inputStyle, fontSize: '1rem', fontFamily: 'var(--font-display)', border: 'none', background: 'none', padding: '0.2rem 0' }}
            />
            <textarea
              value={draftBody} onChange={e => setDraftBody(e.target.value)}
              placeholder="Start writing…" rows={10}
              style={{ ...inputStyle, resize: 'vertical', border: 'none', background: 'none', padding: '0.2rem 0', lineHeight: 1.6 }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderTop: '1px solid var(--faint)', paddingTop: '0.8rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => hookFor(open).update(open.id, { pinned: !open.pinned })}
                className="press"
                style={{
                  fontSize: '0.68rem', padding: '0.3em 0.7em', borderRadius: '8px', cursor: 'pointer',
                  border: '1px solid var(--border)', background: open.pinned ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'none',
                  color: open.pinned ? 'var(--gold)' : 'var(--muted)',
                }}
              >📌 {open.pinned ? 'Pinned' : 'Pin'}</button>

              {spaceId && (
                <button
                  onClick={() => toggleShare(open)}
                  className="press"
                  style={{
                    fontSize: '0.68rem', padding: '0.3em 0.7em', borderRadius: '8px', cursor: 'pointer',
                    border: '1px solid var(--border)', background: open.space_id ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'none',
                    color: open.space_id ? 'var(--gold)' : 'var(--muted)',
                  }}
                >⇆ {open.space_id ? 'Shared' : 'Share'}</button>
              )}

              <button
                onClick={async () => { await hookFor(open).remove(open.id); setOpenId(null) }}
                className="press"
                style={{ fontSize: '0.68rem', padding: '0.3em 0.7em', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.6 }}
              >Delete</button>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                <button onClick={() => setOpenId(null)} className="press" style={{ fontSize: '0.72rem', padding: '0.4em 0.9em', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>Cancel</button>
                <button onClick={saveOpen} className="btn btn-primary press" style={{ fontSize: '0.72rem' }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
