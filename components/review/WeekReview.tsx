'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { startOfWeek, endOfWeek, format, parseISO, isWithinInterval, subWeeks, differenceInDays } from 'date-fns'
import { useLang } from '@/lib/LangContext'
import { t, fmtWeekOf } from '@/lib/i18n'
import { useSubscriptions } from '@/lib/hooks/useSubscriptions'
import { useGiftEvents, daysUntil } from '@/lib/hooks/useGiftEvents'
import { useDomainTouched } from '@/lib/hooks/useDomainTouched'
import { DOMAINS } from '@/lib/constants/domains'

interface WeekData {
  doneItems:       number
  totalItems:      number
  habitsCompleted: number
  totalHabits:     number
  captures:        number
  topProject:      string | null
  streak:          number
}

export default function WeekReview() {
  const lang = useLang()
  const supabase = createClient()
  const [data, setData] = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)
  const { subs, total: monthlyTotal } = useSubscriptions()
  const { items: giftItems } = useGiftEvents()
  const { touched } = useDomainTouched()

  useEffect(() => {
    async function load() {
      const now = new Date()
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const weekEnd   = endOfWeek(now,   { weekStartsOn: 1 })
      const prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })

      const [workRes, habitsRes, completionsRes, capturesRes] = await Promise.all([
        supabase.from('work_items').select('id, status, project, completed_at'),
        supabase.from('habits').select('id, name'),
        supabase.from('habit_completions').select('habit_id, completed_on').gte('completed_on', format(prevStart, 'yyyy-MM-dd')),
        supabase.from('captures').select('id, created_at').gte('created_at', weekStart.toISOString()),
      ])

      const work       = workRes.data ?? []
      const habits     = habitsRes.data ?? []
      const completions = completionsRes.data ?? []
      const caps       = capturesRes.data ?? []

      // Done this week
      const doneThisWeek = work.filter(w =>
        w.status === 'done' && w.completed_at &&
        isWithinInterval(parseISO(w.completed_at), { start: weekStart, end: weekEnd })
      )

      // Habits this week
      const thisWeekCompletions = completions.filter(c =>
        isWithinInterval(parseISO(c.completed_on), { start: weekStart, end: weekEnd })
      )
      const uniqueHabits = new Set(thisWeekCompletions.map(c => c.habit_id)).size

      // Top project
      const projectCounts: Record<string, number> = {}
      for (const w of doneThisWeek) {
        if (w.project) projectCounts[w.project] = (projectCounts[w.project] ?? 0) + 1
      }
      const topProject = Object.entries(projectCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

      // Habit streak (days in a row this week with at least 1 completion)
      let streak = 0
      const today = format(now, 'yyyy-MM-dd')
      for (let d = 6; d >= 0; d--) {
        const date = format(new Date(weekStart.getTime() + d * 86400000), 'yyyy-MM-dd')
        if (date > today) continue
        if (completions.some(c => c.completed_on === date)) streak++
        else break
      }

      setData({
        doneItems:       doneThisWeek.length,
        totalItems:      work.filter(w => w.status !== 'done').length,
        habitsCompleted: uniqueHabits,
        totalHabits:     habits.length,
        captures:        caps.length,
        topProject,
        streak,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !data) return null
  if (data.doneItems === 0 && data.habitsCompleted === 0 && data.captures === 0) return null

  const weekLabel = lang === 'ko'
    ? fmtWeekOf(startOfWeek(new Date(), { weekStartsOn: 1 }))
    : `Week of ${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')}`

  const neglectedDomains = DOMAINS.filter(d => {
    const last = touched[d.id]
    return !last || differenceInDays(new Date(), parseISO(last)) > 7
  })
  const nextReminder = [...subs].filter(s => s.renewal_date)
    .map(s => ({ label: s.name, days: differenceInDays(parseISO(s.renewal_date!), new Date()) }))
    .concat(giftItems.map(g => ({ label: g.name, days: daysUntil(g) })))
    .sort((a, b) => a.days - b.days)[0]

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: '14px',
      padding: '1.25rem 1.5rem', marginBottom: '1rem',
      background: 'linear-gradient(135deg, color-mix(in srgb, var(--gold) 5%, var(--surface)), var(--surface))',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text)', fontWeight: 400 }}>{t('Week in Review', lang)}</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.68, marginTop: '0.1rem' }}>{weekLabel}</div>
        </div>
        {data.streak > 1 && (
          <div style={{ fontSize: '0.72rem', color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 10%, transparent)', padding: '0.3rem 0.75rem', borderRadius: '99px', border: '1px solid color-mix(in srgb, var(--gold) 20%, transparent)' }}>
            {data.streak}{t('d streak', lang)}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        <Stat value={data.doneItems} label={t('tasks done', lang)} color="var(--emerald)" />
        <Stat value={data.habitsCompleted} label={lang === 'ko' ? `${data.totalHabits}개 습관 중` : `of ${data.totalHabits} habits`} color="var(--purple)" />
        <Stat value={data.captures} label={t('ideas captured', lang)} color="var(--amber)" />
      </div>

      {data.topProject && (
        <div style={{ marginTop: '0.85rem', fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.78 }}>
          {t('Most active:', lang)} <span style={{ color: 'var(--gold)' }}>{data.topProject}</span>
        </div>
      )}

      {(monthlyTotal > 0 || neglectedDomains.length > 0 || nextReminder) && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.78, lineHeight: 1.6 }}>
          {monthlyTotal > 0 && <>${monthlyTotal.toFixed(0)}/mo in subscriptions</>}
          {neglectedDomains.length > 0 && <>{monthlyTotal > 0 ? ' · ' : ''}{neglectedDomains[0].label} needs a check-in</>}
          {nextReminder && <>{(monthlyTotal > 0 || neglectedDomains.length > 0) ? ' · ' : ''}{nextReminder.label} in {nextReminder.days}d</>}
        </div>
      )}

      <div style={{ marginTop: '1rem', paddingTop: '0.9rem', borderTop: '1px solid var(--faint)', fontSize: '0.78rem', color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.6 }}>
        What should next week feel like?
      </div>
    </div>
  )
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0.6rem', borderRadius: '10px', background: 'rgba(255,255,255,0.025)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.78, marginTop: '0.2rem' }}>{label}</div>
    </div>
  )
}
