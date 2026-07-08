'use client'

import { useState } from 'react'
import { useKnowledgeStore } from '@/lib/hooks/useKnowledgeStore'

interface Decision {
  id: string
  title: string
  options: string | null
  reason: string | null
  expected: string | null
  outcome: string | null
  created_at: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
  padding: '0.6rem 0.75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', outline: 'none',
}
const label: React.CSSProperties = { fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', opacity: 0.7 }

function fmt(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function DecisionCard({ d, onOutcome, onRemove }: { d: Decision; onOutcome: (v: string) => void; onRemove: () => void }) {
  const [writing, setWriting] = useState(false)
  const [draft, setDraft] = useState(d.outcome ?? '')

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '0.9rem 1rem', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500, flex: 1 }}>{d.title}</span>
        <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.7, flexShrink: 0 }}>{fmt(d.created_at)}</span>
      </div>
      {d.options && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}><span style={{ opacity: 0.65 }}>Considered · </span>{d.options}</div>}
      {d.reason && <div style={{ fontSize: '0.74rem', color: 'var(--text)', lineHeight: 1.5 }}><span style={{ color: 'var(--muted)', opacity: 0.65 }}>Why · </span>{d.reason}</div>}
      {d.expected && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}><span style={{ opacity: 0.65 }}>Expected · </span>{d.expected}</div>}

      {d.outcome ? (
        <div style={{ fontSize: '0.74rem', color: 'var(--emerald)', lineHeight: 1.5, paddingTop: '0.3rem', borderTop: '1px solid var(--faint)' }}>
          <span style={{ opacity: 0.75 }}>What actually happened · </span>{d.outcome}
        </div>
      ) : writing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <textarea autoFocus rows={2} style={{ ...inputStyle, resize: 'none' }} placeholder="What actually happened?" value={draft} onChange={e => setDraft(e.target.value)} />
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={() => { onOutcome(draft.trim()); setWriting(false) }} disabled={!draft.trim()} className="btn btn-primary" style={{ fontSize: '0.68rem' }}>Save outcome</button>
            <button onClick={() => setWriting(false)} className="btn btn-ghost" style={{ fontSize: '0.68rem' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.1rem' }}>
          <button onClick={() => setWriting(true)} className="btn btn-ghost" style={{ fontSize: '0.68rem' }}>Record outcome</button>
          <button onClick={onRemove} className="btn btn-ghost" style={{ fontSize: '0.68rem', marginLeft: 'auto', opacity: 0.6 }}>Remove</button>
        </div>
      )}
    </div>
  )
}

export default function DecisionMemory() {
  const { items, loading, add, update, remove } = useKnowledgeStore<Decision>(
    'decisions', 'id, title, options, reason, expected, outcome, created_at', '4s:decisions-changed',
  )
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', options: '', reason: '', expected: '' })

  async function save() {
    if (!form.title.trim()) return
    await add({ title: form.title.trim(), options: form.options.trim() || null, reason: form.reason.trim() || null, expected: form.expected.trim() || null })
    setForm({ title: '', options: '', reason: '', expected: '' })
    setAdding(false)
  }

  return (
    <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '1.4rem 1.5rem', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 400 }}>Decisions</div>
        <button onClick={() => setAdding(a => !a)} className="btn btn-secondary" style={{ fontSize: '0.72rem' }}>{adding ? 'Close' : '+ Log a decision'}</button>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
        Capture the thinking behind real choices — so future you never has to reason it out twice.
      </div>

      {adding && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', padding: '0.9rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--hover-bg)' }}>
          <div><div style={label}>Decision</div><input autoFocus style={inputStyle} placeholder="What did you decide?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div><div style={label}>Options considered</div><input style={inputStyle} placeholder="A, B, C…" value={form.options} onChange={e => setForm({ ...form, options: e.target.value })} /></div>
          <div><div style={label}>Why this one</div><textarea rows={2} style={{ ...inputStyle, resize: 'none' }} placeholder="The reasoning" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
          <div><div style={label}>Expected outcome</div><input style={inputStyle} placeholder="What you think will happen" value={form.expected} onChange={e => setForm({ ...form, expected: e.target.value })} /></div>
          <button onClick={save} disabled={!form.title.trim()} className="btn btn-primary" style={{ fontSize: '0.72rem', alignSelf: 'flex-start' }}>Save decision</button>
        </div>
      )}

      {loading ? null : items.length === 0 && !adding ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.8 }}>
          No decisions logged yet. The next real choice is worth remembering.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.6rem' }}>
          {items.map(d => (
            <DecisionCard key={d.id} d={d} onOutcome={v => update(d.id, { outcome: v || null })} onRemove={() => remove(d.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
