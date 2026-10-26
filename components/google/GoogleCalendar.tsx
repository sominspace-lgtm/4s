'use client'

import { withUndo } from '@/lib/ui/undo'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO,
  startOfDay, startOfMonth, startOfWeek,
} from 'date-fns'
import Sheet from '@/components/ui/Sheet'
import { notifyGoogleChanged, type GoogleEvent } from '@/lib/hooks/useGoogle'

// The calendar on the Google pages (2026-10-24). Agenda, Week or Month;
// each calendar has its own colour and can be hidden; tap an event to see it,
// change it or delete it; add one with the full form.
//  Personal: your own calendar (editable) + your partner's, if shared (view only).
//  Shared:   the shared account's calendar (editable) + what each of you shows
//            on the shared screen (view only, and only on the shared screen).

type View = 'agenda' | 'week' | 'month'
type Source = 'mine' | 'partner' | 'shared' | 'members'
type Ev = GoogleEvent & { source: Source; notes?: string | null }

const COLOR: Record<Source, string> = { mine: 'var(--gold)', partner: 'var(--rose)', shared: 'var(--emerald)', members: 'var(--sky, #6b9ac4)' }
const NAME: Record<Source, string> = { mine: 'Mine', partner: 'Partner', shared: 'Shared', members: 'Each of you' }

interface Draft { id: string | null; title: string; date: string; allDay: boolean; time: string; endTime: string; location: string; notes: string }
const blank = (date: string): Draft => ({ id: null, title: '', date, allDay: false, time: '09:00', endTime: '10:00', location: '', notes: '' })

const field: React.CSSProperties = { minHeight: 44, padding: '0 0.7rem', fontSize: '0.95rem', fontFamily: 'var(--font-body)', color: 'var(--text)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, outline: 'none', width: '100%', boxSizing: 'border-box' }
const lab: React.CSSProperties = { fontSize: '0.76rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }

function dayOf(e: Ev): Date { return parseISO(e.start.slice(0, 10)) }
function timeOf(e: Ev): string { return e.allDay ? 'All day' : format(parseISO(e.start), 'h:mm a') }

export default function GoogleCalendar({ scope }: { scope: 'mine' | 'shared' }) {
  const sources: Source[] = scope === 'mine' ? ['mine', 'partner'] : ['shared', 'members']
  const editable: Source = scope === 'mine' ? 'mine' : 'shared'
  const [view, setView] = useState<View>('agenda')
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [hidden, setHidden] = useState<Set<Source>>(new Set())
  const [events, setEvents] = useState<Ev[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<Ev | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [pickedDay, setPickedDay] = useState<Date | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // The window this view needs.
  const range = useMemo(() => {
    if (view === 'month') return { from: startOfWeek(startOfMonth(anchor)), to: addDays(endOfWeek(endOfMonth(anchor)), 1) }
    if (view === 'week') return { from: startOfWeek(anchor), to: addDays(endOfWeek(anchor), 1) }
    return { from: anchor, to: addDays(anchor, 30) }
  }, [view, anchor])

  const load = useCallback(async () => {
    setLoading(true)
    const all = await Promise.all(sources.map(async src => {
      try {
        const res = await fetch(`/api/google/calendar?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}${src === 'mine' ? '' : `&account=${src}`}`)
        if (!res.ok) return []
        const j = await res.json() as { events: GoogleEvent[] }
        return j.events.map(e => ({ ...e, source: src }))
      } catch { return [] }
    }))
    setEvents(all.flat().sort((a, b) => a.start.localeCompare(b.start)))
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sources follows scope
  }, [range, scope])

  useEffect(() => { void load() }, [load])

  const shown = events.filter(e => !hidden.has(e.source))
  const present = sources.filter(s => events.some(e => e.source === s) || s === editable)

  function step(n: number) {
    setPickedDay(null)
    setAnchor(a => (view === 'month' ? startOfMonth(addMonths(a, n)) : view === 'week' ? addWeeks(a, n) : addDays(a, 30 * n)))
  }

  const title = view === 'month' ? format(anchor, 'MMMM yyyy')
    : view === 'week' ? `${format(startOfWeek(anchor), 'MMM d')} to ${format(endOfWeek(anchor), 'MMM d')}`
      : `From ${format(anchor, 'MMM d')}`

  async function save() {
    if (!draft || !draft.title.trim()) return
    setBusy(true); setErr(null)
    const body = { title: draft.title.trim(), date: draft.date, time: draft.allDay ? undefined : draft.time, endTime: draft.allDay ? undefined : draft.endTime, location: draft.location || undefined, notes: draft.notes || undefined }
    const acct = editable === 'shared' ? 'account=shared' : ''
    const url = draft.id ? `/api/google/calendar?${[acct, `id=${encodeURIComponent(draft.id)}`].filter(Boolean).join('&')}` : `/api/google/calendar${acct ? `?${acct}` : ''}`
    const res = await fetch(url, { method: draft.id ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    setBusy(false)
    if (!res.ok) { setErr(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Google did not take that.'); return }
    setDraft(null); setOpen(null); notifyGoogleChanged(); void load()
  }

  async function del(e: Ev) {
    setOpen(null)
    withUndo(`Deleting "${e.title}"`, async () => {
      const res = await fetch(`/api/google/calendar?${[editable === 'shared' ? 'account=shared' : '', `id=${encodeURIComponent(e.id)}`].filter(Boolean).join('&')}`, { method: 'DELETE' })
      if (!res.ok) { setErr('Could not delete that.'); return }
      notifyGoogleChanged(); void load()
    })
  }

  function editFrom(e: Ev) {
    const st = e.allDay ? null : parseISO(e.start), en = e.allDay ? null : parseISO(e.end)
    setDraft({ id: e.id, title: e.title, date: e.start.slice(0, 10), allDay: e.allDay, time: st ? format(st, 'HH:mm') : '09:00', endTime: en ? format(en, 'HH:mm') : '10:00', location: e.location ?? '', notes: e.notes ?? '' })
    setOpen(null); setErr(null)
  }

  const Row = ({ e }: { e: Ev }) => (
    <button onClick={() => { setOpen(e); setErr(null) }} className="press" style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', minHeight: 44, padding: '0.35rem 0.5rem', textAlign: 'left',
      background: 'none', border: 'none', borderLeft: `3px solid ${COLOR[e.source]}`, cursor: 'pointer', fontFamily: 'var(--font-body)', marginBottom: '0.2rem',
    }}>
      <span style={{ width: '4.4rem', flexShrink: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>{timeOf(e)}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: '0.92rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {e.title}{e.who ? <span style={{ color: 'var(--muted)' }}> · {e.who}</span> : null}
      </span>
    </button>
  )

  const dayBlock = (d: Date, list: Ev[], showEmpty: boolean) => (list.length === 0 && !showEmpty) ? null : (
    <div key={d.toISOString()} style={{ marginBottom: '0.7rem' }}>
      <div className="t-label" style={{ marginBottom: '0.25rem', color: isSameDay(d, new Date()) ? 'var(--gold)' : undefined }}>
        {isSameDay(d, new Date()) ? 'Today' : format(d, 'EEE, MMM d')}
      </div>
      {list.length === 0 ? <div style={{ fontSize: '0.8rem', color: 'var(--muted)', padding: '0.2rem 0.5rem' }}>Free</div> : list.map(e => <Row key={`${e.source}-${e.id}-${e.start}`} e={e} />)}
    </div>
  )

  const days = (from: Date, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i))
  const onDay = (d: Date) => shown.filter(e => isSameDay(dayOf(e), d))

  const seg = (on: boolean): React.CSSProperties => ({
    minHeight: 36, padding: '0 0.8rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.84rem',
    background: on ? 'var(--surface)' : 'transparent', color: on ? 'var(--text)' : 'var(--muted)', boxShadow: on ? '0 1px 4px var(--shadow)' : 'none',
  })

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.15rem', padding: '0.15rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10 }}>
          {(['agenda', 'week', 'month'] as View[]).map(v => (
            <button key={v} onClick={() => { setView(v); setPickedDay(null); if (v === 'month') setAnchor(a => startOfMonth(a)) }} style={seg(view === v)}>{v[0].toUpperCase() + v.slice(1)}</button>
          ))}
        </div>
        <button onClick={() => { setDraft(blank(format(pickedDay ?? new Date(), 'yyyy-MM-dd'))); setErr(null) }} className="btn btn-primary press" style={{ marginLeft: 'auto' }}>+ Event</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <button onClick={() => step(-1)} aria-label="Earlier" className="btn btn-ghost press" style={{ minWidth: 44 }}>‹</button>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <button onClick={() => step(1)} aria-label="Later" className="btn btn-ghost press" style={{ minWidth: 44 }}>›</button>
        <button onClick={() => { setAnchor(view === 'month' ? startOfMonth(new Date()) : startOfDay(new Date())); setPickedDay(null) }} className="btn btn-ghost press">Today</button>
      </div>

      {present.length > 1 && (
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {present.map(s => {
            const on = !hidden.has(s)
            return (
              <button key={s} onClick={() => setHidden(h => { const n = new Set(h); if (n.has(s)) n.delete(s); else n.add(s); return n })} className="press" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem', minHeight: 34, padding: '0 0.75rem', borderRadius: 999, cursor: 'pointer',
                border: `1px solid ${on ? COLOR[s] : 'var(--border)'}`, background: 'transparent', color: on ? 'var(--text)' : 'var(--muted)', fontSize: '0.8rem', fontFamily: 'var(--font-body)',
              }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: on ? COLOR[s] : 'transparent', border: `1px solid ${COLOR[s]}` }} />
                {s === 'partner' ? (events.find(e => e.source === 'partner')?.who ?? NAME[s]) : NAME[s]}
              </button>
            )
          })}
        </div>
      )}

      {err && !draft && <div style={{ fontSize: '0.8rem', color: 'var(--rose)' }}>{err}</div>}
      {loading && <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Loading…</div>}

      {!loading && view === 'agenda' && (
        shown.length === 0
          ? <div style={{ fontSize: '0.86rem', color: 'var(--muted)' }}>Nothing in these 30 days.</div>
          : days(anchor, 30).map(d => dayBlock(d, onDay(d), false))
      )}

      {!loading && view === 'week' && days(startOfWeek(anchor), 7).map(d => dayBlock(d, onDay(d), true))}

      {!loading && view === 'month' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--muted)', padding: '0.2rem 0' }}>{d}</div>)}
            {days(startOfWeek(startOfMonth(anchor)), Math.round((endOfWeek(endOfMonth(anchor)).getTime() - startOfWeek(startOfMonth(anchor)).getTime()) / 86_400_000)).map(d => {
              const list = onDay(d)
              const picked = pickedDay && isSameDay(d, pickedDay)
              return (
                <button key={d.toISOString()} onClick={() => setPickedDay(d)} className="press" style={{
                  minHeight: 54, padding: '0.25rem', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
                  border: `1px solid ${picked ? 'var(--gold)' : 'var(--faint, var(--border))'}`,
                  background: isSameDay(d, new Date()) ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'transparent',
                  opacity: isSameMonth(d, anchor) ? 1 : 0.4, display: 'flex', flexDirection: 'column', gap: 3,
                }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{format(d, 'd')}</span>
                  <span style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {list.slice(0, 4).map(e => <span key={`${e.source}-${e.id}-${e.start}`} style={{ width: 6, height: 6, borderRadius: '50%', background: COLOR[e.source] }} />)}
                  </span>
                </button>
              )
            })}
          </div>
          {pickedDay && dayBlock(pickedDay, onDay(pickedDay), true)}
        </>
      )}

      {/* One event, read; your own or the shared one can be changed */}
      <Sheet open={!!open} title={open?.title ?? ''} onClose={() => setOpen(null)}
        footer={open && (
          <>
            {open.source === editable && <button className="btn btn-primary press" onClick={() => editFrom(open)}>Edit</button>}
            {open.link && <a className="btn btn-ghost press" href={open.link} target="_blank" rel="noopener noreferrer">Open in Google</a>}
            {open.source === editable && <button className="btn btn-ghost press" style={{ marginLeft: 'auto', color: 'var(--rose)' }} disabled={busy} onClick={() => del(open)}>Delete</button>}
          </>
        )}>
        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.92rem', color: 'var(--text)' }}>
            <div>{format(dayOf(open), 'EEEE, MMMM d')}{open.allDay ? ', all day' : `, ${format(parseISO(open.start), 'h:mm a')} to ${format(parseISO(open.end), 'h:mm a')}`}</div>
            {open.location && <div style={{ color: 'var(--muted)' }}>{open.location}</div>}
            {open.notes && <div style={{ color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{open.notes}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: COLOR[open.source] }} />
              {open.source === 'partner' || open.source === 'members' ? `${open.who ?? 'Shared'}'s calendar, view only` : open.source === 'shared' ? 'Shared calendar' : 'My calendar'}
            </div>
          </div>
        )}
      </Sheet>

      {/* Add or change an event */}
      <Sheet open={!!draft} title={draft?.id ? 'Edit event' : scope === 'shared' ? 'New shared event' : 'New event'} onClose={() => setDraft(null)}
        footer={draft && (
          <>
            <button className="btn btn-primary press" disabled={busy || !draft.title.trim()} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
            <button className="btn btn-ghost press" onClick={() => setDraft(null)}>Cancel</button>
          </>
        )}>
        {draft && (
          <>
            <label style={lab}>What<input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Dinner with Mom" autoFocus style={field} /></label>
            <label style={lab}>Day<input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} style={field} /></label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text)', minHeight: 40, cursor: 'pointer' }}>
              <input type="checkbox" checked={draft.allDay} onChange={e => setDraft({ ...draft, allDay: e.target.checked })} style={{ width: 22, height: 22 }} /> All day
            </label>
            {!draft.allDay && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <label style={lab}>Starts<input type="time" value={draft.time} onChange={e => setDraft({ ...draft, time: e.target.value })} style={field} /></label>
                <label style={lab}>Ends<input type="time" value={draft.endTime} onChange={e => setDraft({ ...draft, endTime: e.target.value })} style={field} /></label>
              </div>
            )}
            <label style={lab}>Where (optional)<input value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} style={field} /></label>
            <label style={lab}>Notes (optional)<textarea value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} rows={3} style={{ ...field, minHeight: 80, padding: '0.5rem 0.7rem', resize: 'vertical' }} /></label>
            {err && <div style={{ fontSize: '0.8rem', color: 'var(--rose)' }}>{err}</div>}
          </>
        )}
      </Sheet>
    </section>
  )
}
