'use client'

import { format } from 'date-fns'
import { useWorkItems, dueUrgency } from '@/lib/hooks/useWorkItems'
import { useHabits } from '@/lib/hooks/useHabits'
import { useCaptures } from '@/lib/hooks/useCaptures'
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

export default function DailyBrief() {
  const lang = useLang()
  const { items } = useWorkItems()
  const { habits, completions } = useHabits()
  const { captures } = useCaptures()

  const today = format(new Date(), 'yyyy-MM-dd')
  const week  = getLast7Days()

  const dueToday   = items.filter(i => dueUrgency(i.due_date) === 'today'   && i.status !== 'done').length
  const overdue    = items.filter(i => dueUrgency(i.due_date) === 'overdue' && i.status !== 'done').length
  const inProgress = items.filter(i => i.status === 'in-progress').length
  const inboxCount = captures.length

  const habitsTotal     = habits.length
  const habitsDoneToday = habits.filter(h => (completions[h.id] ?? []).includes(today)).length
  const weekRate = habitsTotal === 0 ? null : Math.round(
    habits.reduce((sum, h) => {
      const done = new Set(completions[h.id] ?? [])
      return sum + week.filter(d => done.has(d)).length
    }, 0) / (habitsTotal * week.length) * 100
  )

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

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
      padding: '1.2rem 1.5rem', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '200px', height: '100%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at top right, color-mix(in srgb, var(--gold) 6%, transparent), transparent 70%)',
      }} />

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

        <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.5, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right', flexShrink: 0 }}>
          {lang === 'ko' ? fmtDate(new Date(), 'ko') : format(new Date(), 'EEEE, MMM d')}
        </div>
      </div>

      <div style={{ marginTop: '0.9rem', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6, fontStyle: 'italic', paddingTop: '0.7rem', borderTop: '1px solid var(--faint)' }}>
        {getInsight()}
      </div>
    </div>
  )
}
