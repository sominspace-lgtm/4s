'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useWorkItems, dueUrgency } from '@/lib/hooks/useWorkItems'
import { useHabits, isDueOn } from '@/lib/hooks/useHabits'
import { useCaptures } from '@/lib/hooks/useCaptures'
import { useSubscriptions, urgency as subUrgency } from '@/lib/hooks/useSubscriptions'
import { useGiftOccasions, usePeople, daysSinceContact } from '@/lib/hooks/usePeople'
import { useNotes } from '@/lib/hooks/useNotes'
import { useWatchItems } from '@/lib/hooks/useWatchItems'
import { useBuyItems, computeStatus } from '@/lib/hooks/useBuyItems'
import { useFocusItems } from '@/lib/hooks/useFocusItems'
import { plantFor } from '@/lib/village/state'
import TodayHouseholdNeeds from '@/components/brief/TodayHouseholdNeeds'
import CheckinCard from '@/components/checkin/CheckinCard'
import CalendarEmbed from '@/components/calendar/CalendarEmbed'
import Icon from '@/components/ui/Icon'
import { goToSection, goToPersonal } from '@/lib/utils/navigate'
import { guideGreetingLine, proactivityOf } from '@/lib/utils/guideVoice'
import { MODES, type Mode } from '@/lib/constants/modes'
import PulseSection from '@/components/pulse/PulseSection'
import AttentionBudget from '@/components/brief/AttentionBudget'
import { REORDERABLE, type TodayBlockId, type TodayBlockConfig } from '@/lib/utils/todayBlocks'
import Breathing from '@/components/focus/Breathing'

const CALM_QUOTES = [
  "You don't have to do everything today.",
  'One breath, then one small thing.',
  'Rest is productive too.',
  "This will pass — you've moved through hard days before.",
  'Slow is smooth, and smooth is calm.',
  'Do less, but do it gently.',
]
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


export default function DailyBrief({ userId, mode = 'peaceful', calendarConnected = false, blocks, onOpenCustomize }: {
  userId: string
  mode?: Mode
  calendarConnected?: boolean
  blocks: TodayBlockConfig[]
  onOpenCustomize: () => void
}) {
  const isHidden = (id: TodayBlockId) => blocks.find(b => b.id === id)?.hidden ?? false
  // The three siblings that can actually change position (see REORDERABLE in
  // lib/utils/todayBlocks.ts) — filtered and kept in whatever order the
  // saved blocks array puts them, then rendered by looping over this instead
  // of writing each one out by hand.
  const tailOrder = blocks.filter(b => REORDERABLE.has(b.id) && !b.hidden).map(b => b.id)
  const lang = useLang()
  const { items } = useWorkItems()
  const { items: focusItems, snooze: snoozeFocusItem } = useFocusItems()
  const { habits, completions } = useHabits()
  const { captures } = useCaptures()
  const { subs, total: monthlyTotal } = useSubscriptions()
  const giftItems = useGiftOccasions()
  const { people } = usePeople()
  const { notes } = useNotes(null)
  const { items: wishItems } = useWatchItems()
  const { items: buyItems } = useBuyItems()

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
  // A calming line for recovery days, chosen client-side to avoid a hydration
  // mismatch, and refreshed each time recovery is entered.
  const [quote, setQuote] = useState(CALM_QUOTES[0])
  function pickQuote() { setQuote(CALM_QUOTES[Math.floor(Math.random() * CALM_QUOTES.length)]) }
  useEffect(pickQuote, [])
  function enterRecovery() { localStorage.setItem('4s-recovery', '1'); setRecovery(true); pickQuote() }
  function exitRecovery() { localStorage.removeItem('4s-recovery'); setRecovery(false) }
  // Enter Focus view (the timer + decluttered layout) from anywhere in Brief.
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

  // Replaces the old domainsNeedingReview signal (2026-08-21) — Life/Domains
  // is gone, so "who hasn't been contacted in a while" comes straight from
  // real relationship data instead of a proxy category-review heuristic.
  const peopleQuiet = people.filter(p => {
    const since = daysSinceContact(p.last_contact)
    return since !== null && since > 30
  })
  const refillsDue = buyItems.filter(b => ['due-to-buy', 'overdue'].includes(computeStatus(b))).length
  const moneyDueSoon = subs.filter(s => subUrgency(s.renewal_date) === 'soon').length
    + giftItems.filter(g => g.days <= 7).length
    + refillsDue
  const habitsDueCount = habitsTotal > habitsDoneToday ? habitsTotal - habitsDoneToday : 0

  const summaryParts: string[] = []
  if (inboxCount > 0) summaryParts.push(`${inboxCount} inbox item${inboxCount > 1 ? 's' : ''}`)
  if (overdue > 0) summaryParts.push(`${overdue} overdue task${overdue > 1 ? 's' : ''}`)
  else if (dueToday > 0) summaryParts.push(`${dueToday} due today`)
  if (peopleQuiet.length > 0) summaryParts.push(`${peopleQuiet.length} hello${peopleQuiet.length > 1 ? 's' : ''} overdue`)
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
  const moneyTracksAnything = subs.length > 0 || wishItems.length > 0 || buyItems.length > 0 || giftItems.length > 0

  // Whisper — one gentle, timely nudge. Quiet Guides (low proactivity) stay
  // silent; the rest surface a single soft line, dismissible for the day.
  const giftSoon = giftItems.filter(g => { return g.days >= 0 && g.days <= 10 }).length
  // Two concrete automations (2026-08-20), living in the same one-nudge-a-day
  // whisper rather than a new mechanism of their own — the whole point of a
  // "when X, gently say Y" layer is that it composes with what's already
  // here, not that it competes with it for attention.
  //
  // Dormant, not "behind" — plantFor() is the SAME function the Village and
  // every habit row already use, so this can never disagree with what those
  // show. A plant going dormant is explicitly not a demotion (see its own
  // header comment in lib/village/state.ts); the copy here has to match that
  // or it's just a guilt trip wearing the village's language.
  const dormantHabits = habits.filter(h => !h.paused && plantFor(h, completions[h.id] ?? []).dormant)
  function pickWhisper(): string | null {
    if (proactivity === 'low') return null
    // A cluster, not any overdue task — one slipped thing doesn't need its
    // own automation, the existing generic line below already covers that.
    // Checked ahead of it because it's the more specific, more useful thing
    // to say once there's enough of a pile that naming a real next step
    // (one focused stretch, not "catch up on everything") actually helps.
    if (overdue >= 3) return `${overdue} things are overdue — one focused stretch might clear more than piecemeal would.`
    if (peopleQuiet.length > 0) return 'Someone may deserve a hello today.'
    if (giftSoon > 0) return 'A gift moment is coming up — worth a thought.'
    if (refillsDue > 0) return 'You may be running low on something.'
    if (dormantHabits.length > 0) {
      return dormantHabits.length === 1
        ? `${dormantHabits[0].name} has gone quiet — it's still yours whenever you come back to it.`
        : `${dormantHabits.length} habits have gone quiet — still yours, whenever.`
    }
    if (overdue > 0) return 'A few things slipped — no need to fix them all at once.'
    if (inboxCount > 4) return 'A few notes are waiting whenever you\'re ready.'
    return null
  }
  const whisper = (whisperDismissed || lowDay) ? null : pickWhisper()

  // Adaptive Guide — read the week and gently suggest a fitting Guide. Only
  // surfaces a Guide different from the current one; the user always chooses.
  function suggestGuide(): { guide: Mode; reason: string } | null {
    if (overdue >= 5) return { guide: 'executive', reason: 'A lot is overdue — Executive keeps things to the essentials.' }
    const maintenance = peopleQuiet.length + refillsDue + (moneyTracksAnything ? moneyDueSoon : 0)
    if (maintenance >= 3) return { guide: 'friend', reason: 'A few quiet tasks are piling up — Friend keeps an eye on them with you.' }
    if (overdue === 0 && dueToday === 0 && habitsDueCount === 0 && inboxCount <= 2) return { guide: 'peaceful', reason: 'Things look calm — Peaceful keeps it light.' }
    return null
  }
  const suggestion = adaptiveDismissed ? null : suggestGuide()
  const showAdaptive = suggestion && suggestion.guide !== mode ? suggestion : null

  const summaryCards = [
    {
      label: 'Tasks', action: 'Open Tasks', onAction: () => goToPersonal('tasks'),
      line: overdue + dueToday > 0 ? `${overdue} overdue · ${dueToday} due today` : 'Queue clear',
    },
    {
      label: 'Habits', action: 'Open Habits', onAction: () => goToPersonal('habits'),
      line: habitsTotal > 0 ? `${habitsDoneToday}/${habitsTotal} done today` : habits.length > 0 ? 'No habits due today' : 'No habits yet',
    },
    {
      label: 'Notes', action: 'Open Notes', onAction: () => goToPersonal('notes'),
      line: notes.length > 0 ? `${notes.length} note${notes.length === 1 ? '' : 's'}` : 'Nothing jotted down yet',
    },
    {
      // Calendar is a panel further down this same tab now, so this scrolls
      // rather than navigates.
      label: 'Calendar', action: 'See the month', onAction: () => goToSection('brief-calendar'),
      line: 'Your month, from everything dated',
    },
    {
      label: 'Money', action: 'Open Money', onAction: () => goToPersonal('money'),
      line: !moneyTracksAnything
        ? 'Nothing tracked yet'
        : refillsDue > 0
          ? `${refillsDue} to buy again · $${monthlyTotal.toFixed(0)}/mo`
          : `$${monthlyTotal.toFixed(0)}/mo · ${wishItems.length} wishlist · ${subs.length} renewals`,
    },
    {
      label: 'People', action: 'Open People', onAction: () => goToPersonal('people'),
      line: peopleQuiet.length > 0 ? `${peopleQuiet.length} to reach out to` : `${people.length} ${people.length === 1 ? 'person' : 'people'}`,
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
        <button onClick={() => applyGuide(showAdaptive.guide)} className="btn btn-primary press" style={{ fontSize: '0.7rem' }}>
          Try {MODES[showAdaptive.guide].label}
        </button>
        <button onClick={dismissAdaptive} className="btn btn-ghost" style={{ fontSize: '0.7rem' }}>Not now</button>
      </div>
    )}

    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
      padding: '0.8rem 1.3rem', position: 'relative', overflow: 'hidden',
      boxShadow: 'var(--elev-1)',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '200px', height: '100%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at top right, color-mix(in srgb, var(--gold) 6%, transparent), transparent 70%)',
      }} />

      {/* Stepped down again (2026-08-27) — this card used to be the page's
          own header; now the village below it is the actual hero, so this
          is a quiet line ABOVE the world, not a header the world sits under.
          Smaller size, tighter margin, same "steps down from hero to
          context" reasoning as the 2026-08-25 comment this replaces, just
          carried one step further now that there's a real hero to defer to. */}
      {/* suppressHydrationWarning (2026-08-27 fix) — greeting depends on the
          browser's own local hour (`new Date().getHours()` above), which
          genuinely and correctly differs from the server's guess at
          whatever hour it happens to be wherever the server actually is.
          Without this, React treats that as a real mismatch on every load:
          discards the server-rendered tree, does a full client re-render —
          which reads as "the screen flashes," not just the theme swap
          fixed separately in ThemeProvider. Same fix as Header.tsx's own
          greeting/date spans. */}
      <div suppressHydrationWarning style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 400, color: 'var(--muted)', lineHeight: 1.3, marginBottom: '0.4rem' }}>
        {greeting}
      </div>

      {recovery ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.6rem', marginBottom: '0.5rem', padding: '1.2rem 1rem', borderRadius: '14px', background: 'color-mix(in srgb, var(--emerald) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--emerald) 20%, transparent)' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>Just the essentials today — you&apos;re doing enough.</span>
          <Breathing />
          <span style={{ fontSize: '0.82rem', color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.5, maxWidth: '22rem' }}>{quote}</span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.2rem' }}>
            <button onClick={exitRecovery} className="btn btn-ghost" style={{ fontSize: '0.7rem' }}>I&apos;m okay now</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
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
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <button onClick={enterRecovery} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.64rem', color: 'var(--muted)', opacity: 0.7 }}>Overwhelmed?</button>
          </div>
        </div>
      )}

      {!lowDay && summaryParts.length > 0 && (
        <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
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

        <div suppressHydrationWarning style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.68, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right', flexShrink: 0 }}>
          {lang === 'ko' ? fmtDate(new Date(), 'ko') : format(new Date(), 'EEEE, MMM d')}
        </div>
      </div>

      {!recovery && !isHidden('budget') && lang !== 'ko' && (
        <div style={{ marginTop: '0.8rem' }}>
          <AttentionBudget items={items} />
        </div>
      )}

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
        {/* Both used to just dispatch the event directly — a no-op unless
            you happened to already be on the tab that mounts the listener
            (Personal > Tasks for the first, Brief's own CaptureSection for
            the second, which IS this page, so that one worked by accident).
            "+ Add task" never navigated anywhere first, so clicking it here
            silently did nothing. Same fix JourneyBar's runAction() already
            uses: navigate, then dispatch after the target has had a moment
            to mount (2026-08-22). */}
        <button onClick={() => { goToPersonal('tasks'); setTimeout(() => window.dispatchEvent(new CustomEvent('app:open-add-task')), 80) }} className="btn btn-ghost" style={{ fontSize: '0.68rem' }}>+ Add task</button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('app:focus-capture'))} className="btn btn-ghost" style={{ fontSize: '0.68rem' }}>+ Capture thought</button>
      </div>
    </div>

    {/* Needs Attention and the household card are status, not preference —
        they're not part of the customizable block set, so they keep a fixed
        spot rather than being interspersed among blocks whose order can
        change. Moved here (used to sit between Inbox and the area index)
        so the three reorderable blocks below form one contiguous, genuinely
        reorderable group instead of three siblings separated by fixed ones. */}
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

    {tailOrder.map(id => {
      // The weekly relationship check-in — self-hides except near the
      // weekend / once someone's answered (2026-09-01).
      if (id === 'checkin') return <CheckinCard key="checkin" userId={userId} />
      if (id === 'areas' && !lowDay) return (
        <div key="areas">
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.68, marginBottom: '0.5rem' }}>
            Everything, at a glance
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0.4rem 1rem' }}>
            {summaryCards.map(c => <AreaRow key={c.label} label={c.label} line={c.line} onAction={c.onAction} />)}
          </div>
        </div>
      )
      // A real "what needs you" panel, not a shortcut (2026-08-25 round
      // two) — chores due and shopping needed, read straight from the same
      // household data the real Household tab uses, not a second copy of
      // it. See TodayHouseholdNeeds.
      if (id === 'household') return <TodayHouseholdNeeds key="household" userId={userId} />
      return null
    })}

    {/* Calendar — its own block near the bottom of Today. */}
    {!isHidden('calendar') && (
      <div id="brief-calendar">
        <CalendarEmbed userId={userId} />
      </div>
    )}

    <button onClick={onOpenCustomize} className="btn btn-ghost press" style={{ fontSize: '0.64rem', alignSelf: 'flex-start', opacity: 0.6, display: 'inline-flex', alignItems: 'center', gap: '0.35em' }}>
      <Icon name="gear" size={11} /> Customize Today
    </button>
    </div>
  )
}
