'use client'

import { useState } from 'react'
import { newItemId, sectionsOf, type RoutineItem } from '@/lib/routines/items'

// Edit any routine (2026-10-15): its name, how often, and every step. Steps
// sit in sections ("5:30 AM, Wake up"), each of which can be moved, renamed or
// removed; a step can also be a note, a line to read rather than tick.

interface Section { key: string; time: string; group: string; steps: RoutineItem[] }

const field: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)',
  fontFamily: 'var(--font-body)', fontSize: '0.85rem', padding: '0.5rem 0.65rem', outline: 'none', minWidth: 0,
}
const tiny: React.CSSProperties = {
  minWidth: 36, minHeight: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent',
  color: 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-body)', flexShrink: 0,
}

function move<T>(list: T[], i: number, by: number): T[] {
  const j = i + by
  if (j < 0 || j >= list.length) return list
  const out = [...list]; [out[i], out[j]] = [out[j], out[i]]; return out
}

export default function RoutineEditor({ name: initialName, cadenceDays, items, onSave, onCancel, onDelete }: {
  name: string; cadenceDays: number; items: RoutineItem[]
  onSave: (patch: { name: string; cadence_days: number; items: RoutineItem[] }) => Promise<string | null>
  onCancel: () => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initialName)
  const [cadence, setCadence] = useState(String(cadenceDays))
  const [sections, setSections] = useState<Section[]>(() => {
    const s = sectionsOf(items).map(x => ({ key: x.key, time: x.time ?? '', group: x.group ?? '', steps: x.items }))
    return s.length ? s : [{ key: 'new', time: '', group: '', steps: [] }]
  })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const setSection = (i: number, patch: Partial<Section>) => setSections(prev => prev.map((s, k) => (k === i ? { ...s, ...patch } : s)))
  const setStep = (si: number, ti: number, patch: Partial<RoutineItem>) =>
    setSection(si, { steps: sections[si].steps.map((t, k) => (k === ti ? { ...t, ...patch } : t)) })

  async function save() {
    if (!name.trim()) { setErr('Give it a name.'); return }
    const flat: RoutineItem[] = sections.flatMap(s => s.steps
      .filter(t => t.label.trim())
      .map(t => ({ ...t, label: t.label.trim(), group: s.group.trim() || null, time: s.time.trim() || null })))
    setBusy(true)
    const e = await onSave({ name: name.trim(), cadence_days: Math.max(1, Number(cadence) || 1), items: flat })
    setBusy(false)
    if (e) setErr(e)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Routine name" style={{ ...field, fontSize: '0.95rem' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
        Every <input type="number" min={1} value={cadence} onChange={e => setCadence(e.target.value)} style={{ ...field, width: '4.5rem' }} /> {cadence === '1' ? 'day' : 'days'}
      </div>

      {sections.map((s, si) => (
        <div key={s.key} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <input value={s.time} onChange={e => setSection(si, { time: e.target.value })} placeholder="When (5:30 AM)" style={{ ...field, flex: '1 1 7rem' }} />
            <input value={s.group} onChange={e => setSection(si, { group: e.target.value })} placeholder="Section (Wake up)" style={{ ...field, flex: '2 1 10rem' }} />
          </div>
          {s.steps.map((t, ti) => (
            <div key={t.id} style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
              <input value={t.label} onChange={e => setStep(si, ti, { label: e.target.value })}
                placeholder={t.note ? 'A line to remember' : 'Step'} style={{ ...field, flex: 1, fontStyle: t.note ? 'italic' : 'normal' }} />
              <button type="button" style={tiny} aria-label="Move up" onClick={() => setSection(si, { steps: move(s.steps, ti, -1) })}>↑</button>
              <button type="button" style={tiny} aria-label="Move down" onClick={() => setSection(si, { steps: move(s.steps, ti, 1) })}>↓</button>
              <button type="button" style={{ ...tiny, color: 'var(--rose)' }} aria-label="Remove step" onClick={() => setSection(si, { steps: s.steps.filter((_, k) => k !== ti) })}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button type="button" style={{ ...tiny, padding: '0 0.8rem' }} onClick={() => setSection(si, { steps: [...s.steps, { id: newItemId(), label: '', done: false }] })}>+ Step</button>
            <button type="button" style={{ ...tiny, padding: '0 0.8rem' }} onClick={() => setSection(si, { steps: [...s.steps, { id: newItemId(), label: '', done: false, note: true }] })}>+ Note</button>
            <span style={{ flex: 1 }} />
            <button type="button" style={tiny} aria-label="Move section up" onClick={() => setSections(prev => move(prev, si, -1))}>↑</button>
            <button type="button" style={tiny} aria-label="Move section down" onClick={() => setSections(prev => move(prev, si, 1))}>↓</button>
            <button type="button" style={{ ...tiny, padding: '0 0.7rem', color: 'var(--rose)' }}
              onClick={() => { if (s.steps.length === 0 || window.confirm('Remove this section and its steps?')) setSections(prev => prev.filter((_, k) => k !== si)) }}>Remove section</button>
          </div>
        </div>
      ))}
      <button type="button" style={{ ...tiny, alignSelf: 'flex-start', padding: '0 0.9rem' }}
        onClick={() => setSections(prev => [...prev, { key: newItemId(), time: '', group: '', steps: [{ id: newItemId(), label: '', done: false }] }])}>+ Section</button>

      {err && <div style={{ fontSize: '0.8rem', color: 'var(--rose)' }}>{err}</div>}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" disabled={busy} onClick={save} className="btn btn-primary press" style={{ minHeight: 44 }}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={onCancel} className="btn btn-ghost press" style={{ minHeight: 44 }}>Cancel</button>
        {onDelete && <button type="button" onClick={onDelete} className="btn btn-ghost press" style={{ minHeight: 44, color: 'var(--rose)', marginLeft: 'auto' }}>Delete routine</button>}
      </div>
    </div>
  )
}
