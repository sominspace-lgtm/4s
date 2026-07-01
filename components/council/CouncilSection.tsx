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

  function convene() {
    const result = generateCouncilAdvice({ habits, completions, subscriptions, buyItems, domainTouched: touched, mode })
    setAdvice(result)
    setConvened(true)
  }

  const watchCount = advice.filter(a => a.verdict === 'watch').length

  return (
    <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '1.4rem 1.5rem', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: convened ? '1.2rem' : '0.6rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 400 }}>Your Council</div>
          {convened && watchCount > 0 && (
            <div style={{ fontSize: '0.68rem', color: 'var(--rose)', marginTop: '0.2rem' }}>{watchCount} area{watchCount !== 1 ? 's' : ''} need attention</div>
          )}
        </div>
        <button onClick={convene} style={{
          padding: '0.45em 1.2em', borderRadius: '8px', cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)',
          color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.73rem',
          letterSpacing: '0.04em',
        }}>
          {convened ? 'Reconvene' : 'Convene council'}
        </button>
      </div>

      {!convened && (
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6, fontWeight: 300 }}>
          Each advisor reviews your data and speaks. Finance checks your spending. Health checks your habits. Home notices what you&apos;ve been ignoring.
        </div>
      )}

      {convened && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {advice.map(m => <AdviceCard key={m.domain} member={m} />)}
        </div>
      )}

      <div style={{ marginTop: '1rem', fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.5, letterSpacing: '0.04em' }}>
        rule-based analysis · ai-powered advice coming soon
      </div>
    </div>
  )
}
