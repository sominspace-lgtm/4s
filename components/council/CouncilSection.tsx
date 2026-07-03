'use client'

import { useRef, useState } from 'react'
import { useHabits } from '@/lib/hooks/useHabits'
import { useSubscriptions } from '@/lib/hooks/useSubscriptions'
import { useBuyItems, computeStatus } from '@/lib/hooks/useBuyItems'
import { useDomainTouched } from '@/lib/hooks/useDomainTouched'
import { useWorkItems, dueUrgency } from '@/lib/hooks/useWorkItems'
import { useGiftEvents, daysUntil } from '@/lib/hooks/useGiftEvents'
import { useCompanions } from '@/lib/hooks/useCompanions'
import { useAppSnapshot } from '@/lib/hooks/useAppSnapshot'
import { generateCouncilAdvice, COUNCIL_DOMAINS, type CouncilAdvice } from '@/lib/utils/council'
import type { Mode } from '@/lib/constants/modes'

const VERDICT_STYLE: Record<string, React.CSSProperties> = {
  fine:  { color: 'var(--gold)',  background: 'color-mix(in srgb, var(--gold) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--gold) 20%, transparent)' },
  watch: { color: 'var(--rose)',  background: 'color-mix(in srgb, var(--rose) 8%, transparent)',  borderColor: 'color-mix(in srgb, var(--rose) 20%, transparent)' },
  quiet: { color: 'var(--muted)', background: 'var(--hover-bg)', borderColor: 'var(--border)' },
}

const ADVISORS = [
  { domain: 'money',    label: 'Finance',  icon: '◉', color: 'var(--emerald)', desc: 'Spending, renewals, bills' },
  { domain: 'health',   label: 'Health',   icon: '○', color: 'var(--rose)',    desc: 'Habits and wellness patterns' },
  { domain: 'home',     label: 'Home',     icon: '⌂', color: 'var(--slate)',   desc: 'Ignored household tasks' },
  { domain: 'creative', label: 'Creative', icon: '✦', color: 'var(--amber)',  desc: 'Neglected ideas' },
  { domain: 'planning', label: 'Planning', icon: '◒', color: 'var(--gold)',   desc: 'Calendar and commitments' },
  { domain: 'sharing',  label: 'Sharing',  icon: '⇆', color: 'var(--blush)',  desc: 'Shared items and people' },
]

function AdvisorCard({ advisor, onAsk }: { advisor: typeof ADVISORS[number]; onAsk: () => void }) {
  return (
    <div className="card-interactive" style={{
      borderRadius: '12px', padding: '0.9rem 1rem', border: '1px solid var(--border)',
      background: 'var(--hover-bg)', display: 'flex', flexDirection: 'column', gap: '0.4rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.9rem', color: advisor.color }}>{advisor.icon}</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text)', fontWeight: 500 }}>{advisor.label}</span>
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.78, lineHeight: 1.5, flex: 1 }}>{advisor.desc}</div>
      <button onClick={onAsk} className="btn btn-ghost" style={{ fontSize: '0.64rem', alignSelf: 'flex-start', padding: 0 }}>Ask {advisor.label} →</button>
    </div>
  )
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

export default function CouncilSection({ mode = 'balanced', userId, calendarConnected = false }: { mode?: Mode; userId: string; calendarConnected?: boolean }) {
  const { habits, completions } = useHabits()
  const { subs: subscriptions } = useSubscriptions()
  const { items: buyItems } = useBuyItems()
  const { touched } = useDomainTouched()
  const { items: workItems } = useWorkItems()
  const { items: giftItems } = useGiftEvents()
  const { received } = useCompanions(userId)
  const [convened, setConvened] = useState(false)
  const [advice, setAdvice] = useState<CouncilAdvice[]>([])
  const [suggestion, setSuggestion] = useState('')
  const [focusDomain, setFocusDomain] = useState<string | null>(null)
  // 'loading' → AI request in flight (rule-based advice already shown),
  // 'ai' → advice was upgraded by the model, 'rules' → AI unavailable.
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'ai' | 'rules'>('idle')
  const buildSnapshot = useAppSnapshot(userId, calendarConnected)
  const conveneSeq = useRef(0)

  // Rule-based "what should I actually do next" — one concrete action,
  // most urgent first, setup nudges only when nothing is on fire.
  function suggestNextAction(input: { overdueTasks: number; pendingShares: number; refillsOverdue: number }): string {
    if (input.overdueTasks > 0) return 'Clear or reschedule your overdue tasks first.'
    if (input.pendingShares > 0) return 'Respond to the shared invite waiting for you.'
    if (input.refillsOverdue > 0) return 'Restock the essentials that already ran out.'
    if (!calendarConnected && habits.length === 0) return 'Connect your calendar or add one habit.'
    if (!calendarConnected) return 'Connect your calendar so Planning can see your day.'
    if (habits.length === 0) return 'Add one habit to give Health something to watch.'
    if (subscriptions.length === 0 && buyItems.length === 0) return 'Track a renewal or a refill item so Finance has eyes.'
    if (Object.keys(touched).length === 0) return 'Open one Life domain and leave a note — ten minutes is enough.'
    return 'Nothing urgent. A good time to plan ahead.'
  }

  function convene(domain: string | null = null) {
    const overdueTasks = workItems.filter(i => i.status !== 'done' && dueUrgency(i.due_date) === 'overdue').length
    const dueTodayTasks = workItems.filter(i => i.status !== 'done' && dueUrgency(i.due_date) === 'today').length
    const upcomingGifts = giftItems.map(g => ({ name: g.name, days: daysUntil(g) }))
    const pendingShares = received.filter(c => c.status === 'pending').length
    const refillsOverdue = buyItems.filter(b => ['due-to-buy', 'overdue'].includes(computeStatus(b))).length

    // Rule-based review renders instantly; the AI pass replaces it when (if)
    // it lands. A sequence counter drops stale responses on rapid reconvenes.
    const result = generateCouncilAdvice({
      habits, completions, subscriptions, buyItems, domainTouched: touched, mode,
      overdueTasks, dueTodayTasks, upcomingGifts, pendingShares,
    })
    setAdvice(result)
    setSuggestion(suggestNextAction({ overdueTasks, pendingShares, refillsOverdue }))
    setFocusDomain(domain)
    setConvened(true)

    const seq = ++conveneSeq.current
    setAiStatus('loading')
    fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'council', mode, snapshot: buildSnapshot() }),
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then(data => {
        if (seq !== conveneSeq.current) return
        const advisors = data?.result?.advisors
        if (!Array.isArray(advisors) || advisors.length === 0) { setAiStatus('rules'); return }
        const byDomain = new Map(advisors.map((a: { domain: string; verdict: string; advice: string }) => [a.domain, a]))
        setAdvice(COUNCIL_DOMAINS.map(d => {
          const ai = byDomain.get(d.id)
          const fallback = result.find(r => r.domain === d.id)
          return {
            domain: d.id, label: d.label, icon: d.icon, color: d.color,
            verdict: (ai?.verdict as CouncilAdvice['verdict']) ?? fallback?.verdict ?? 'quiet',
            advice: ai?.advice ?? fallback?.advice ?? '',
          }
        }))
        if (typeof data.result.suggestedAction === 'string' && data.result.suggestedAction) {
          setSuggestion(data.result.suggestedAction)
        }
        setAiStatus('ai')
      })
      .catch(() => { if (seq === conveneSeq.current) setAiStatus('rules') })
  }

  const watchCount = advice.filter(a => a.verdict === 'watch').length
  const shown = focusDomain ? advice.filter(a => a.domain === focusDomain) : advice

  return (
    <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '1.4rem 1.5rem', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.6rem' }}>
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

      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6, fontWeight: 300, marginBottom: '0.9rem' }}>
        Your Council reviews your dashboard from different perspectives.
      </div>

      {!convened && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem' }}>
          {ADVISORS.map(a => (
            <AdvisorCard key={a.domain} advisor={a} onAsk={() => convene(a.domain)} />
          ))}
        </div>
      )}

      {convened && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', color: 'var(--text)' }}>Council Review</span>
            <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.8 }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            {aiStatus === 'loading' && <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.8 }}>✦ thinking…</span>}
            {aiStatus === 'ai' && (
              <span style={{
                fontSize: '0.58rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                color: 'var(--gold)', padding: '0.1em 0.55em', borderRadius: '99px',
                background: 'color-mix(in srgb, var(--gold) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--gold) 25%, transparent)',
              }}>✦ ai review</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {ADVISORS.map(a => (
              <button key={a.domain} onClick={() => convene(a.domain)} className="btn btn-secondary" style={{ fontSize: '0.68rem' }}>
                Ask {a.label}
              </button>
            ))}
          </div>
          {focusDomain && (
            <button onClick={() => setFocusDomain(null)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
              fontSize: '0.68rem', padding: 0, marginBottom: '0.6rem', textDecoration: 'underline',
            }}>← view all</button>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {shown.map(m => <AdviceCard key={m.domain} member={m} />)}
          </div>
          {suggestion && !focusDomain && (
            <div style={{
              marginTop: '0.9rem', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6,
              fontStyle: 'italic', paddingTop: '0.7rem', borderTop: '1px solid var(--faint)',
            }}>
              <strong style={{ color: 'var(--text)', fontStyle: 'normal' }}>Suggested next action: </strong>
              {suggestion}
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: '1rem', fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.68, letterSpacing: '0.04em' }}>
        {aiStatus === 'ai' ? 'ai-powered review · your data stays in this request'
          : aiStatus === 'loading' ? 'rule-based review shown · ai review on the way…'
          : aiStatus === 'rules' ? 'rule-based review · ai unavailable right now'
          : 'reviews use your live dashboard data'}
      </div>
    </div>
  )
}
