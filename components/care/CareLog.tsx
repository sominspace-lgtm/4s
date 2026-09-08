'use client'

import { useState } from 'react'
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
  const { entries, loading, log, remove, doneToday, lastByKind, canShare } = useCareLog(subject)
  const types = CARE_TYPES[subject]
  const [pending, setPending] = useState<{ kind: string; label: string; detail: string } | null>(null)
  const [custom, setCustom] = useState('')

  const relTime = (iso: string) => {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
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

  const quickLog = (kind: string, label: string, detail?: string) => {
    if (detail) { setPending({ kind, label, detail }); return }
    void log(kind)
  }

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

      {/* Quick-log buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {types.map(t => (
          <button key={t.kind} className="press" onClick={() => quickLog(t.kind, t.label, t.detail)} style={pill(doneToday.has(t.kind))}>
            {t.label}
            {doneToday.has(t.kind) && lastByKind[t.kind] ? ` · ${relTime(lastByKind[t.kind].logged_at)}` : ''}
          </button>
        ))}
      </div>

      {/* Free-text one-off */}
      <div style={{ display: 'flex', gap: '0.3rem' }}>
        <input
          value={custom} onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && custom.trim()) { void log(custom.trim()); setCustom('') } }}
          placeholder="Something else…"
          style={{
            flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '0.35rem 0.55rem', fontSize: '0.74rem', color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button className="press" disabled={!custom.trim()} aria-label="Log"
          onClick={() => { if (custom.trim()) { void log(custom.trim()); setCustom('') } }}
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
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{pending.label} —</span>
          <input
            autoFocus value={pending.detail}
            onChange={e => setPending({ ...pending, detail: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter') { void log(pending.kind, { detail: pending.detail }); setPending(null) }
              if (e.key === 'Escape') setPending(null)
            }}
            placeholder={CARE_TYPES[subject].find(t => t.kind === pending.kind)?.detail}
            style={{
              flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '0.25rem 0.45rem', fontSize: '0.72rem', color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button className="press" onClick={() => { void log(pending.kind, { detail: pending.detail }); setPending(null) }}
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
                  <span style={{ color: 'var(--muted)', opacity: 0.7, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    {new Date(e.logged_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <button onClick={() => remove(e.id)} aria-label="Remove" className="press"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.35, fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
