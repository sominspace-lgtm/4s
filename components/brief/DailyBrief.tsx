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
import { useFocusItems } from '@/lib/hooks/useFocusItems'
import { DOMAINS } from '@/lib/constants/domains'
import { goToSection } from '@/lib/utils/navigate'
import { guideGreetingLine, proactivityOf } from '@/lib/utils/guideVoice'
import { MODES, type Mode } from '@/lib/constants/modes'
import PulseSection from '@/components/pulse/PulseSection'
import FamilyTodayCard from '@/components/companion/FamilyTodayCard'
import CaptureSection from '@/components/capture/CaptureSection'
import DailyReflection from '@/components/brief/DailyReflection'
import { getLast7Days } from '@/lib/utils/habits'
import { useLang } from '@/lib/LangContext'
import { t, fmtDate, getInsightKO } from '@/lib/i18n'

function weekKey() {
  const d = new Date()
  const onejan = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7)
  return `${d.getFullYear()}-w${week}`
}

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

// One quiet line per area — a calm index, not a second dashboard. The tab
// bar already navigates; this only says whether anything needs you.
function AreaRow({ label, line, onAction }: { label: string; line: string; onAction: () => void }) {
  return (
    <button onClick={onAction} style={{
      display: 'flex', alignItems: 'baseline', gap: '0.75rem', width: '100%',
      background: 'none', border: 'none', borderBottom: '1px solid var(--faint)',
      cursor: 'pointer', textAlign: 'left', padding: '0.55rem 0.2rem',
      fontFamily: 'var(--font-body)',
    }}>
      <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', width: '5.2rem', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.78rem', color: 'var(--text)', flex: 1, lineHeight: 1.4 }}>{line}</span>
      <span aria-hidden style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.5 }}>→</span>
    </button>
  )
}

export default function DailyBrief({ userId, mode = 'peaceful', calendarConnected = false }: { userId: string; mode?: Mode; calendarConnected?: boolean }) {
  const lang = useLang()
  const { items } = useWorkItems()
  const { items: focusItems, snooze: snoozeFocusItem } = useFocusItems()
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

  // A whisper is dismissible for the day, so it never nags.
  const [whisperDismissed, setWhisperDismissed] = useState(false)
  useEffect(() => {
    const key = `4s-whisper-${format(new Date(), 'yyyy-MM-dd')}`
    setWhisperDismissed(localStorage.getItem(key) === '1')
  }, [])
  function dismissWhisper() {
    localStorage.setItem(`4s-whisper-${format(new Date(), 'yyyy-MM-dd')}`, '1')
    setWhisperDismissed(true)
  }

  // Energy Mode — an optional daily read on capacity. Low keeps Brief to
  // essentials. Recovery Mode — for overwhelmed days; persists until lifted
  // and forces the lightest, kindest Brief. Both stored locally, never required.
  const [energy, setEnergy] = useState<'low' | 'normal' | 'high' | null>(null)
  const [recovery, setRecovery] = useState(false)
  useEffect(() => {
    const d = format(new Date(), 'yyyy-MM-dd')
    setEnergy((localStorage.getItem(`4s-energy-${d}`) as 'low' | 'normal' | 'high' | null) || null)
    setRecovery(localStorage.getItem('4s-recovery') === '1')
  }, [])
  function chooseEnergy(v: 'low' | 'normal' | 'high') {
    localStorage.setItem(`4s-energy-${format(new Date(), 'yyyy-MM-dd')}`, v)
    setEnergy(v)
  }
  function enterRecovery() { localStorage.setItem('4s-recovery', '1'); setRecovery(true) }
  function exitRecovery() { localStorage.removeItem('4s-recovery'); setRecovery(false) }
  const lowDay = recovery || energy === 'low'

  // Adaptive Guide suggestion — dismissible per week so it never nags.
  const [adaptiveDismissed, setAdaptiveDismissed] = useState(true)
  useEffect(() => {
    setAdaptiveDismissed(localStorage.getItem(`4s-adaptive-${weekKey()}`) === '1')
  }, [])
  function dismissAdaptive() {
    localStorage.setItem(`4s-adaptive-${weekKey()}`, '1')
    setAdaptiveDismissed(true)
  }
  function applyGuide(next: Mode) {
    window.dispatchEvent(new CustomEvent('4s:set-guide', { detail: next }))
    dismissAdaptive()
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const week  = getLast7Days()

  const hour = new Date().getHours()
  // Brief greets in the active Guide's voice (KO stays neutral for now).
  const greeting = lang === 'ko'
    ? (hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '편안한 저녁이에요')
    : guideGreetingLine(mode, hour)
  // Proactivity shapes how much Brief surfaces: a quiet Guide stays minimal,
  // a proactive one shows an extra quiet-maintenance line.
  const proactivity = proactivityOf(mode)
  const maxParts = lowDay ? 1 : proactivity === 'low' ? 2 : 4

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
  // Only nag about domain reviews once the user has actually started reviewing —
  // a fresh account with zero history shouldn't open on a warning.
  if (domainsNeedingReview.length > 0 && DOMAINS.some(d => touched[d.id])) summaryParts.push(`${domainsNeedingReview[0].label} review due`)
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

  // First-time states read as quiet setup notes, never as alarms —
  // "not reviewed yet" / "nothing tracked yet" instead of "needs review".
  const lifeReviewedOnce = DOMAINS.some(d => touched[d.id])
  const moneyTracksAnything = subs.length > 0 || wishItems.length > 0 || buyItems.length > 0 || giftItems.length > 0

  // Whisper — one gentle, timely nudge. Quiet Guides (low proactivity) stay
  // silent; the rest surface a single soft line, dismissible for the day.
  const giftSoon = giftItems.filter(g => { const d = giftDaysUntil(g); return d >= 0 && d <= 10 }).length
  function pickWhisper(): string | null {
    if (proactivity === 'low') return null
    if (domainsNeedingReview.some(d => d.id === 'relationship')) return 'Someone may deserve a hello today.'
    if (giftSoon > 0) return 'A gift moment is coming up — worth a thought.'
    if (refillsDue > 0) return 'You may be running low on something.'
    if (lifeReviewedOnce && domainsNeedingReview.length > 0) return `${domainsNeedingReview[0].label} could use a quiet check-in.`
    if (overdue > 0) return 'A few things slipped — no need to fix them all at once.'
    if (inboxCount > 4) return 'A few notes are waiting whenever you\'re ready.'
    return null
  }
  const whisper = (whisperDismissed || lowDay) ? null : pickWhisper()

  // Adaptive Guide — read the week and gently suggest a fitting Guide. Only
  // surfaces a Guide different from the current one; the user always chooses.
  function suggestGuide(): { guide: Mode; reason: string } | null {
    if (overdue >= 5) return { guide: 'executive', reason: 'A lot is overdue — Executive keeps things to the essentials.' }
    const maintenance = (lifeReviewedOnce ? domainsNeedingReview.length : 0) + refillsDue + (moneyTracksAnything ? moneyDueSoon : 0)
    if (maintenance >= 3) return { guide: 'butler', reason: 'A few quiet tasks are piling up — Butler keeps them handled.' }
    if (overdue === 0 && dueToday === 0 && habitsDueCount === 0 && inboxCount <= 2) return { guide: 'peaceful', reason: 'Things look calm — Peaceful keeps it light.' }
    return null
  }
  const suggestion = adaptiveDismissed ? null : suggestGuide()
  const showAdaptive = suggestion && suggestion.guide !== mode ? suggestion : null

  const summaryCards = [
    {
      label: 'Tasks', action: 'Open Tasks', onAction: () => goToSection('work'),
      line: overdue + dueToday > 0 ? `${overdue} overdue · ${dueToday} due today` : 'Queue clear',
    },
    {
      label: 'Habits', action: 'Open Habits', onAction: () => goToSection('habits'),
      line: habitsTotal > 0 ? `${habitsDoneToday}/${habitsTotal} done today` : habits.length > 0 ? 'No habits due today' : 'No habits yet',
    },
    {
      label: 'Life', action: 'Open Life', onAction: () => goToSection('domains'),
      line: !lifeReviewedOnce
        ? `${DOMAINS.length} domains · not reviewed yet`
        : domainsNeedingReview.length > 0 ? `${domainsNeedingReview.length} of ${DOMAINS.length} · review due` : `${DOMAINS.length} domains · all steady`,
    },
    {
      label: 'Calendar', action: 'Open Calendar', onAction: () => goToSection('calendar'),
      line: calendarConnected ? 'View your schedule' : 'Not connected yet',
    },
    {
      label: 'Council', action: 'Ask Council', onAction: () => goToSection('council'),
      line: '6 advisors ready',
    },
    {
      label: 'Money', action: 'Open Money', onAction: () => goToSection('money'),
      line: !moneyTracksAnything
        ? 'Nothing tracked yet'
        : refillsDue > 0
          ? `${refillsDue} to buy again · $${monthlyTotal.toFixed(0)}/mo`
          : `$${monthlyTotal.toFixed(0)}/mo · ${wishItems.length} wishlist · ${subs.length} renewals`,
    },
    {
      label: 'Shared', action: 'Open Shared', onAction: () => goToSection('shared'),
      line: sharedWithMeCount > 0 ? `${sharedWithMeCount} shared with you` : 'Nothing shared yet',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    {showAdaptive && lang !== 'ko' && (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap',
        background: 'color-mix(in srgb, var(--gold) 7%, var(--surface))',
        border: '1px solid color-mix(in srgb, var(--gold) 22%, var(--border))',
        borderRadius: '12px', padding: '0.7rem 1rem',
      }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text)', flex: 1, minWidth: '180px', lineHeight: 1.5 }}>
          <span style={{ color: 'var(--muted)' }}>{showAdaptive.reason}</span>
        </span>
        <button onClick={() => applyGuide(showAdaptive.guide)} className="btn btn-primary" style={{ fontSize: '0.7rem' }}>
          Try {MODES[showAdaptive.guide].label}
        </button>
        <button onClick={dismissAdaptive} className="btn btn-ghost" style={{ fontSize: '0.7rem' }}>Not now</button>
      </div>
    )}
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
      padding: '1.2rem 1.5rem', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '200px', height: '100%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at top right, color-mix(in srgb, var(--gold) 6%, transparent), transparent 70%)',
      }} />

      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 3.5vw, 1.9rem)', fontWeight: 300, color: 'var(--text)', lineHeight: 1, marginBottom: '0.7rem' }}>
        {greeting}
      </div>

      {recovery ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.7rem', padding: '0.55rem 0.85rem', borderRadius: '10px', background: 'color-mix(in srgb, var(--emerald) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--emerald) 20%, transparent)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>Recovery mode. Just the essentials today — you&apos;re doing enough.</span>
          <button onClick={exitRecovery} className="btn btn-ghost" style={{ fontSize: '0.68rem', marginLeft: 'auto' }}>I&apos;m okay now</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.7rem' }}>
          <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', opacity: 0.7, marginRight: '0.2rem' }}>Energy</span>
          {(['low', 'normal', 'high'] as const).map(v => (
            <button key={v} onClick={() => chooseEnergy(v)} style={{
              fontSize: '0.66rem', padding: '0.2rem 0.65rem', borderRadius: '99px', cursor: 'pointer',
              fontFamily: 'var(--font-body)', textTransform: 'capitalize', transition: 'all var(--t-fast)',
              border: `1px solid ${energy === v ? 'var(--gold)' : 'var(--border)'}`,
              background: energy === v ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'transparent',
              color: energy === v ? 'var(--gold)' : 'var(--muted)',
            }}>{v}</button>
          ))}
          <button onClick={enterRecovery} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.64rem', color: 'var(--muted)', opacity: 0.7 }}>Overwhelmed?</button>
        </div>
      )}

      {!lowDay && summaryParts.length > 0 && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.7rem', lineHeight: 1.5 }}>
          {summaryParts.slice(0, maxParts).join(' · ')}
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

      {whisper && (
        <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          <span aria-hidden style={{ color: 'var(--gold)', opacity: 0.7 }}>❋</span>
          <span style={{ flex: 1, fontStyle: 'italic' }}>{whisper}</span>
          <button onClick={dismissWhisper} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.5, fontSize: '0.7rem', padding: '0 0.2rem' }}>✕</button>
        </div>
      )}

      {/* Two quiet actions — the inbox lives one scroll below, sharing lives in Shared */}
      <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button onClick={() => window.dispatchEvent(new CustomEvent('app:open-add-task'))} className="btn btn-ghost" style={{ fontSize: '0.68rem' }}>+ Add task</button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('app:focus-capture'))} className="btn btn-ghost" style={{ fontSize: '0.68rem' }}>+ Capture thought</button>
      </div>
    </div>

    <DailyReflection />

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
        {focusItems.length > 0 ? 'Needs Attention' : 'Quiet for now'}
      </div>
      {focusItems.length > 0 ? (
        <PulseSection items={focusItems} snooze={snoozeFocusItem} />
      ) : (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px',
          padding: '0.9rem 1.2rem', fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic',
        }}>
          Nothing needs your attention right now.
        </div>
      )}
    </div>

    <FamilyTodayCard userId={userId} />

    {!lowDay && (
      <div>
        <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.68, marginBottom: '0.5rem' }}>
          Everything, at a glance
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0.4rem 1rem' }}>
          {summaryCards.map(c => <AreaRow key={c.label} label={c.label} line={c.line} onAction={c.onAction} />)}
        </div>
      </div>
    )}
    </div>
  )
}
