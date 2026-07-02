'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { useWorkItems, dueUrgency, type WorkItem } from '@/lib/hooks/useWorkItems'
import { SkeletonRow } from '@/components/ui/Skeleton'
import { useLang } from '@/lib/LangContext'
import { t, domainLabel } from '@/lib/i18n'
import ShareMenu from '@/components/ui/ShareMenu'

const P_COLOR: Record<number, string> = { 1: 'var(--rose)', 2: 'var(--gold)', 3: 'var(--muted)' }
const P_DOT:   Record<number, string> = { 1: '●', 2: '●', 3: '○' }
const DUE_COLOR: Record<string, string> = {
  overdue: 'var(--rose)', today: 'var(--amber)', soon: 'var(--gold)',
  fine: 'var(--muted)', none: 'var(--muted)',
}
const S_ICON:  Record<WorkItem['status'], string> = { 'todo': '○', 'in-progress': '◑', 'done': '●' }
const S_COLOR: Record<WorkItem['status'], string> = { 'todo': 'var(--muted)', 'in-progress': 'var(--gold)', 'done': 'var(--emerald)' }
const S_NEXT:  Record<WorkItem['status'], WorkItem['status']> = { 'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo' }

const DOMAIN_LABELS: Record<string, string> = {
  'biz-active': 'Business', 'biz-future': 'Pipeline', 'money': 'Money',
  'health': 'Health', 'relationship': 'Relationship', 'creative': 'Creative',
  'home': 'Home', 'self': 'Self',
}

const RECUR_OPTIONS = [
  { label: 'No repeat', value: '' },
  { label: 'Daily', value: '1' },
  { label: 'Every 3 days', value: '3' },
  { label: 'Weekly', value: '7' },
  { label: 'Biweekly', value: '14' },
  { label: 'Monthly', value: '30' },
]

type Filter = 'all' | 'today' | 'overdue' | 'done'

const P_LABEL: Record<number, string> = { 1: 'P1', 2: 'P2', 3: 'P3' }

function WorkRow({ item, userId, onStatus, onRemove, onToggleShared, onUpdate }: {
  item: WorkItem
  userId: string
  onStatus: (id: string, s: WorkItem['status']) => void
  onRemove: (id: string) => void
  onToggleShared: (id: string) => void
  onUpdate: (id: string, patch: Partial<WorkItem>) => void
}) {
  const lang = useLang()
  const [hovered, setHovered] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState(item.notes ?? '')
  const urgency = dueUrgency(item.due_date)

  async function saveNotes() {
    setEditingNotes(false)
    if (notesDraft !== (item.notes ?? '')) onUpdate(item.id, { notes: notesDraft || null })
  }

  function cyclePriority() {
    onUpdate(item.id, { priority: item.priority >= 3 ? 1 : item.priority + 1 })
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderBottom: '1px solid var(--faint)', padding: '0.55rem 0' }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem' }}>
        <button onClick={() => onStatus(item.id, S_NEXT[item.status])} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
          fontSize: '0.75rem', color: S_COLOR[item.status], lineHeight: 1, transition: 'color 0.15s',
          marginTop: '0.05rem',
        }}>{S_ICON[item.status]}</button>

        {/* Priority badge — click to cycle */}
        <button
          onClick={cyclePriority}
          title="Click to change priority"
          style={{
            background: 'none', border: `1px solid ${P_COLOR[item.priority]}`,
            borderRadius: '4px', cursor: 'pointer', padding: '0.05em 0.35em',
            fontSize: '0.52rem', color: P_COLOR[item.priority], fontFamily: 'var(--font-body)',
            fontWeight: 600, letterSpacing: '0.03em', lineHeight: 1.6, flexShrink: 0,
            transition: 'all 0.15s', opacity: item.priority === 3 ? 0.5 : 1,
          }}
        >{P_LABEL[item.priority]}</button>

        <span style={{
          flex: 1, fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.4,
          textDecoration: item.status === 'done' ? 'line-through' : 'none',
          opacity: item.status === 'done' ? 0.45 : 1,
          userSelect: 'text',
        }}>{item.title}
          {item.recur_days && <span style={{ marginLeft: '0.4rem', fontSize: '0.58rem', color: 'var(--muted)', opacity: 0.68 }}>↻</span>}
        </span>

        {/* Category-wide share toggle — visible to any companion sharing "Work Hub" */}
        <button
          onClick={() => onToggleShared(item.id)}
          title={item.shared ? 'Visible to all Work Hub companions' : 'Make visible to Work Hub companions'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
            fontSize: '0.62rem', lineHeight: 1,
            color: item.shared ? 'var(--gold)' : 'var(--muted)',
            opacity: item.shared ? 0.8 : (hovered ? 0.3 : 0),
            transition: 'opacity 0.15s',
          }}
        >⇆</button>

        {/* Share with a specific person or group */}
        <div style={{ opacity: hovered ? 1 : 0.6, flexShrink: 0 }}>
          <ShareMenu itemType="work_item" itemId={item.id} userId={userId} />
        </div>

        <button onClick={() => onRemove(item.id)} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
          fontSize: '0.55rem', color: 'var(--muted)', opacity: hovered ? 0.35 : 0, transition: 'opacity 0.15s',
        }}>✕</button>
      </div>

      {/* Details row — domain, due date, recur — always visible */}
      <div style={{ marginLeft: '2.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
        {/* Domain select */}
        <select
          value={item.domain ?? ''}
          onChange={e => onUpdate(item.id, { domain: e.target.value || null })}
          style={{
            background: 'transparent', border: 'none', borderBottom: '1px solid var(--faint)',
            outline: 'none', fontSize: '0.6rem', color: item.domain ? 'var(--muted)' : 'var(--faint)',
            fontFamily: 'var(--font-body)', cursor: 'pointer', padding: '0.1em 0.2em',
            appearance: 'none', WebkitAppearance: 'none',
          }}
        >
          <option value="">{t('+ domain', lang)}</option>
          {Object.keys(DOMAIN_LABELS).map(k => (
            <option key={k} value={k}>{domainLabel(k, lang)}</option>
          ))}
        </select>

        {/* Due date — always visible */}
        <input
          type="date"
          value={item.due_date ?? ''}
          onChange={e => onUpdate(item.id, { due_date: e.target.value || null })}
          style={{
            background: 'transparent', border: 'none', borderBottom: `1px solid ${item.due_date ? DUE_COLOR[urgency] + '60' : 'var(--faint)'}`,
            outline: 'none', fontSize: '0.6rem',
            color: item.due_date ? DUE_COLOR[urgency] : 'var(--faint)',
            fontFamily: 'var(--font-body)', cursor: 'pointer',
            fontWeight: urgency === 'overdue' ? 600 : 300,
          }}
          title="Due date"
        />

        {item.recur_days && (
          <span style={{ fontSize: '0.58rem', color: 'var(--muted)', opacity: 0.58 }}>
            ↻ {item.recur_days === 1 ? 'daily' : item.recur_days === 7 ? 'weekly' : item.recur_days === 30 ? 'monthly' : `every ${item.recur_days}d`}
          </span>
        )}
      </div>

      {/* Notes — always visible */}
      {item.status !== 'done' && (
        <div style={{ marginLeft: '2.9rem', marginTop: '0.3rem' }}>
          {item.notes && !editingNotes && (
            <p
              onClick={() => { setNotesDraft(item.notes ?? ''); setEditingNotes(true) }}
              style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.6, fontWeight: 300, whiteSpace: 'pre-wrap', cursor: 'text', opacity: 0.75, margin: 0 }}
            >
              {item.notes}
            </p>
          )}
          {editingNotes && (
            <textarea
              autoFocus
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              onBlur={saveNotes}
              onKeyDown={e => { if (e.key === 'Escape') { setEditingNotes(false); setNotesDraft(item.notes ?? '') } }}
              rows={2}
              placeholder={t('Add notes, links, context…', lang)}
              style={{
                width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: '6px', color: 'var(--text)', fontFamily: 'var(--font-body)',
                fontSize: '0.7rem', padding: '0.4rem 0.6rem', outline: 'none', resize: 'none',
              }}
            />
          )}
          {!item.notes && !editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: '0.6rem', color: 'var(--muted)', opacity: hovered ? 0.45 : 0.2, fontFamily: 'var(--font-body)',
                transition: 'opacity 0.15s',
              }}
            >{t('+ add notes', lang)}</button>
          )}
        </div>
      )}
    </div>
  )
}

export default function MasterDashboard({ userId }: { userId: string }) {
  const lang = useLang()
  const { items, loading, add, setStatus, update, remove, toggleShared } = useWorkItems()
  const [filter, setFilter] = useState<Filter>('all')
  const [showAdd, setShowAdd] = useState(false)

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState(2)
  const [domain, setDomain] = useState('')
  const [recurDays, setRecurDays] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onOpenRequest() { setShowAdd(true); setTimeout(() => titleRef.current?.focus(), 40) }
    window.addEventListener('app:open-add-task', onOpenRequest)
    return () => window.removeEventListener('app:open-add-task', onOpenRequest)
  }, [])

  const submit = useCallback(async () => {
    if (!title.trim()) return
    await add({
      title: title.trim(), notes: notes.trim() || null,
      due_date: due || null, priority, domain: domain || null,
      recur_days: recurDays ? parseInt(recurDays) : null,
    })
    setTitle(''); setNotes(''); setDue(''); setPriority(2); setDomain('')
    setRecurDays(''); setShowAdd(false)
  }, [title, notes, due, priority, domain, recurDays, add])

  const overdueCount = items.filter(i => dueUrgency(i.due_date) === 'overdue' && i.status !== 'done').length
  const todayCount   = items.filter(i => dueUrgency(i.due_date) === 'today'   && i.status !== 'done').length

  const filtered = items.filter(i => {
    if (filter === 'overdue') return dueUrgency(i.due_date) === 'overdue' && i.status !== 'done'
    if (filter === 'today')   return dueUrgency(i.due_date) === 'today'   && i.status !== 'done'
    if (filter === 'done')    return i.status === 'done'
    return i.status !== 'done'
  })

  const inputStyle: React.CSSProperties = {
    background: 'transparent', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)',
    borderRadius: '7px', color: 'var(--text)', fontFamily: 'var(--font-body)',
    fontSize: '0.77rem', fontWeight: 300, padding: '0.38rem 0.65rem', outline: 'none', width: '100%',
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '0.62rem', letterSpacing: '0.07em', textTransform: 'uppercase',
    padding: '0.2em 0.6em', borderRadius: '5px', cursor: 'pointer', border: 'none',
    fontFamily: 'var(--font-body)', background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--muted)',
  })

  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)', borderTop: '2px solid color-mix(in srgb, var(--gold) 45%, var(--border))',
      borderRadius: '16px', padding: '1.3rem 1.5rem', boxShadow: '0 12px 32px var(--shadow)',
    }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem', gap: '0.5rem', flexWrap: 'wrap' }} className="tabs-wrap">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span style={{ fontSize: 'var(--text-card)', fontFamily: 'var(--font-display)', color: 'var(--text)', fontWeight: 400 }}>Work Hub</span>
          {overdueCount > 0 && <span style={{ fontSize: '0.6rem', color: 'var(--rose)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{overdueCount} overdue</span>}
          {todayCount > 0   && <span style={{ fontSize: '0.6rem', color: 'var(--amber)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{todayCount} due today</span>}
        </div>

        <div style={{ display: 'flex', gap: '0.2rem' }} className="tabs-wrap">
          {(['all', 'today', 'overdue', 'done'] as Filter[]).map(f => (
            <button key={f} style={tabStyle(filter === f)} onClick={() => setFilter(f)}>{t(f, lang)}</button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.25rem 0' }}>
          {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{ padding: '1.5rem 0', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ fontSize: '1.3rem', opacity: 0.3 }}>{filter === 'overdue' ? '🎉' : filter === 'done' ? '📋' : '✓'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.78 }}>
            {filter === 'all'     && 'Queue clear. Add one thing worth finishing.'}
            {filter === 'today'   && 'Nothing due today.'}
            {filter === 'overdue' && 'Nothing overdue. Nice.'}
            {filter === 'done'    && 'No completed items yet.'}
          </div>
        </div>
      )}

      {!loading && filtered.map(i => (
        <WorkRow key={i.id} item={i} userId={userId} onStatus={setStatus} onRemove={remove} onToggleShared={toggleShared} onUpdate={update} />
      ))}

      {/* Add area */}
      {!showAdd ? (
        <button onClick={() => { setShowAdd(true); setTimeout(() => titleRef.current?.focus(), 40) }} style={{
          marginTop: '0.7rem', width: '100%', padding: '0.42rem', borderRadius: '7px',
          border: '1px dashed var(--border)', background: 'transparent',
          color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: '0.72rem',
          cursor: 'pointer', opacity: 0.6,
        }}>{t('+ add task', lang)}</button>
      ) : (
        <div style={{ marginTop: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setShowAdd(false); setTitle('') } }}
            placeholder={t('New task title', lang)}
            style={inputStyle}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.4rem' }}>
            <input type="date" value={due} onChange={e => setDue(e.target.value)} style={inputStyle} title="Due date" />
            <select value={priority} onChange={e => setPriority(Number(e.target.value))} style={{ ...inputStyle, appearance: 'none' }}>
              <option value={1}>● Urgent</option>
              <option value={2}>● Normal</option>
              <option value={3}>○ Low</option>
            </select>
            <select value={domain} onChange={e => setDomain(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
              <option value="">No domain</option>
              {Object.keys(DOMAIN_LABELS).map(id => <option key={id} value={id}>{domainLabel(id, lang)}</option>)}
            </select>
            <select value={recurDays} onChange={e => setRecurDays(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
              {RECUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.label, lang)}</option>)}
            </select>
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('Notes (optional)', lang)} rows={2} style={{ ...inputStyle, resize: 'none' }} />

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={() => { setShowAdd(false); setTitle('') }} style={{
              padding: '0.35em 0.8em', borderRadius: '6px', border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: '0.7rem', cursor: 'pointer',
            }}>{t('cancel', lang)}</button>
            <button onClick={submit} style={{
              padding: '0.35em 0.8em', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.7rem', cursor: 'pointer',
            }}>{t('Add task', lang)}</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: '1rem', fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.58, letterSpacing: '0.04em' }}>
        ai prioritization + smart deadlines coming soon · ↻ = recurring · ⇆ = shared with companions
      </div>
    </div>
  )
}
