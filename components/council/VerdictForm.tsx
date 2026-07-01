'use client'

import { useState } from 'react'
import { computeHabitInsights, getLast7Days } from '@/lib/utils/habits'
import type { Verdict, DomainReflection } from '@/lib/hooks/useCouncil'

const DOMAINS = [
  { id: 'biz-active', label: 'Business', prompt: 'How did work feel this week?' },
  { id: 'biz-future', label: 'Pipeline', prompt: 'Anything brewing or stalling?' },
  { id: 'money', label: 'Money', prompt: 'How does your financial picture feel?' },
  { id: 'health', label: 'Health', prompt: 'Body and mind — what stood out?' },
  { id: 'relationship', label: 'Relationship', prompt: 'How was your connection this week?' },
  { id: 'creative', label: 'Creative', prompt: 'Did you make anything or feel inspired?' },
  { id: 'home', label: 'Home', prompt: 'Is your space and admin in order?' },
  { id: 'self', label: 'Self', prompt: 'How are you, really?' },
]

const BTN: Record<Verdict, React.CSSProperties> = {
  fine:  { background: 'rgba(232,160,192,0.15)', color: 'var(--gold)',  borderColor: 'rgba(232,160,192,0.35)' },
  watch: { background: 'rgba(212,96,154,0.15)',  color: 'var(--rose)',  borderColor: 'rgba(212,96,154,0.35)' },
  quiet: { background: 'rgba(232,228,222,0.08)', color: 'var(--muted)', borderColor: 'rgba(255,255,255,0.15)' },
}

interface VerdictFormProps {
  habits: { id: string; name: string; category: string | null }[]
  completions: Record<string, string[]>
  onSave: (verdicts: Record<string, DomainReflection>, note: string) => void
}

export default function VerdictForm({ habits, completions, onSave }: VerdictFormProps) {
  const [reflections, setReflections] = useState<Record<string, DomainReflection>>(
    Object.fromEntries(DOMAINS.map(d => [d.id, { verdict: 'quiet', note: '' }]))
  )
  const [overallNote, setOverallNote] = useState('')

  const insights = computeHabitInsights(habits, completions, getLast7Days())
  const insightMap = Object.fromEntries(insights.map(i => [i.domain, i]))

  function setVerdict(domain: string, verdict: Verdict) {
    setReflections(prev => ({ ...prev, [domain]: { ...prev[domain], verdict } }))
  }

  function setNote(domain: string, note: string) {
    setReflections(prev => ({ ...prev, [domain]: { ...prev[domain], note } }))
  }

  function handleSave() {
    onSave(reflections, overallNote)
    setReflections(Object.fromEntries(DOMAINS.map(d => [d.id, { verdict: 'quiet', note: '' }])))
    setOverallNote('')
  }

  return (
    <div style={{ marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '1.2rem' }}>
        This week&apos;s session
      </div>

      {DOMAINS.map(d => {
        const r = reflections[d.id]
        const insight = insightMap[d.id]
        return (
          <div key={d.id} style={{ marginBottom: '1.2rem', paddingBottom: '1.2rem', borderBottom: '1px solid var(--faint)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 400 }}>{d.label}</div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {(['fine', 'watch', 'quiet'] as Verdict[]).map(v => (
                  <button key={v} onClick={() => setVerdict(d.id, v)} style={{
                    fontSize: '0.65rem', padding: '0.25em 0.65em', borderRadius: '20px',
                    borderWidth: '1px', borderStyle: 'solid', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                    ...(r.verdict === v ? BTN[v] : { background: 'transparent', color: 'var(--muted)', borderColor: 'var(--border)' }),
                  }}>{v}</button>
                ))}
              </div>
            </div>

            {insight && (
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '0.4rem', opacity: 0.8 }}>
                Habits: {insight.completedThisWeek}/{insight.totalHabits * 7} days
                <span style={{ fontStyle: 'normal', marginLeft: '0.35rem', padding: '0.1em 0.4em', borderRadius: '4px', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.06em', ...(insight.suggestion === 'fine' ? { color: 'var(--gold)', background: 'rgba(232,160,192,0.12)' } : insight.suggestion === 'watch' ? { color: 'var(--rose)', background: 'rgba(212,96,154,0.12)' } : { color: 'var(--muted)' }) }}>
                  → {insight.suggestion}
                </span>
              </div>
            )}

            <input
              value={r.note}
              onChange={e => setNote(d.id, e.target.value)}
              placeholder={d.prompt}
              aria-label={`${d.label} reflection`}
              style={{
                width: '100%', background: 'var(--bg)', borderWidth: '1px', borderStyle: 'solid',
                borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)',
                fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 300,
                padding: '0.5rem 0.7rem', outline: 'none',
              }}
            />
          </div>
        )
      })}

      <textarea
        value={overallNote}
        onChange={e => setOverallNote(e.target.value)}
        placeholder="Overall — what pattern is this week revealing?"
        rows={2}
        style={{
          width: '100%', background: 'var(--bg)', borderWidth: '1px', borderStyle: 'solid',
          borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)',
          fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 300,
          padding: '0.6rem 0.8rem', resize: 'none', outline: 'none', marginBottom: '0.6rem',
        }}
      />
      <button onClick={handleSave} style={{
        padding: '0.5em 1.4em', borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)',
        color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
        letterSpacing: '0.05em', cursor: 'pointer',
      }}>
        Save this week
      </button>
    </div>
  )
}
