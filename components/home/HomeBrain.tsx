'use client'

import { useState } from 'react'
import { useKnowledgeStore } from '@/lib/hooks/useKnowledgeStore'

interface Fact {
  id: string
  label: string
  value: string
  category: string | null
  created_at: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
  padding: '0.6rem 0.75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', outline: 'none',
}

const CATEGORIES = ['Utilities', 'Wi-Fi & tech', 'Appliances', 'Maintenance', 'Documents', 'Emergency', 'Other']

function FactRow({ f, onRemove }: { f: Fact; onRemove: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', padding: '0.55rem 0.2rem', borderBottom: '1px solid var(--faint)' }}>
      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', width: '9rem', flexShrink: 0 }}>{f.label}</span>
      <span style={{ fontSize: '0.8rem', color: 'var(--text)', flex: 1, wordBreak: 'break-word' }}>{f.value}</span>
      <button onClick={onRemove} aria-label="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: hover ? 0.5 : 0, fontSize: '0.7rem', transition: 'opacity var(--t-fast)' }}>✕</button>
    </div>
  )
}

export default function HomeBrain() {
  const { items, loading, add, remove } = useKnowledgeStore<Fact>(
    'home_facts', 'id, label, value, category, created_at', '4s:home-facts-changed',
  )
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: '', value: '', category: CATEGORIES[0] })

  async function save() {
    if (!form.label.trim() || !form.value.trim()) return
    await add({ label: form.label.trim(), value: form.value.trim(), category: form.category })
    setForm({ label: '', value: '', category: form.category })
    setAdding(false)
  }

  // Group by category, preserving a friendly order.
  const groups = CATEGORIES
    .map(cat => ({ cat, rows: items.filter(f => (f.category ?? 'Other') === cat) }))
    .filter(g => g.rows.length > 0)

  return (
    <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '1.4rem 1.5rem', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 400 }}>Home Brain</div>
        <button onClick={() => setAdding(a => !a)} className="btn btn-secondary" style={{ fontSize: '0.72rem' }}>{adding ? 'Close' : '+ Add a detail'}</button>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
        The household details you always have to hunt for — Wi-Fi, serial numbers, paint colors, who to call.
      </div>

      {adding && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', padding: '0.9rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--hover-bg)' }}>
          <input autoFocus style={inputStyle} placeholder="Label (e.g. Wi-Fi password)" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
          <input style={inputStyle} placeholder="Value" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') save() }} />
          <select style={inputStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={save} disabled={!form.label.trim() || !form.value.trim()} className="btn btn-primary" style={{ fontSize: '0.72rem', alignSelf: 'flex-start' }}>Save</button>
        </div>
      )}

      {loading ? null : items.length === 0 && !adding ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.8 }}>
          Nothing stored yet. Add the first detail you never want to search for again.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {groups.map(g => (
            <div key={g.cat}>
              <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', opacity: 0.7, marginBottom: '0.2rem' }}>{g.cat}</div>
              {g.rows.map(f => <FactRow key={f.id} f={f} onRemove={() => remove(f.id)} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
