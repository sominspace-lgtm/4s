'use client'

import { useMemo, useState } from 'react'
import { questionsForWeek, type CheckinQuestion } from '@/lib/utils/checkinQuestions'
import type { CheckinAnswer } from '@/lib/hooks/useCheckins'

// One question per screen — the same shape as the Discord DM flow it
// replaces. Text questions can be skipped (left blank); the vibe and the
// overall-scale are the only two that expect an answer, and even those
// aren't enforced. Submits the whole set at the end.

export default function CheckinForm({ onSubmit, onClose }: {
  onSubmit: (answers: CheckinAnswer[]) => Promise<{ error: string | null }>
  onClose: () => void
}) {
  const questions = useMemo(() => questionsForWeek(new Date()), [])
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const q = questions[step]
  const isLast = step === questions.length - 1
  const set = (v: string) => setValues(prev => ({ ...prev, [q.key]: v }))

  async function finish() {
    setSaving(true); setError(null)
    const answers: CheckinAnswer[] = questions
      .map(qq => ({ questionKey: qq.key, questionText: qq.key === 'vibe' ? 'Quick vibe' : qq.text, answer: (values[qq.key] ?? '').trim() }))
      .filter(a => a.answer)
    const { error } = await onSubmit(answers)
    setSaving(false)
    if (error) { setError(error); return }
    onClose()
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Weekly check-in"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 540, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '1rem',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(420px, 94vw)', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '1.3rem', boxShadow: '0 28px 72px rgba(0,0,0,0.45)',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        {/* progress dots */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {questions.map((_, i) => (
            <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= step ? 'var(--gold)' : 'var(--border)' }} />
          ))}
        </div>

        <div style={{ fontSize: '0.92rem', color: 'var(--text)', lineHeight: 1.5, minHeight: '2.6em' }}>{q.text}</div>

        <Field q={q} value={values[q.key] ?? ''} onChange={set} />

        {error && <div style={{ fontSize: '0.7rem', color: 'var(--rose)' }}>{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="btn btn-ghost press" style={{ fontSize: '0.72rem' }}>Back</button>
          )}
          <div style={{ flex: 1 }} />
          {!isLast && (
            <button onClick={() => setStep(s => s + 1)} className="btn btn-ghost press" style={{ fontSize: '0.72rem', opacity: 0.7 }}>Skip</button>
          )}
          {isLast ? (
            <button onClick={finish} disabled={saving} className="btn btn-primary press" style={{ fontSize: '0.74rem' }}>
              {saving ? 'Saving…' : 'Done'}
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)} className="btn btn-primary press" style={{ fontSize: '0.74rem' }}>Next</button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ q, value, onChange }: { q: CheckinQuestion; value: string; onChange: (v: string) => void }) {
  if (q.kind === 'scale') {
    const max = q.scaleMax ?? 10
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
        {Array.from({ length: max }, (_, i) => String(i + 1)).map(n => (
          <button key={n} onClick={() => onChange(n)} className="press" style={{
            width: '2.1rem', height: '2.1rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem',
            border: `1px solid ${value === n ? 'var(--gold)' : 'var(--border)'}`,
            background: value === n ? 'var(--gold)' : 'transparent',
            color: value === n ? 'var(--bg)' : 'var(--text)',
          }}>{n}</button>
        ))}
      </div>
    )
  }
  if (q.kind === 'choice') {
    const selected = value ? value.split(', ').filter(Boolean) : []
    const toggle = (opt: string) => {
      if (!q.multiSelect) { onChange(opt); return }
      const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]
      onChange(next.join(', '))
    }
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {(q.options ?? []).map(opt => {
          const on = q.multiSelect ? selected.includes(opt) : value === opt
          return (
            <button key={opt} onClick={() => toggle(opt)} className="press" style={{
              borderRadius: 999, padding: q.key === 'vibe' ? '0.3rem 0.6rem' : '0.35rem 0.7rem',
              fontSize: q.key === 'vibe' ? '1.2rem' : '0.75rem', cursor: 'pointer',
              border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`,
              background: on ? 'color-mix(in srgb, var(--gold) 16%, transparent)' : 'transparent',
              color: 'var(--text)',
            }}>{opt}</button>
          )
        })}
      </div>
    )
  }
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={3}
      placeholder="Leave blank to skip"
      autoFocus
      style={{
        width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '0.6rem 0.7rem', fontSize: '0.82rem', color: 'var(--text)',
        outline: 'none', fontFamily: 'inherit', resize: 'vertical',
      }}
    />
  )
}
