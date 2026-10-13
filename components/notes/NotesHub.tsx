'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useNotes, type Note } from '@/lib/hooks/useNotes'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import Icon from '@/components/ui/Icon'
import NoteView from '@/components/notes/NoteView'
import CollectionsHub from '@/components/notes/CollectionsHub'
import {
  extractTags, backlinksFor, findByTitle, toggleCheckLine, checklistProgress, NOTE_TEMPLATES,
} from '@/lib/notes/markdown'

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
  padding: '0.6rem 0.75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', outline: 'none',
}

function preview(body: string): string {
  // First line that is real text, not a heading marker or an empty checkbox.
  const line = body.split('\n').map(l => l.replace(/^#{1,3}\s+/, '').replace(/^\s*[-*]\s+(\[[ xX]\]\s*)?/, '')).find(l => l.trim()) ?? ''
  return line.length > 80 ? line.slice(0, 80) + '…' : line
}

function updatedLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const toolBtn: React.CSSProperties = {
  fontSize: '0.66rem', padding: '0.25em 0.65em', borderRadius: '7px', cursor: 'pointer',
  border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontFamily: 'var(--font-body)',
}

// Notes, working a bit like a Notion page (2026-10-12) on top of the Apple-
// Notes list from 2026-08-21: start from a template, write with a small
// toolbar, flip to a read view where checklists tick and #tags / [[links]]
// are clickable, filter by tag, and see which notes link back to this one.
// It is still plain text in the same notes table, so a note can be read and
// edited anywhere.
//
// "Everything can be shared if chosen to" is still the design principle:
// every note has the same space_id null-or-set switch chores, meals, and
// goals already have.
function NotesList({ userId }: { userId: string }) {
  const { spaces, members } = useSharedSpaces(userId)
  // The space the household actually uses, not spaces[0] (which can be an
  // empty solo space) — same rule useCheckins / HouseholdHub apply.
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id ?? null

  const personal = useNotes(null)
  const shared = useNotes(spaceId)
  // Only merge the shared query once there's a real space — until spaceId
  // resolves, `shared` runs the SAME personal query as `personal` and every
  // note would render twice. Dedupe by id as a further guard.
  const notes = useMemo(() => {
    const merged = [...personal.notes, ...(spaceId ? shared.notes : [])]
    const seen = new Set<string>()
    return merged
      .filter(n => (seen.has(n.id) ? false : (seen.add(n.id), true)))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return b.updated_at.localeCompare(a.updated_at)
      })
  }, [personal.notes, shared.notes, spaceId])
  const loading = personal.loading || (!!spaceId && shared.loading)

  const [openId, setOpenId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [reading, setReading] = useState(false)
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [templates, setTemplates] = useState(false)
  const open = notes.find(n => n.id === openId) ?? null

  const titles = useMemo(() => new Set(notes.map(n => n.title.trim().toLowerCase()).filter(Boolean)), [notes])
  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const n of notes) for (const t of extractTags(n.body)) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }, [notes])
  const backlinks = open ? backlinksFor(draftTitle || open.title, notes, open.id) : []

  const shown = notes.filter(n => {
    if (tag && !extractTags(n.body).includes(tag)) return false
    const needle = q.trim().toLowerCase()
    return !needle || n.title.toLowerCase().includes(needle) || n.body.toLowerCase().includes(needle)
  })

  // A note's home hook is whichever scope it currently lives in — personal
  // while space_id is null, shared once it isn't. Needed because update/
  // remove have to hit the right useNotes instance's Supabase call.
  function hookFor(n: Note) { return n.space_id ? shared : personal }

  function openNote(n: Note, asReading?: boolean) {
    setOpenId(n.id); setDraftTitle(n.title); setDraftBody(n.body)
    setReading(asReading ?? n.body.trim().length > 0)
  }

  async function newNote(templateId = 'blank') {
    const t = NOTE_TEMPLATES.find(x => x.id === templateId) ?? NOTE_TEMPLATES[0]
    const id = await personal.add({ title: t.title, body: t.body })
    setTemplates(false)
    if (id) { setOpenId(id); setDraftTitle(t.title); setDraftBody(t.body); setReading(false) }
  }

  async function saveOpen() {
    if (!open) return
    await hookFor(open).update(open.id, { title: draftTitle, body: draftBody })
    setOpenId(null)
  }

  // Following a [[link]]: keep what was typed, then go to that note, or
  // make it if nothing has that name yet.
  async function openByTitle(title: string) {
    if (open && (draftTitle !== open.title || draftBody !== open.body)) {
      await hookFor(open).update(open.id, { title: draftTitle, body: draftBody })
    }
    const target = findByTitle(title, notes)
    if (target) { openNote(target, true); return }
    const id = await personal.add({ title, body: '' })
    if (id) { setOpenId(id); setDraftTitle(title); setDraftBody(''); setReading(false) }
  }

  // Ticking a box in the read view saves straight away, so it is never lost
  // by closing the page.
  async function toggleCheck(line: number) {
    if (!open) return
    const next = toggleCheckLine(draftBody, line)
    setDraftBody(next)
    await hookFor(open).update(open.id, { body: next })
  }

  function addToBody(snippet: string) {
    setDraftBody(b => (b && !b.endsWith('\n') ? `${b}\n${snippet}` : `${b}${snippet}`))
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

  const chip = (active: boolean): React.CSSProperties => ({
    fontSize: '0.66rem', padding: '0.22em 0.7em', borderRadius: '999px', cursor: 'pointer', fontFamily: 'var(--font-body)',
    border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
    background: active ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'transparent',
    color: active ? 'var(--gold)' : 'var(--muted)',
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 'var(--text-card)', fontFamily: 'var(--font-display)', color: 'var(--text)' }}>Notes</div>
        <div style={{ position: 'relative', display: 'flex', gap: '0.4rem' }}>
          <button onClick={() => newNote()} className="btn btn-primary press" style={{ fontSize: '0.72rem' }}>+ New note</button>
          <button onClick={() => setTemplates(t => !t)} className="btn btn-ghost press" style={{ fontSize: '0.72rem' }}>From a template</button>
          {templates && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '0.3rem', zIndex: 20, minWidth: '11rem',
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.3rem', boxShadow: 'var(--elev-3)',
            }}>
              {NOTE_TEMPLATES.filter(t => t.id !== 'blank').map(t => (
                <button key={t.id} onClick={() => newNote(t.id)} className="press" style={{
                  display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0.45rem 0.6rem', borderRadius: '7px', fontSize: '0.76rem', color: 'var(--text)', fontFamily: 'var(--font-body)',
                }}>{t.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {notes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.9rem' }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search notes" style={{ ...inputStyle, padding: '0.45rem 0.7rem', fontSize: '0.8rem' }} />
          {allTags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {allTags.map(t => <button key={t} className="press" onClick={() => setTag(tag === t ? null : t)} style={chip(tag === t)}>#{t}</button>)}
            </div>
          )}
        </div>
      )}

      {!loading && notes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.7 }}>
          Nothing here yet. Jot down whatever's on your mind, or start from a template. Add #tags to find things later and [[Note name]] to link notes together.
        </div>
      )}
      {notes.length > 0 && shown.length === 0 && (
        <div style={{ textAlign: 'center', padding: '1.2rem 0', fontSize: '0.75rem', color: 'var(--muted)' }}>No notes match.</div>
      )}

      <div className="grid-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))', gap: '0.7rem' }}>
        {shown.map(n => {
          const progress = checklistProgress(n.body)
          return (
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
                {n.pinned && <span style={{ color: 'var(--gold)', display: 'inline-flex' }}><Icon name="thumbtack" size={10} /></span>}
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
              {progress && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ flex: 1, height: 3, background: 'var(--faint)', borderRadius: 2, overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${(progress.done / progress.total) * 100}%`, background: 'var(--emerald)' }} />
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>{progress.done}/{progress.total}</span>
                </div>
              )}
              <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.6 }}>{updatedLabel(n.updated_at)}</div>
            </button>
          )
        })}
      </div>

      {open && (
        <div
          onClick={() => setOpenId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '1rem',
            background: 'var(--scrim-modal)', backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="organic"
            style={{
              width: '100%', maxWidth: 720, maxHeight: '88vh', overflowY: 'auto',
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
              padding: '1.4rem 1.5rem', boxShadow: 'var(--elev-3)',
              display: 'flex', flexDirection: 'column', gap: '0.7rem',
            }}
          >
            <input
              value={draftTitle} onChange={e => setDraftTitle(e.target.value)}
              placeholder="Title" autoFocus={!reading}
              style={{ ...inputStyle, fontSize: '1.1rem', fontFamily: 'var(--font-display)', border: 'none', background: 'none', padding: '0.2rem 0' }}
            />

            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="press" onClick={() => setReading(false)} style={chip(!reading)}>Write</button>
              <button className="press" onClick={() => setReading(true)} style={chip(reading)}>Read</button>
              {!reading && (
                <>
                  <span style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 0.2rem' }} />
                  <button className="press" style={toolBtn} onClick={() => addToBody('## ')}>Heading</button>
                  <button className="press" style={toolBtn} onClick={() => addToBody('- [ ] ')}>Checklist</button>
                  <button className="press" style={toolBtn} onClick={() => addToBody('- ')}>Bullet</button>
                  <button className="press" style={toolBtn} onClick={() => addToBody('---\n')}>Divider</button>
                  <button className="press" style={toolBtn} onClick={() => addToBody(format(new Date(), 'EEE, MMM d'))}>Today</button>
                  <button className="press" style={toolBtn} onClick={() => addToBody('[[')}>Link a note</button>
                </>
              )}
            </div>

            {reading ? (
              draftBody.trim()
                ? <NoteView body={draftBody} titles={titles} onOpenNote={openByTitle} onToggle={toggleCheck} onTag={t => { setTag(t); setOpenId(null) }} />
                : <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>Empty. Switch to Write to start.</div>
            ) : (
              <textarea
                value={draftBody} onChange={e => setDraftBody(e.target.value)}
                placeholder={'Start writing…\n\n## Heading   - [ ] checklist   #tag   [[link to another note]]'} rows={14}
                style={{ ...inputStyle, resize: 'vertical', border: 'none', background: 'none', padding: '0.2rem 0', lineHeight: 1.6 }}
              />
            )}

            {backlinks.length > 0 && (
              <div style={{ borderTop: '1px solid var(--faint)', paddingTop: '0.6rem' }}>
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.3rem' }}>Mentioned in</div>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {backlinks.map(b => <button key={b.id} className="press" style={chip(false)} onClick={() => openByTitle(b.title)}>{b.title || 'Untitled'}</button>)}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderTop: '1px solid var(--faint)', paddingTop: '0.8rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => hookFor(open).update(open.id, { pinned: !open.pinned })}
                className="press"
                style={{
                  fontSize: '0.68rem', padding: '0.3em 0.7em', borderRadius: '8px', cursor: 'pointer',
                  border: '1px solid var(--border)', background: open.pinned ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'none',
                  color: open.pinned ? 'var(--gold)' : 'var(--muted)',
                  display: 'inline-flex', alignItems: 'center', gap: '0.35em',
                }}
              ><Icon name="thumbtack" size={11} /> {open.pinned ? 'Pinned' : 'Pin'}</button>

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

// The Notes section holds two things: written pages, and Collections (small
// databases for tracking anything). Notes opens first.
export default function NotesHub({ userId }: { userId: string }) {
  const [tab, setTab] = useState<'notes' | 'collections'>('notes')
  const seg = (active: boolean): React.CSSProperties => ({
    fontSize: '0.7rem', padding: '0.3em 0.9em', borderRadius: '7px', cursor: 'pointer', border: 'none',
    fontFamily: 'var(--font-body)', background: active ? 'var(--surface)' : 'transparent', color: active ? 'var(--text)' : 'var(--muted)',
  })
  return (
    <div>
      <div style={{ display: 'flex', gap: '0.2rem', background: 'var(--hover-bg)', borderRadius: '8px', padding: '0.2rem', width: 'fit-content', marginBottom: '1rem' }}>
        <button className="press" onClick={() => setTab('notes')} style={seg(tab === 'notes')}>Notes</button>
        <button className="press" onClick={() => setTab('collections')} style={seg(tab === 'collections')}>Collections</button>
      </div>
      {tab === 'notes' ? <NotesList userId={userId} /> : <CollectionsHub userId={userId} />}
    </div>
  )
}
