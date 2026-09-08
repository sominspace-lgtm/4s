'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useCheckins, groupCheckinsByWeek } from '@/lib/hooks/useCheckins'
import { useCareLog } from '@/lib/hooks/useCareLog'
import { useHousehold, choreDue, dinnerFor } from '@/lib/hooks/useHousehold'
import { useSharedEvents, useEvents } from '@/lib/hooks/useEvents'
import { useHabits, isDueOn } from '@/lib/hooks/useHabits'
import { careTypeLabel, careSubjectName, type CareSubject } from '@/lib/utils/careTypes'
import { weekOfSunday } from '@/lib/utils/checkinQuestions'
import { goToSection, goToHousehold, goToPersonal } from '@/lib/utils/navigate'
import VoiceDrop from '@/components/capture/VoiceDrop'

// The day, in order (2026-09-08). One scrollable read of what's happened
// and what's still ahead — check-in, care logged, meals, chores, events —
// stitched from the same hooks the rest of the dashboard uses, merge-sorted
// by each row's own timestamp. Not cards, not a second dashboard: a
// timeline you skim morning and night. No counts, no streaks.

type Tone = 'done' | 'ahead'
interface Row {
  key: string
  at: number
  label: string
  meta?: string
  tone: Tone
  go?: () => void
}

const SEEN_KEY = '4s:thread-seen'

function readSeen(): number {
  try {
    const v = localStorage.getItem(SEEN_KEY)
    return v ? Date.parse(v) : 0
  } catch { return 0 }
}
function writeSeen() {
  try { localStorage.setItem(SEEN_KEY, new Date().toISOString()) } catch { /* private mode */ }
}

function relTime(ms: number): string {
  const d = new Date(ms)
  const mins = Math.round((Date.now() - ms) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 60 * 6) return `${Math.round(mins / 60)}h ago`
  return format(d, 'h:mm a').toLowerCase()
}

export default function DailyThread({ userId }: { userId: string }) {
  const { spaces, members } = useSharedSpaces(userId)
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id
    ?? spaces[0]?.id ?? null

  const { checkins } = useCheckins(userId)
  const somi = useCareLog('somi')
  const self = useCareLog('self')
  const home = useCareLog('home')
  const h = useHousehold(spaceId)
  const shared = useSharedEvents(spaceId)
  const mine = useEvents()
  const habits = useHabits()

  // Freeze the "last opened" mark for the life of this mount so the divider
  // doesn't jump as the clock passes it; restamp on unmount / tab hide.
  const seenAt = useRef(readSeen())
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') writeSeen() }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      writeSeen()
    }
  }, [])

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const now = Date.now()

    // --- Done today ---
    const careEntries: { subject: CareSubject; kind: string; detail: string | null; logged_at: string; id: string }[] = [
      ...somi.entries.map(e => ({ ...e, subject: 'somi' as const })),
      ...self.entries.map(e => ({ ...e, subject: 'self' as const })),
      ...home.entries.map(e => ({ ...e, subject: 'home' as const })),
    ]
    for (const e of careEntries) {
      if (!isToday(parseISO(e.logged_at))) continue
      out.push({
        key: `care-${e.id}`,
        at: Date.parse(e.logged_at),
        label: careTypeLabel(e.subject, e.kind),
        meta: `${careSubjectName(e.subject)}${e.detail ? ` · ${e.detail}` : ''}`,
        tone: 'done',
        go: () => goToHousehold(e.subject === 'self' ? 'today' : 'upkeep'),
      })
    }

    const week = weekOfSunday()
    const thisWeek = groupCheckinsByWeek(checkins).find(w => w.weekOf >= week)
    const myCheckin = thisWeek?.byUser?.[userId]
    if (myCheckin?.completed_at && isToday(parseISO(myCheckin.completed_at))) {
      const others = Object.keys(thisWeek!.byUser).filter(id => id !== userId).length
      out.push({
        key: 'checkin',
        at: Date.parse(myCheckin.completed_at),
        label: 'Weekly check-in done',
        meta: others > 0 ? "You're both in this week" : 'Waiting on your partner',
        tone: 'done',
        go: () => goToSection('hhtoday'),
      })
    }

    for (const s of h.shopping) {
      if (!s.got || !s.got_at || !isToday(parseISO(s.got_at))) continue
      out.push({
        key: `shop-${s.id}`,
        at: Date.parse(s.got_at),
        label: `Picked up ${s.name}`,
        tone: 'done',
        go: () => goToHousehold('home'),
      })
    }

    for (const c of h.chores) {
      if (c.last_done_at && c.last_done_at.slice(0, 10) === todayStr) {
        out.push({
          key: `chore-done-${c.id}`,
          at: parseISO(`${todayStr}T12:00:00`).getTime(),
          label: `${c.name} done`,
          tone: 'done',
          go: () => goToHousehold('upkeep'),
        })
      }
    }

    for (const [habitId, dates] of Object.entries(habits.completions)) {
      if (!dates.includes(todayStr)) continue
      const name = habits.habits.find(x => x.id === habitId)?.name ?? 'Habit'
      out.push({
        key: `habit-${habitId}`,
        at: parseISO(`${todayStr}T09:00:00`).getTime(),
        label: `${name}`,
        meta: 'Habit',
        tone: 'done',
        go: () => goToPersonal('habits'),
      })
    }

    // --- Still ahead today ---
    const events = [...shared.items, ...mine.items.filter(e => !e.space_id)]
    for (const e of events) {
      if (e.event_date.slice(0, 10) !== todayStr) continue
      const at = e.event_time
        ? parseISO(`${todayStr}T${e.event_time}:00`).getTime()
        : parseISO(`${todayStr}T23:59:00`).getTime()
      out.push({
        key: `event-${e.id}`,
        at,
        label: e.title,
        meta: e.event_time ? format(new Date(at), 'h:mm a').toLowerCase() : 'today',
        tone: at > now ? 'ahead' : 'done',
        go: () => goToSection('home'),
      })
    }

    const SLOT_AT: Record<string, string> = { breakfast: '08:00', lunch: '12:30', dinner: '19:00' }
    for (const m of h.meals) {
      if (m.meal_date.slice(0, 10) !== todayStr) continue
      const at = parseISO(`${todayStr}T${SLOT_AT[m.slot] ?? '19:00'}:00`).getTime()
      out.push({
        key: `meal-${m.id}`,
        at,
        label: m.title,
        meta: `${m.slot}${m.kind === 'eating_out' ? ' · out' : m.cook ? ` · ${m.cook} cooks` : ''}`,
        tone: at > now ? 'ahead' : 'done',
        go: () => goToHousehold('home'),
      })
    }

    for (const c of h.chores) {
      const due = choreDue(c)
      const doneToday = c.last_done_at && c.last_done_at.slice(0, 10) === todayStr
      if (due > 0 || doneToday) continue
      out.push({
        key: `chore-due-${c.id}`,
        at: parseISO(`${todayStr}T23:58:00`).getTime(),
        label: c.name,
        meta: due < 0 ? `overdue ${-due}d` : 'due today',
        tone: 'ahead',
        go: () => goToHousehold('upkeep'),
      })
    }

    for (const hb of habits.habits) {
      const dates = habits.completions[hb.id] ?? []
      if (dates.includes(todayStr)) continue
      if (!isDueOn(hb, todayStr, dates)) continue
      out.push({
        key: `habit-due-${hb.id}`,
        at: parseISO(`${todayStr}T23:57:00`).getTime(),
        label: hb.name,
        meta: 'habit, not yet',
        tone: 'ahead',
        go: () => goToPersonal('habits'),
      })
    }

    return out
  }, [somi.entries, self.entries, home.entries, checkins, userId, h.shopping, h.chores, h.meals, habits.completions, habits.habits, shared.items, mine.items])

  const ahead = rows.filter(r => r.tone === 'ahead').sort((a, b) => a.at - b.at)
  const done = rows.filter(r => r.tone === 'done').sort((a, b) => b.at - a.at)
  const firstNewIdx = done.findIndex(r => r.at > seenAt.current)
  const dinner = dinnerFor(h.meals)

  const loading = h.loading && rows.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.68, flex: 1 }}>
          The day, in order
        </div>
        <VoiceDrop spaceId={spaceId} compact />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0.5rem 0.9rem' }}>
        {loading ? (
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic', margin: '0.6rem 0.2rem' }}>Loading the day…</p>
        ) : rows.length === 0 ? (
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic', margin: '0.6rem 0.2rem' }}>
            Nothing logged or planned yet today.
          </p>
        ) : (
          <>
            {ahead.length > 0 && (
              <Group title="Still today">
                {ahead.map(r => <ThreadRow key={r.key} row={r} />)}
              </Group>
            )}
            {done.length > 0 && (
              <Group title="Done today">
                {done.map((r, i) => (
                  <div key={r.key}>
                    {i === firstNewIdx && firstNewIdx > 0 && <NewRule />}
                    <ThreadRow row={r} />
                  </div>
                ))}
              </Group>
            )}
          </>
        )}
      </div>

      {dinner && (
        <div style={{ fontSize: '0.68rem', color: 'var(--muted)', paddingLeft: '0.2rem' }}>
          Tonight: {dinner.title}
          {dinner.kind === 'eating_out' ? ' (out)' : dinner.cook ? ` · ${dinner.cook} cooks` : ''}
        </div>
      )}
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '0.4rem 0' }}>
      <div style={{ fontSize: '0.58rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.6, margin: '0.2rem 0 0.3rem' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function NewRule() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.35rem 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--faint)' }} />
      <span style={{ fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.6 }}>new</span>
      <div style={{ flex: 1, height: 1, background: 'var(--faint)' }} />
    </div>
  )
}

function ThreadRow({ row }: { row: Row }) {
  const body = (
    <>
      <span aria-hidden style={{
        width: 6, height: 6, borderRadius: 999, flexShrink: 0, marginTop: '0.42rem',
        background: row.tone === 'done' ? 'var(--emerald)' : 'var(--amber)',
        opacity: row.tone === 'done' ? 0.7 : 0.9,
      }} />
      <span style={{ fontSize: '0.78rem', color: 'var(--text)', flex: 1, lineHeight: 1.4 }}>
        {row.label}
        {row.meta && <span style={{ color: 'var(--muted)' }}> · {row.meta}</span>}
      </span>
      {row.tone === 'done' && (
        <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.6, flexShrink: 0, whiteSpace: 'nowrap' }}>
          {relTime(row.at)}
        </span>
      )}
    </>
  )
  const style: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: '0.55rem', width: '100%',
    padding: '0.3rem 0.1rem', textAlign: 'left', background: 'none', border: 'none',
    borderBottom: '1px solid var(--faint)', fontFamily: 'var(--font-body)',
  }
  if (!row.go) return <div style={style}>{body}</div>
  return <button onClick={row.go} className="press" style={{ ...style, cursor: 'pointer' }}>{body}</button>
}
