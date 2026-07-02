'use client'

import { useState } from 'react'
import { useHabits } from '@/lib/hooks/useHabits'
import { useSubscriptions } from '@/lib/hooks/useSubscriptions'
import { useBuyItems } from '@/lib/hooks/useBuyItems'
import { useDomainTouched } from '@/lib/hooks/useDomainTouched'
import { generateCouncilAdvice, type CouncilAdvice } from '@/lib/utils/council'
import type { Mode } from '@/lib/constants/modes'

const VERDICT_STYLE: Record<string, React.CSSProperties> = {
  fine:  { color: 'var(--gold)',  background: 'rgba(232,160,192,0.08)', borderColor: 'rgba(232,160,192,0.2)' },
  watch: { color: 'var(--rose)',  background: 'rgba(212,96,154,0.08)',  borderColor: 'rgba(212,96,154,0.2)' },
  quiet: { color: 'var(--muted)', background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border)' },
}

function AdviceCard({ member }: { member: CouncilAdvice }) {
  const s = VERDICT_STYLE[member.verdict]
  return (
    <div style={{
      borderRadius: '12px', padding: '1rem 1.1rem',
      borderWidth: '1px', borderStyle: 'solid', borderColor: s.borderColor,
      background: s.background, display: 'flex', flexDirection: 'column', gap: '0.4rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.9rem', color: member.color }}>{member.icon}</span>
        <span style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: member.color, fontWeight: 500 }}>{member.label}</span>
        <span style={{
          marginLeft: 'auto', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.06em',
          padding: '0.15em 0.5em', borderRadius: '20px', borderWidth: '1px', borderStyle: 'solid',
          color: s.color as string, borderColor: s.borderColor as string, background: 'transparent',
        }}>{member.verdict}</span>
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.6, fontWeight: 300 }}>
        {member.advice}
      </div>
    </div>
  )
}

export default function CouncilSection({ mode = 'balanced' }: { mode?: Mode }) {
  const { habits, completions } = useHabits()
  const { subs: subscriptions } = useSubscriptions()
  const { items: buyItems } = useBuyItems()
  const { touched } = useDomainTouched()
  const [convened, setConvened] = useState(false)
  const [advice, setAdvice] = useState<CouncilAdvice[]>([])
  const [focusDomain, setFocusDomain] = useState<string | null>(null)

  function convene(domain: string | null = null) {
    const result = generateCouncilAdvice({ habits, completions, subscriptions, buyItems, domainTouched: touched, mode })
    setAdvice(result)
    setFocusDomain(domain)
    setConvened(true)
  }

  const watchCount = advice.filter(a => a.verdict === 'watch').length
  const shown = focusDomain ? advice.filter(a => a.domain === focusDomain) : advice

  const ASK_BUTTONS = [
    { domain: 'money',    label: 'Ask Finance' },
    { domain: 'health',   label: 'Ask Health' },
    { domain: 'home',     label: 'Ask Home' },
    { domain: 'creative', label: 'Ask Creative' },
  ]

  return (
    <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '1.4rem 1.5rem', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: convened ? '1.2rem' : '0.6rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 400 }}>Your Council</div>
          {convened && watchCount > 0 && (
            <div style={{ fontSize: '0.68rem', color: 'var(--rose)', marginTop: '0.2rem' }}>{watchCount} area{watchCount !== 1 ? 's' : ''} need attention</div>
          )}
        </div>
        <button onClick={() => convene(null)} className="btn btn-primary" style={{ letterSpacing: '0.04em' }}>
          {convened ? 'Reconvene all' : 'Convene council'}
        </button>
      </div>

      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6, fontWeight: 300, marginBottom: '0.9rem' }}>
        Your Council reviews your dashboard from different perspectives. Finance checks spending. Health checks habits. Home notices ignored tasks.
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: convened ? '1rem' : 0 }}>
        {ASK_BUTTONS.map(b => (
          <button key={b.domain} onClick={() => convene(b.domain)} className="btn btn-secondary" style={{ fontSize: '0.7rem' }}>
            {b.label}
          </button>
        ))}
      </div>

      {convened && (
        <>
          {focusDomain && (
            <button onClick={() => setFocusDomain(null)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
              fontSize: '0.68rem', padding: 0, marginBottom: '0.6rem', textDecoration: 'underline',
            }}>← view all</button>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {shown.map(m => <AdviceCard key={m.domain} member={m} />)}
          </div>
        </>
      )}

      <div style={{ marginTop: '1rem', fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.68, letterSpacing: '0.04em' }}>
        rule-based analysis · ai-powered advice coming soon
      </div>
    </div>
  )
}
