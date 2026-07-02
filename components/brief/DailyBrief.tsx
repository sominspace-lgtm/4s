'use client'

import { useEffect, useState } from 'react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { useWorkItems, dueUrgency } from '@/lib/hooks/useWorkItems'
import { useHabits, isDueOn } from '@/lib/hooks/useHabits'
import { useCaptures } from '@/lib/hooks/useCaptures'
import { useDomainTouched } from '@/lib/hooks/useDomainTouched'
import { useSubscriptions, urgency as subUrgency } from '@/lib/hooks/useSubscriptions'
import { useGiftEvents, daysUntil as giftDaysUntil } from '@/lib/hooks/useGiftEvents'
import { useWatchItems } from '@/lib/hooks/useWatchItems'
import { useBuyItems, computeStatus } from '@/lib/hooks/useBuyItems'
import { useCompanions } from '@/lib/hooks/useCompanions'
import { DOMAINS } from '@/lib/constants/domains'
import PulseSection from '@/components/pulse/PulseSection'
import FamilyTodayCard from '@/components/companion/FamilyTodayCard'
import CaptureSection from '@/components/capture/CaptureSection'
import { getLast7Days } from '@/lib/utils/habits'
import { useLang } from '@/lib/LangContext'
import { t, fmtDate, getInsightKO } from '@/lib/i18n'

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      <span style={{ fontSize: 'clamp(1.3rem,3vw,1.8rem)', fontFamily: 'var(--font-display)', fontWeight: 300, color: color ?? 'var(--text)', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', opacity: 0.7 }}>
        {label}
      </span>
    </div>
  )
}

function SummaryCard({ label, line, action, onAction }: { label: string; line: string; action: string; onAction: () => void }) {
  return (
    <div className="card-interactive" style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
      padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', minHeight: '84px',
    }}>
      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', opacity: 0.78 }}>{label}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.4, flex: 1 }}>{line}</div>
      <button onClick={onAction} className="btn btn-ghost" style={{ fontSize: '0.65rem', alignSelf: 'flex-start', padding: 0 }}>{action} →</button>
    </div>
  )
}

export default function DailyBrief({ userId, onOpenCompanions }: { userId: string; onOpenCompanions: () => void }) {
  const lang = useLang()
  const { items } = useWorkItems()
  const { habits, completions } = useHabits()
  const { captures } = useCaptures()
  const { touched } = useDomainTouched()
  const { subs, total: monthlyTotal } = useSubscriptions()
  const { items: giftItems } = useGiftEvents()
  const { items: wishItems } = useWatchItems()
  const { items: buyItems } = useBuyItems()
  const { received } = useCompanions(userId)
  const pendingShares = received.filter(c => c.status === 'pending').length

  const [sharedWithMeCount, setSharedWithMeCount] = useState(0)
  useEffect(() => {
    fetch('/api/companions/shared-with-me').then(r => r.json()).then(d => setSharedWithMeCount((d.items ?? []).length)).catch(() => {})
  }, [])

  const today = format(new Date(), 'yyyy-MM-dd')
  const week  = getLast7Days()

  const dueToday   = items.filter(i => dueUrgency(i.due_date) === 'today'   && i.status !== 'done').length
  const overdue    = items.filter(i => dueUrgency(i.due_date) === 'overdue' && i.status !== 'done').length
  const inProgress = items.filter(i => i.status === 'in-progress').length
  const inboxCount = captures.length

  // "Due today" respects each habit's schedule (daily/weekly/every-N-days)
  // and skips paused ones, instead of counting every habit that ever existed.
  const habitsDueToday  = habits.filter(h => isDueOn(h, today, completions[h.id] ?? []))
  const habitsTotal     = habitsDueToday.length
  const habitsDoneToday = habitsDueToday.filter(h => (completions[h.id] ?? []).includes(today)).length
  const weekRate = habitsTotal === 0 ? null : Math.round(
    habitsDueToday.reduce((sum, h) => {
      const done = new Set(completions[h.id] ?? [])
      return sum + week.filter(d => done.has(d)).length
    }, 0) / (habitsTotal * week.length) * 100
  )

  const domainsNeedingReview = DOMAINS.filter(d => {
    const last = touched[d.id]
    return !last || differenceInDays(new Date(), parseISO(last)) > 7
  })
  const refillsDue = buyItems.filter(b => ['due-to-buy', 'overdue'].includes(computeStatus(b))).length
  const moneyDueSoon = subs.filter(s => subUrgency(s.renewal_date) === 'soon').length
    + giftItems.filter(g => giftDaysUntil(g) <= 7).length
    + refillsDue
  const habitsDueCount = habitsTotal > habitsDoneToday ? habitsTotal - habitsDoneToday : 0

  const summaryParts: string[] = []
  if (inboxCount > 0) summaryParts.push(`${inboxCount} inbox item${inboxCount > 1 ? 's' : ''}`)
  if (pendingShares > 0) summaryParts.push(`${pendingShares} shared invite${pendingShares > 1 ? 's' : ''}`)
  if (overdue > 0) summaryParts.push(`${overdue} overdue task${overdue > 1 ? 's' : ''}`)
  else if (dueToday > 0) summaryParts.push(`${dueToday} due today`)
  if (domainsNeedingReview.length > 0) summaryParts.push(`${domainsNeedingReview[0].label} review due`)
  if (moneyDueSoon > 0) summaryParts.push(`${moneyDueSoon} money reminder${moneyDueSoon > 1 ? 's' : ''}`)
  if (habitsDueCount > 0) summaryParts.push(`${habitsDueCount} habit${habitsDueCount > 1 ? 's' : ''} due`)

  function getInsight(): string {
    if (lang === 'ko') return getInsightKO({ overdue, dueToday, habitsDoneToday, habitsTotal, inboxCount, inProgress })
    if (overdue > 0) return `${overdue} item${overdue > 1 ? 's are' : ' is'} overdue — tackle those first.`
    if (dueToday > 0 && habitsDoneToday === 0 && habitsTotal > 0) return `${dueToday} thing${dueToday > 1 ? 's' : ''} due today and no habits checked yet.`
    if (habitsTotal > 0 && habitsDoneToday === habitsTotal) return 'All habits done. Strong day.'
    if (inboxCount > 5) return `${inboxCount} things sitting in your inbox — worth a quick sort.`
    if (inProgress > 0) return `${inProgress} item${inProgress > 1 ? 's' : ''} in progress. Keep the thread.`
    if (dueToday === 0 && overdue === 0 && habitsTotal > 0) return 'Clear runway today. Good time to go deep.'
    return 'Start with the most important thing.'
  }

  // Only show stats that have something meaningful to say
  const showHabits  = habitsTotal > 0 && habitsDoneToday > 0
  const showOverdue = overdue > 0
  const showToday   = dueToday > 0
  const showProgress = inProgress > 0
  const showInbox   = inboxCount > 0

  const hasStats = showOverdue || showToday || showHabits || showProgress || showInbox

  function jumpTo(id: string) {
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const summaryCards = [
    {
      label: 'Tasks', action: 'Open Tasks', onAction: () => jumpTo('work'),
      line: overdue + dueToday > 0 ? `${overdue} overdue · ${dueToday} due today` : 'Queue clear',
    },
    {
      label: 'Habits', action: 'Open Habits', onAction: () => jumpTo('habits'),
      line: habitsTotal > 0 ? `${habitsDoneToday}/${habitsTotal} done today` : 'No habits yet',
    },
    {
      label: 'Life', action: 'Open Life', onAction: () => jumpTo('domains'),
      line: domainsNeedingReview.length > 0 ? `${domainsNeedingReview.length} of ${DOMAINS.length} need review` : `${DOMAINS.length} domains · all steady`,
    },
    {
      label: 'Calendar', action: 'Open Calendar', onAction: () => jumpTo('calendar'),
      line: 'View your schedule',
    },
    {
      label: 'Council', action: 'Ask Council', onAction: () => jumpTo('council'),
      line: '6 advisors ready',
    },
    {
      label: 'Money', action: 'Open Money', onAction: () => jumpTo('money'),
      line: refillsDue > 0
        ? `${refillsDue} to buy again · $${monthlyTotal.toFixed(0)}/mo`
        : `$${monthlyTotal.toFixed(0)}/mo · ${wishItems.length} wishlist · ${subs.length} renewals`,
    },
    {
      label: 'Shared', action: 'Open Shared', onAction: () => jumpTo('shared'),
      line: sharedWithMeCount > 0 ? `${sharedWithMeCount} shared with you` : 'Nothing shared yet',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
      padding: '1.2rem 1.5rem', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '200px', height: '100%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at top right, color-mix(in srgb, var(--gold) 6%, transparent), transparent 70%)',
      }} />

      {summaryParts.length > 0 && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.7rem', lineHeight: 1.5 }}>
          {summaryParts.slice(0, 4).join(' · ')}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {!hasStats && (
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.6 }}>{t('Nothing urgent. A good day to build.', lang)}</span>
          )}
          {showOverdue   && <Stat label={t('overdue (stat)', lang)}  value={overdue}    color="var(--rose)" />}
          {showToday     && <Stat label={t('due today', lang)}       value={dueToday}   color="var(--amber)" />}
          {showProgress  && <Stat label={t('in progress', lang)}     value={inProgress} color="var(--gold)" />}
          {showHabits    && (
            <Stat
              label={weekRate !== null ? (lang === 'ko' ? `습관 · ${weekRate}% 이번 주` : `habits · ${weekRate}% this week`) : t('habits today', lang)}
              value={`${habitsDoneToday}/${habitsTotal}`}
              color={habitsDoneToday === habitsTotal ? 'var(--emerald)' : undefined}
            />
          )}
          {showInbox     && <Stat label={t('in inbox', lang)}        value={inboxCount} color="var(--muted)" />}
        </div>

        <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.68, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right', flexShrink: 0 }}>
          {lang === 'ko' ? fmtDate(new Date(), 'ko') : format(new Date(), 'EEEE, MMM d')}
        </div>
      </div>

      <div style={{ marginTop: '0.9rem', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6, fontStyle: 'italic', paddingTop: '0.7rem', borderTop: '1px solid var(--faint)' }}>
        {lang !== 'ko' && <strong style={{ color: 'var(--text)', fontStyle: 'normal' }}>Suggested next action: </strong>}
        {getInsight()}
      </div>

      <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button onClick={() => window.dispatchEvent(new CustomEvent('app:open-add-task'))} className="btn btn-ghost" style={{ fontSize: '0.68rem' }}>+ Add task</button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('app:focus-capture'))} className="btn btn-ghost" style={{ fontSize: '0.68rem' }}>+ Capture thought</button>
        <button onClick={() => { window.dispatchEvent(new CustomEvent('app:open-inbox')); document.getElementById('brief-inbox')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className="btn btn-ghost" style={{ fontSize: '0.68rem' }}>Review inbox</button>
        <button onClick={onOpenCompanions} className="btn btn-ghost" style={{ fontSize: '0.68rem' }}>Share something</button>
      </div>
    </div>

    <div id="brief-inbox">
      <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.68, marginBottom: '0.5rem' }}>
        Quick Add · Inbox
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.68, marginBottom: '0.5rem' }}>
        Drop a task, thought, reminder, or idea — sort it later.
      </div>
      <CaptureSection userId={userId} />
    </div>

    <div>
      <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.68, marginBottom: '0.5rem' }}>
        Needs Attention
      </div>
      <PulseSection />
    </div>

    <FamilyTodayCard userId={userId} />

    <div>
      <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.68, marginBottom: '0.5rem' }}>
        Everything, at a glance
      </div>
      <div className="grid-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem' }}>
        {summaryCards.map(c => <SummaryCard key={c.label} {...c} />)}
      </div>
    </div>
    </div>
  )
}
