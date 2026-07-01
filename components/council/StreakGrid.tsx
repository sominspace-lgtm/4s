import { format, subWeeks, startOfWeek } from 'date-fns'
import type { CouncilEntry } from '@/lib/hooks/useCouncil'

const DOMAINS = ['biz-active','biz-future','money','health','relationship','creative','home','self']
const LABELS: Record<string, string> = {
  'biz-active':'Business','biz-future':'Pipeline','money':'Money',
  'health':'Health','relationship':'Relationship','creative':'Creative','home':'Home','self':'Self',
}
const DOT: Record<string, React.CSSProperties> = {
  fine:  { background: 'rgba(232,160,192,0.5)' },
  watch: { background: 'rgba(212,96,154,0.55)' },
  quiet: { background: 'rgba(245,232,240,0.1)', border: '1px solid rgba(245,232,240,0.12)' },
  empty: { background: 'rgba(245,232,240,0.04)', border: '1px dashed rgba(245,232,240,0.1)' },
}

export default function StreakGrid({ entries }: { entries: CouncilEntry[] }) {
  const weeks = Array.from({ length: 6 }, (_, i) =>
    format(startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  ).reverse()

  const byWeek = Object.fromEntries(entries.map(e => [e.week_of, e.verdicts]))

  return (
    <div style={{ marginTop: '1.4rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: '0.63rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.8rem' }}>
        6-week pattern
      </div>
      {DOMAINS.map(domain => (
        <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.45rem' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', width: '90px', flexShrink: 0 }}>{LABELS[domain]}</div>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {weeks.map(w => {
              const r = byWeek[w]?.[domain]
              const verdict = !r ? 'empty' : typeof r === 'string' ? r : r.verdict
              return <div key={w} style={{ width: 12, height: 12, borderRadius: '3px', flexShrink: 0, ...DOT[verdict] }} />
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
