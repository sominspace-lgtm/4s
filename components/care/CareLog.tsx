'use client'

import { useEffect, useRef, useState } from 'react'
import IconButton from '@/components/ui/IconButton'
import { useCareLog } from '@/lib/hooks/useCareLog'
import { CARE_TYPES, careSubjectName, careDue, type CareSubject, type CareTask } from '@/lib/utils/careTypes'

// The care log for one subject — Somi (household) or yourself (personal).
// A row of quick-log buttons, a one-line "today" summary, and the history
// grouped by day. Deliberately low-ceremony, like the chores it replaces:
// tap "Fed", it's logged, move on. No streaks, no score.
export default function CareLog({ subject, compact = false }: {
  subject: CareSubject
  /** Home-block use: drop the heading, the parent block already has one. */
  compact?: boolean
}) {
  const { entries, loading, log, remove, tasks, canEditTasks, saveTasks, doneToday, lastByKind, gentleHints, canShare } = useCareLog(subject)
  const presets = CARE_TYPES[subject]
  const labelOf = (kind: string) => tasks.find(t => t.kind === kind)?.label ?? kind
  const [editing, setEditing] = useState<{ list: CareTask[]; removed: CareTask[]; adding: string } | null>(null)
  const [editErr, setEditErr] = useState<string | null>(null)
  const [pending, setPending] = useState<{ kind: string; label: string; detail: string } | null>(null)
  const [custom, setCustom] = useState('')

  // After you tap a care task it's logged straight away (the "last done"
  // clock resets to today). A misfire is one tap to undo — this holds the
  // just-created entry for a few seconds so Undo has something to delete.
  const [undo, setUndo] = useState<{ id: string; label: string } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current) }, [])

  const doLog = async (kind: string, label: string, opts?: { detail?: string }) => {
    const res = await log(kind, opts)
    if (res.entry) {
      setUndo({ id: res.entry.id, label })
      if (undoTimer.current) clearTimeout(undoTimer.current)
      undoTimer.current = setTimeout(() => setUndo(null), 7000)
    }
  }
  const runUndo = () => {
    if (!undo) return
    void remove(undo.id)
    setUndo(null)
    if (undoTimer.current) clearTimeout(undoTimer.current)
  }

  // Custom actions (2026-09-08, "we should be able to add more") — any kind
  // you've logged before that isn't a preset becomes its own reusable
  // button. Adding one is just: type it in the free-text box once.
  // Since 2026-10-16 the list itself is editable (care_tasks): renamed,
  // reordered, hidden, or given an "every N days" rhythm like a chore.
  const types = tasks.filter(t => !t.hidden)

  // Care is tracked by day, not by the minute (2026-09-08) — a rough
  // "when was this last done" is all that's useful.
  const relDay = (iso: string) => {
    const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const days = Math.round((startOf(new Date()) - startOf(new Date(iso))) / 86_400_000)
    if (days <= 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days}d ago`
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  const dayKey = (iso: string) => {
    const d = new Date(iso)
    const t = new Date()
    if (d.toDateString() === t.toDateString()) return 'Today'
    const y = new Date(t); y.setDate(t.getDate() - 1)
    if (d.toDateString() === y.toDateString()) return 'Yesterday'
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  }

  const groups: { day: string; items: typeof entries }[] = []
  for (const e of entries) {
    const day = dayKey(e.logged_at)
    const g = groups.find(x => x.day === day)
    if (g) g.items.push(e); else groups.push({ day, items: [e] })
  }

  // "usually about every N days/weeks" — a plain reading of the log's own
  // rhythm, never a countdown or a warning.
  const everyPhrase = (days: number) => {
    if (days >= 12) { const w = Math.round(days / 7); return `about every ${w} week${w === 1 ? '' : 's'}` }
    if (days === 1) return 'about daily'
    return `about every ${days} days`
  }
  const agoPhrase = (days: number) => {
    if (days >= 12) { const w = Math.round(days / 7); return `${w} week${w === 1 ? '' : 's'} ago` }
    if (days === 1) return 'yesterday'
    return `${days} days ago`
  }

  const quickLog = (kind: string, label: string, detail?: string) => {
    if (detail) { setPending({ kind, label, detail }); return }
    void doLog(kind, label)
  }
  const lastLabel = (kind: string) => (lastByKind[kind] ? relDay(lastByKind[kind].logged_at) : 'not yet')

  const pill = (active: boolean): React.CSSProperties => ({
    fontSize: '0.72rem', fontFamily: 'inherit', cursor: 'pointer', padding: '0.3rem 0.6rem', borderRadius: 999,
    border: `1px solid ${active ? 'var(--emerald)' : 'var(--border)'}`,
    background: active ? 'color-mix(in srgb, var(--emerald) 14%, transparent)' : 'var(--surface)',
    color: active ? 'var(--emerald)' : 'var(--text)', whiteSpace: 'nowrap',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {!compact && (
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>
          {careSubjectName(subject)}{subject === 'somi' ? "'s care" : ''}
        </div>
      )}

      {!canShare && (
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontStyle: 'italic' }}>
          Set up a shared space to log Somi&rsquo;s care with your partner.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="press" onClick={() => { setEditErr(null); setEditing(editing ? null : { list: tasks.filter(t => !t.hidden), removed: [], adding: '' }) }}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.74rem', cursor: 'pointer', minHeight: 36, padding: '0 0.3rem', fontFamily: 'inherit' }}>
          {editing ? 'Cancel' : '✎ Edit tasks'}
        </button>
      </div>

      {editing && (() => {
        const setList = (list: CareTask[]) => setEditing({ ...editing, list })
        const patch = (i: number, p: Partial<CareTask>) => setList(editing.list.map((t, k) => (k === i ? { ...t, ...p } : t)))
        const move = (i: number, by: number) => {
          const j = i + by
          if (j < 0 || j >= editing.list.length) return
          const l = [...editing.list]; [l[i], l[j]] = [l[j], l[i]]; setList(l)
        }
        const hiddenNow = [...tasks.filter(t => t.hidden && !editing.list.some(x => x.kind === t.kind)), ...editing.removed]
        const field: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.45rem 0.55rem', fontSize: '0.85rem', color: 'var(--text)', outline: 'none', fontFamily: 'inherit', minWidth: 0 }
        const sq: React.CSSProperties = { minWidth: 36, minHeight: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }
        const addNew = () => {
          const label = editing.adding.trim()
          if (!label || editing.list.some(t => t.label.toLowerCase() === label.toLowerCase())) return
          setEditing({ ...editing, list: [...editing.list, { id: null, kind: label, label, detail: null, every_days: null, hidden: false, builtin: false }], adding: '' })
        }
        if (!canEditTasks) {
          return <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>Editing care tasks needs one more step on the server first (the care_tasks SQL). Until then the built-in list stays as it is.</div>
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {editing.list.map((t, i) => (
              <div key={t.kind} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', padding: '0.45rem', border: '1px solid var(--border)', borderRadius: 10 }}>
                <input value={t.label} onChange={e => patch(i, { label: e.target.value })} style={{ ...field, flex: '1 1 10rem' }} aria-label="Name" />
                <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>every</span>
                <input type="number" min={1} value={t.every_days ?? ''} placeholder="–" onChange={e => patch(i, { every_days: e.target.value ? Number(e.target.value) : null })}
                  style={{ ...field, width: '4rem' }} aria-label="Every how many days" />
                <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>days</span>
                <button type="button" style={sq} aria-label="Move up" onClick={() => move(i, -1)}>↑</button>
                <button type="button" style={sq} aria-label="Move down" onClick={() => move(i, 1)}>↓</button>
                <button type="button" style={{ ...sq, color: 'var(--rose)' }} aria-label={`Remove ${t.label}`}
                  onClick={() => setEditing({ ...editing, list: editing.list.filter((_, k) => k !== i), removed: [...editing.removed, t] })}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <input value={editing.adding} onChange={e => setEditing({ ...editing, adding: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') addNew() }} placeholder="Add a care task" style={{ ...field, flex: 1 }} />
              <button type="button" className="btn btn-secondary press" style={{ minHeight: 40 }} onClick={addNew}>Add</button>
            </div>
            {hiddenNow.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', fontSize: '0.74rem', color: 'var(--muted)' }}>
                Hidden:
                {hiddenNow.map(t => (
                  <button key={t.kind} type="button" className="press" style={{ ...pill(false), minHeight: 32 }}
                    onClick={() => setEditing({ ...editing, list: [...editing.list, { ...t, hidden: false }], removed: editing.removed.filter(x => x.kind !== t.kind) })}>
                    + {t.label}
                  </button>
                ))}
              </div>
            )}
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5 }}>Give a task a number of days and it shows when it is due, like a chore. Leave it blank to just log it whenever.</div>
            {editErr && <div style={{ fontSize: '0.78rem', color: 'var(--rose)' }}>{editErr}</div>}
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button type="button" className="btn btn-primary press" style={{ minHeight: 44 }}
                onClick={async () => {
                  const e = await saveTasks(editing.list, editing.removed.filter(r => !editing.list.some(t => t.kind === r.kind)))
                  if (e) setEditErr(e); else setEditing(null)
                }}>Save</button>
              <button type="button" className="btn btn-ghost press" style={{ minHeight: 44 }} onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        )
      })()}

      {/* Quick-log buttons — each shows when it was last done; tapping logs
          it now and resets that to "today". */}
      {!editing && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {types.map(t => (
          <button key={t.kind} className="press" onClick={() => quickLog(t.kind, t.label, t.detail ?? undefined)} style={pill(doneToday.has(t.kind))}>
            {t.label}
            <span style={{ opacity: 0.6, marginLeft: '0.3em' }}>· {lastLabel(t.kind)}</span>
            {(() => {
              const d = careDue(t.every_days, lastByKind[t.kind]?.logged_at)
              if (d === null || doneToday.has(t.kind)) return null
              const text = d < 0 ? `${-d}d overdue` : d === 0 ? 'due today' : `due in ${d}d`
              return <span style={{ marginLeft: '0.3em', color: d < 0 ? 'var(--rose)' : d === 0 ? 'var(--amber)' : 'var(--muted)' }}>· {text}</span>
            })()}
          </button>
        ))}
      </div>}

      {/* Undo the tap you just made */}
      {undo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem',
          color: 'var(--muted)', padding: '0.35rem 0.5rem', borderRadius: 8,
          background: 'color-mix(in srgb, var(--emerald) 10%, var(--surface))',
          border: '1px solid color-mix(in srgb, var(--emerald) 22%, var(--border))',
        }}>
          <span style={{ flex: 1 }}>Logged {undo.label}.</span>
          <button onClick={runUndo} className="press" style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 999,
            padding: '0.2rem 0.7rem', fontSize: '0.7rem', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit', minHeight: 30,
          }}>Undo</button>
        </div>
      )}

      {/* Gentle rhythm hints — read from the log, never a badge or a count */}
      {gentleHints.length > 0 && (
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
          {(() => {
            const hint = gentleHints[0]
            const label = labelOf(hint.kind)
            const more = gentleHints.length > 1 ? `, and ${gentleHints.length - 1} more` : ''
            return `${label} is usually ${everyPhrase(hint.typical)}. Last done ${agoPhrase(hint.elapsed)}${more}.`
          })()}
        </div>
      )}

      {/* Free-text one-off */}
      <div style={{ display: 'flex', gap: '0.3rem' }}>
        <input
          value={custom} onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && custom.trim()) { void doLog(custom.trim(), custom.trim()); setCustom('') } }}
          placeholder={presets.length ? 'Something else…' : 'Add something to track'}
          style={{
            flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '0.35rem 0.55rem', fontSize: '0.74rem', color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button className="press" disabled={!custom.trim()} aria-label="Log"
          onClick={() => { if (custom.trim()) { void doLog(custom.trim(), custom.trim()); setCustom('') } }}
          style={{
            background: 'var(--gold)', color: 'var(--bg)', border: 'none', borderRadius: 8,
            padding: '0 0.7rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, opacity: custom.trim() ? 1 : 0.5,
          }}>+</button>
      </div>

      {/* Detail prompt */}
      {pending && (
        <div style={{
          display: 'flex', gap: '0.3rem', alignItems: 'center', padding: '0.4rem 0.5rem',
          background: 'color-mix(in srgb, var(--gold) 9%, var(--surface))', border: '1px solid color-mix(in srgb, var(--gold) 24%, var(--border))', borderRadius: 8,
        }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{pending.label}:</span>
          <input
            autoFocus value={pending.detail}
            onChange={e => setPending({ ...pending, detail: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter') { void doLog(pending.kind, pending.label, { detail: pending.detail }); setPending(null) }
              if (e.key === 'Escape') setPending(null)
            }}
            placeholder={tasks.find(t => t.kind === pending.kind)?.detail ?? undefined}
            style={{
              flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '0.25rem 0.45rem', fontSize: '0.72rem', color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button className="press" onClick={() => { void doLog(pending.kind, pending.label, { detail: pending.detail }); setPending(null) }}
            style={{ background: 'var(--gold)', color: 'var(--bg)', border: 'none', borderRadius: 6, padding: '0.25rem 0.55rem', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>
            Log
          </button>
        </div>
      )}

      {/* History */}
      {loading && entries.length === 0 ? null : entries.length === 0 ? (
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic' }}>
          Nothing logged yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: compact ? '14rem' : '22rem', overflowY: 'auto' }}>
          {groups.map(g => (
            <div key={g.day}>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.65, marginBottom: '0.2rem' }}>
                {g.day}
              </div>
              {g.items.map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', padding: '0.12rem 0', fontSize: '0.74rem' }}>
                  <span style={{ color: 'var(--text)' }}>{labelOf(e.kind)}</span>
                  {e.detail && <span style={{ color: 'var(--muted)' }}>{e.detail}</span>}
                  <div style={{ flex: 1 }} />
                  <IconButton label="Remove" onClick={() => remove(e.id)} size={10} style={{ opacity: 0.35 }}>✕</IconButton>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
