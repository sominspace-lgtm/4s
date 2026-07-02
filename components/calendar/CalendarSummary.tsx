'use client'

import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { useWorkItems } from '@/lib/hooks/useWorkItems'
import { useSubscriptions } from '@/lib/hooks/useSubscriptions'
import { useGiftEvents, nextOccurrence } from '@/lib/hooks/useGiftEvents'
import { useBuyItems, runoutDate, computeStatus } from '@/lib/hooks/useBuyItems'

interface Entry {
  key: string
  date: Date
  label: string
  type: 'task' | 'renewal' | 'refill' | 'gift'
}

const TYPE_META: Record<Entry['type'], { label: string; color: string }> = {
  task:    { label: 'task',    color: 'var(--gold)' },
  renewal: { label: 'renewal', color: 'var(--emerald)' },
  refill:  { label: 'refill',  color: 'var(--amber)' },
  gift:    { label: 'gift',    color: 'var(--blush)' },
}

const WINDOW_DAYS = 14
const MAX_UPCOMING = 8

function Row({ entry, overdue }: { entry: Entry; overdue: boolean }) {
  const meta = TYPE_META[entry.type]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.35rem 0', borderBottom: '1px solid var(--faint)' }}>
      <span style={{
        fontSize: '0.6rem', letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0,
        color: meta.color, background: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
        padding: '0.12em 0.5em', borderRadius: '4px', minWidth: '52px', textAlign: 'center',
      }}>{meta.label}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: '0.76rem', color: 'var(--text)', fontWeight: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.label}
      </span>
      <span style={{ fontSize: '0.64rem', color: overdue ? 'var(--rose)' : 'var(--muted)', flexShrink: 0 }}>
        {overdue ? 'overdue' : format(entry.date, 'EEE, MMM d')}
      </span>
    </div>
  )
}

// Native 4S agenda built from what the app already knows — dated tasks,
// renewals, refill run-outs, gift dates. Google Calendar stays a separate
// embed below; this works with or without it.
export default function CalendarSummary() {
  const { items: workItems } = useWorkItems()
  const { subs } = useSubscriptions()
  const { items: giftItems } = useGiftEvents()
  const { items: buyItems } = useBuyItems()

  const now = new Date()
  const entries: Entry[] = []

  for (const t of workItems) {
    if (t.status === 'done' || !t.due_date) continue
    entries.push({ key: `task-${t.id}`, date: parseISO(t.due_date), label: t.title, type: 'task' })
  }
  for (const s of subs) {
    if (!s.renewal_date) continue
    entries.push({ key: `sub-${s.id}`, date: parseISO(s.renewal_date), label: `${s.name} renews`, type: 'renewal' })
  }
  for (const b of buyItems) {
    const status = computeStatus(b)
    if (status === 'paused' || status === 'snoozed' || status === 'backup-stock') continue
    const due = runoutDate(b)
    if (!due) continue
    entries.push({ key: `buy-${b.id}`, date: due, label: `${b.name} runs out`, type: 'refill' })
  }
  for (const g of giftItems) {
    entries.push({ key: `gift-${g.id}`, date: nextOccurrence(g), label: g.name, type: 'gift' })
  }

  const dayDiff = (d: Date) => differenceInCalendarDays(d, now)
  // Overdue items surface under Today — they matter *now*.
  const today = entries.filter(e => dayDiff(e.date) <= 0).sort((a, b) => +a.date - +b.date)
  const upcoming = entries
    .filter(e => dayDiff(e.date) > 0 && dayDiff(e.date) <= WINDOW_DAYS)
    .sort((a, b) => +a.date - +b.date)
    .slice(0, MAX_UPCOMING)

  const empty = today.length === 0 && upcoming.length === 0

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.1rem 1.3rem', marginBottom: '0.8rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', fontWeight: 400, color: 'var(--text)' }}>Today &amp; Upcoming</span>
        <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.8, letterSpacing: '0.04em' }}>from your tasks, renewals, refills &amp; gifts</span>
      </div>

      {empty && (
        <div style={{ fontSize: '0.76rem', color: 'var(--muted)', fontStyle: 'italic', padding: '0.4rem 0' }}>
          Nothing scheduled in the next two weeks. Quiet ahead.
        </div>
      )}

      {today.length > 0 && (
        <div style={{ marginTop: '0.4rem' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.8, marginBottom: '0.2rem' }}>Today</div>
          {today.map(e => <Row key={e.key} entry={e} overdue={dayDiff(e.date) < 0} />)}
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginTop: today.length > 0 ? '0.7rem' : '0.4rem' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.8, marginBottom: '0.2rem' }}>Upcoming · next {WINDOW_DAYS} days</div>
          {upcoming.map(e => <Row key={e.key} entry={e} overdue={false} />)}
        </div>
      )}
    </div>
  )
}
