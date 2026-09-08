'use client'

import { useEffect, useRef, useState } from 'react'
import IconButton from '@/components/ui/IconButton'
import { useCareLog } from '@/lib/hooks/useCareLog'
import { CARE_TYPES, careTypeLabel, careSubjectName, type CareSubject } from '@/lib/utils/careTypes'

// The care log for one subject — Somi (household) or yourself (personal).
// A row of quick-log buttons, a one-line "today" summary, and the history
// grouped by day. Deliberately low-ceremony, like the chores it replaces:
// tap "Fed", it's logged, move on. No streaks, no score.
export default function CareLog({ subject, compact = false }: {
  subject: CareSubject
  /** Home-block use: drop the heading, the parent block already has one. */
  compact?: boolean
}) {
  const { entries, loading, log, remove, doneToday, lastByKind, gentleHints, canShare } = useCareLog(subject)
  const presets = CARE_TYPES[subject]
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
  const presetKinds = new Set(presets.map(t => t.kind))
  const customKinds = [...new Set(entries.map(e => e.kind).filter(k => !presetKinds.has(k)))]
  const types = [
    ...presets,
    ...customKinds.map(k => ({ kind: k, label: k, custom: true as const })),
  ]

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

      {/* Quick-log buttons — each shows when it was last done; tapping logs
          it now and resets that to "today". */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {types.map(t => (
          <button key={t.kind} className="press" onClick={() => quickLog(t.kind, t.label, 'detail' in t ? t.detail : undefined)} style={pill(doneToday.has(t.kind))}>
            {t.label}
            <span style={{ opacity: 0.6, marginLeft: '0.3em' }}>· {lastLabel(t.kind)}</span>
          </button>
        ))}
      </div>

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
            const label = careTypeLabel(subject, hint.kind)
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
            placeholder={CARE_TYPES[subject].find(t => t.kind === pending.kind)?.detail}
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
                  <span style={{ color: 'var(--text)' }}>{careTypeLabel(subject, e.kind)}</span>
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
