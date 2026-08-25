'use client'

import { useState } from 'react'
import { useSmartHome, type SmartHomeDevice } from '@/lib/hooks/useSmartHome'

// Smart Home (2026-08-25) — a manual device/status list, not a real
// automation integration (no Home Assistant/IoT API exists anywhere in this
// app). Same "simple checklist" shape as House Rules and Move-In's buy-list:
// note what's connected, flip its state, group by room/category.
const CATEGORIES = ['Lights', 'Thermostat', 'Locks', 'Cameras', 'Speakers', 'Plugs', 'Other']

const input: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '0.45rem 0.6rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem', outline: 'none',
}

export default function HouseholdSmartHome({ spaceId }: { spaceId: string | null }) {
  const { devices, loading, addDevice, toggleDevice, updateNote, removeDevice } = useSmartHome(spaceId)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})
  const [editingNote, setEditingNote] = useState<Record<string, boolean>>({})

  const byCategory = new Map<string, SmartHomeDevice[]>()
  for (const d of devices) {
    const key = d.category?.trim() || 'Other'
    byCategory.set(key, [...(byCategory.get(key) ?? []), d])
  }
  const categoryNames = [...byCategory.keys()].sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))
  const onCount = devices.filter(d => d.on_state).length

  async function saveNote(d: SmartHomeDevice) {
    await updateNote(d.id, (noteDraft[d.id] ?? '').trim() || null)
    setEditingNote(e => ({ ...e, [d.id]: false }))
  }

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <div className="t-card">Smart Home</div>
        {devices.length > 0 && (
          <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>{onCount} of {devices.length} on</span>
        )}
      </div>

      {devices.length === 0 && !loading && (
        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
          Nothing added yet. Track what&rsquo;s connected — lights, locks, thermostat — and flip its state here.
        </div>
      )}

      {categoryNames.map(cat => (
        <div key={cat}>
          <div className="t-label" style={{ marginBottom: '0.3rem' }}>{cat}</div>
          {byCategory.get(cat)!.map(d => (
            <div key={d.id} style={{ borderBottom: '1px solid var(--faint)', padding: '0.35rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <button
                  onClick={() => toggleDevice(d.id, !d.on_state)}
                  aria-label={`Turn ${d.name} ${d.on_state ? 'off' : 'on'}`}
                  className="press"
                  style={{
                    width: 30, height: 18, borderRadius: 99, flexShrink: 0, cursor: 'pointer', padding: 2,
                    border: '1px solid var(--border)', position: 'relative',
                    background: d.on_state ? 'color-mix(in srgb, var(--emerald) 35%, transparent)' : 'var(--surface2)',
                  }}
                >
                  <span style={{
                    display: 'block', width: 12, height: 12, borderRadius: '50%',
                    background: d.on_state ? 'var(--emerald)' : 'var(--muted)',
                    transform: d.on_state ? 'translateX(12px)' : 'translateX(0)',
                    transition: 'transform var(--t-base, 0.15s)',
                  }} />
                </button>
                <span style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', color: 'var(--text)' }}>{d.name}</span>
                <button onClick={() => { setEditingNote(e => ({ ...e, [d.id]: !e[d.id] })); setNoteDraft(nd => ({ ...nd, [d.id]: d.note ?? '' })) }} className="press"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', opacity: 0.7, fontSize: '0.6rem', flexShrink: 0 }}>
                  {d.note ? 'note' : '+ note'}
                </button>
                <button onClick={() => removeDevice(d.id)} aria-label={`Remove ${d.name}`} className="press"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
              </div>
              {editingNote[d.id] ? (
                <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem', marginLeft: '2.2rem' }}>
                  <input value={noteDraft[d.id] ?? ''} onChange={e => setNoteDraft(nd => ({ ...nd, [d.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveNote(d) } }}
                    placeholder="e.g. 68°F, guest code 4471" style={{ ...input, flex: 1, fontSize: '0.68rem', padding: '0.25rem 0.5rem' }} autoFocus />
                  <button onClick={() => saveNote(d)} className="btn btn-ghost press" style={{ fontSize: '0.62rem', padding: '0.2rem 0.5rem' }}>Save</button>
                </div>
              ) : d.note ? (
                <div style={{ fontSize: '0.66rem', color: 'var(--muted)', opacity: 0.75, marginTop: '0.15rem', marginLeft: '2.2rem' }}>{d.note}</div>
              ) : null}
            </div>
          ))}
        </div>
      ))}

      <form
        onSubmit={async e => {
          e.preventDefault()
          if (!name.trim()) return
          await addDevice(name.trim(), category || null)
          setName(''); setCategory('')
        }}
        style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.3rem' }}
      >
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Add a device" style={{ ...input, flex: 1, minWidth: '150px' }} />
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
          <option value="">Category</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
      </form>
    </section>
  )
}
