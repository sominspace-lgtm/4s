import { format, parseISO } from 'date-fns'
import type { CouncilEntry } from '@/lib/hooks/useCouncil'

const CHIP: Record<string, React.CSSProperties> = {
  fine:  { background: 'rgba(232,160,192,0.12)', color: 'var(--gold)',  border: '1px solid rgba(232,160,192,0.22)' },
  watch: { background: 'rgba(212,96,154,0.12)',  color: 'var(--rose)',  border: '1px solid rgba(212,96,154,0.22)' },
  quiet: { background: 'rgba(232,228,222,0.06)', color: 'var(--muted)', border: '1px solid var(--border)' },
}

const DOMAIN_LABELS: Record<string, string> = {
  'biz-active': 'Business', 'biz-future': 'Pipeline', 'money': 'Money',
  'health': 'Health', 'relationship': 'Relationship', 'creative': 'Creative',
  'home': 'Home', 'self': 'Self',
}

export default function CouncilEntryCard({ entry }: { entry: CouncilEntry }) {
  const dominated = Object.entries(entry.verdicts)

  return (
    <div style={{ borderBottom: '1px solid var(--faint)', padding: '1rem 0' }}>
      <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.6rem' }}>
        Week of {format(parseISO(entry.week_of), 'MMMM d')}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
        {dominated.map(([domain, r]) => {
          const verdict = typeof r === 'string' ? r : r.verdict
          return (
            <span key={domain} style={{ fontSize: '0.7rem', padding: '0.25em 0.7em', borderRadius: '20px', letterSpacing: '0.03em', ...CHIP[verdict] }}>
              {DOMAIN_LABELS[domain] ?? domain} — {verdict}
            </span>
          )
        })}
      </div>
      {/* Domain notes */}
      {dominated.some(([, r]) => typeof r === 'object' && r.note) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.5rem' }}>
          {dominated.filter(([, r]) => typeof r === 'object' && r.note).map(([domain, r]) => (
            <div key={domain} style={{ fontSize: '0.74rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--text)', opacity: 0.6, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '0.4rem' }}>{DOMAIN_LABELS[domain] ?? domain}</span>
              {typeof r === 'object' ? r.note : ''}
            </div>
          ))}
        </div>
      )}
      {entry.note && <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.55, paddingTop: '0.4rem', borderTop: '1px solid var(--faint)' }}>{entry.note}</div>}
    </div>
  )
}
