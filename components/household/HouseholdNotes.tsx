'use client'

import { useState } from 'react'
import { useNotes, type Note } from '@/lib/hooks/useNotes'

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
  padding: '0.5rem 0.7rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.8rem', outline: 'none',
}

function preview(body: string): string {
  const line = body.split('\n').find(l => l.trim()) ?? ''
  return line.length > 70 ? line.slice(0, 70) + '…' : line
}

// Household's own view of the space-shared Notes feature (2026-08-21) —
// same `notes` table and useNotes hook Personal's Notes tab already uses,
// scoped to this household's space_id only (never null/personal notes,
// there's no "your own" concept inside Household). Deliberately a lighter
// list-and-inline-editor than NotesHub's card-grid + modal, matching the
// density of the Lists/fridge-door sections next to it rather than
// reusing NotesHub wholesale, which also handles a personal scope that has
// no meaning here.
export default function HouseholdNotes({ spaceId }: { spaceId: string | null }) {
  const { notes, loading, add, update, remove } = useNotes(spaceId)
  const [openId, setOpenId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const open = notes.find(n => n.id === openId) ?? null

  function openNote(n: Note) {
    setOpenId(n.id); setDraftTitle(n.title); setDraftBody(n.body)
  }

  async function newNote() {
    if (!spaceId) return
    const id = await add()
    if (id) { setOpenId(id); setDraftTitle(''); setDraftBody('') }
  }

  async function save() {
    if (!open) return
    await update(open.id, { title: draftTitle, body: draftBody })
    setOpenId(null)
  }

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="t-card">Notes</div>
        {spaceId && <button onClick={newNote} className="btn btn-secondary press" style={{ fontSize: '0.68rem' }}>+ New note</button>}
      </div>

      {!spaceId && (
        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
          Create a space in Settings to start sharing notes here.
        </div>
      )}

      {spaceId && !loading && notes.length === 0 && (
        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
          Nothing shared yet. Notes added here are visible to the whole household.
        </div>
      )}

      {notes.map(n => (
        <button
          key={n.id}
          onClick={() => openNote(n)}
          className="press"
          style={{
            textAlign: 'left', cursor: 'pointer', background: 'var(--hover-bg)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '0.6rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.15rem',
            fontFamily: 'var(--font-body)',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{n.title || 'Untitled'}</span>
          {preview(n.body) && <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{preview(n.body)}</span>}
        </button>
      ))}

      {open && (
        <div onClick={() => setOpenId(null)} style={{
          position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        }}>
          <div onClick={e => e.stopPropagation()} className="organic" style={{
            width: '100%', maxWidth: 460, background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '1.2rem 1.3rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
          }}>
            <input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} placeholder="Title"
              style={{ ...inputStyle, fontSize: '0.95rem', fontFamily: 'var(--font-display)', border: 'none', background: 'none', padding: '0.2rem 0' }} autoFocus />
            <textarea value={draftBody} onChange={e => setDraftBody(e.target.value)} placeholder="Start writing…" rows={6}
              style={{ ...inputStyle, resize: 'vertical', border: 'none', background: 'none', padding: '0.2rem 0', lineHeight: 1.6 }} />
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', borderTop: '1px solid var(--faint)', paddingTop: '0.7rem' }}>
              <button onClick={async () => { await remove(open.id); setOpenId(null) }} className="press"
                style={{ fontSize: '0.68rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.6, marginRight: 'auto' }}>Delete</button>
              <button onClick={() => setOpenId(null)} className="press" style={{ fontSize: '0.72rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>Cancel</button>
              <button onClick={save} className="btn btn-primary press" style={{ fontSize: '0.72rem' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
