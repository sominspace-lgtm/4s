'use client'

import { useState } from 'react'
import { useKnowledgeStore } from '@/lib/hooks/useKnowledgeStore'

interface RelationshipLink {
  id: string
  label: string
  url: string
  note: string | null
  created_at: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
  padding: '0.6rem 0.75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', outline: 'none',
}

// Prefixes bare domains/usernames with https:// so "photos.google.com/..."
// works without forcing the user to type the scheme.
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function LinkCard({ l, onRemove }: { l: RelationshipLink; onRemove: () => void }) {
  let hostname = l.url
  try { hostname = new URL(l.url).hostname.replace(/^www\./, '') } catch { /* keep raw url */ }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '0.9rem 1rem', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <a href={l.url} target="_blank" rel="noopener noreferrer" style={{
          fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500, flex: 1,
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}>
          <span aria-hidden style={{ color: 'var(--gold)', fontSize: '0.75rem' }}>↗</span>
          {l.label}
        </a>
        <button onClick={onRemove} className="btn btn-ghost" style={{ fontSize: '0.62rem', opacity: 0.6, flexShrink: 0 }}>Remove</button>
      </div>
      <div style={{ fontSize: '0.66rem', color: 'var(--muted)', opacity: 0.75 }}>{hostname}</div>
      {l.note && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5 }}>{l.note}</div>}
    </div>
  )
}

// A link library for everything relationship-related that lives outside 4S —
// a shared Google Photos album, a Discord bot invite, anything else worth
// keeping one tap away instead of buried in a group chat.
export default function RelationshipLinks() {
  const { items, loading, add, remove } = useKnowledgeStore<RelationshipLink>(
    'relationship_links', 'id, label, url, note, created_at', '4s:relationship-links-changed',
  )
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: '', url: '', note: '' })

  async function save() {
    const url = normalizeUrl(form.url)
    if (!form.label.trim() || !url) return
    await add({ label: form.label.trim(), url, note: form.note.trim() || null })
    setForm({ label: '', url: '', note: '' })
    setAdding(false)
  }

  return (
    <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '1.4rem 1.5rem', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 400 }}>Relationship</div>
        <button onClick={() => setAdding(a => !a)} className="btn btn-secondary" style={{ fontSize: '0.72rem' }}>{adding ? 'Close' : '+ Add a link'}</button>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
        Everything you want one tap away — a shared photo album, a Discord bot, anything else worth keeping close.
      </div>

      {adding && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', padding: '0.9rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--hover-bg)' }}>
          <input autoFocus style={inputStyle} placeholder="Label — e.g. Google Photos album" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
          <input style={inputStyle} placeholder="Link — e.g. photos.google.com/share/..." value={form.url}
            onChange={e => setForm({ ...form, url: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') save() }}
          />
          <textarea rows={2} style={{ ...inputStyle, resize: 'none' }} placeholder="Note (optional)" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          <button onClick={save} disabled={!form.label.trim() || !form.url.trim()} className="btn btn-primary" style={{ fontSize: '0.72rem', alignSelf: 'flex-start' }}>Save link</button>
        </div>
      )}

      {loading ? null : items.length === 0 && !adding ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.8 }}>
          Nothing linked yet. Add a photo album, a Discord bot, whatever you want close.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.6rem' }}>
          {items.map(l => (
            <LinkCard key={l.id} l={l} onRemove={() => remove(l.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
