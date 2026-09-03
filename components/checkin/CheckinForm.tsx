'use client'

import { useEffect, useMemo, useState } from 'react'
import { questionsForWeek, weekOfMonday, isSingleEmoji, type CheckinQuestion } from '@/lib/utils/checkinQuestions'
import type { CheckinAnswer } from '@/lib/hooks/useCheckins'

// One question per screen, then a review screen. Every question is required
// (2026-09-03) and answers can't be changed once submitted, so: Next is
// disabled until the current answer is valid, the review screen is the last
// stop before it's final, and progress is saved to localStorage per week so
// a refresh mid-form doesn't lose anything.

function isValid(q: CheckinQuestion, v: string): boolean {
  const t = (v ?? '').trim()
  if (q.kind === 'emoji') return isSingleEmoji(t)
  if (q.kind === 'choice' && q.multiSelect) return t.split(', ').filter(Boolean).length > 0
  return t.length > 0
}

export default function CheckinForm({ onSubmit, onClose }: {
  onSubmit: (answers: CheckinAnswer[]) => Promise<{ error: string | null }>
  onClose: () => void
}) {
  const weekKey = useMemo(() => weekOfMonday(), [])
  const questions = useMemo(() => questionsForWeek(new Date(`${weekKey}T12:00:00Z`)), [weekKey])
  const draftKey = `4s:checkin-draft:${weekKey}`

  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Restore an in-progress draft for this week.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const d = JSON.parse(raw) as { values?: Record<string, string>; step?: number }
        if (d.values) setValues(d.values)
        if (typeof d.step === 'number') setStep(Math.min(d.step, questions.length))
      }
    } catch { /* private mode / bad json — start fresh */ }
  }, [draftKey, questions.length])

  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify({ values, step })) } catch { /* ignore */ }
  }, [draftKey, values, step])

  const onReview = step >= questions.length
  const q = questions[step]
  const set = (v: string) => setValues(prev => ({ ...prev, [q.key]: v }))
  const canAdvance = !onReview && isValid(q, values[q.key] ?? '')
  const allValid = questions.every(qq => isValid(qq, values[qq.key] ?? ''))

  async function finish() {
    if (!allValid) { setError('Please answer every question first.'); return }
    setSaving(true); setError(null)
    const answers: CheckinAnswer[] = questions.map(qq => ({
      questionKey: qq.key,
      questionText: qq.text,
      answer: (values[qq.key] ?? '').trim(),
    }))
    const { error } = await onSubmit(answers)
    setSaving(false)
    if (error) { setError(error); return }
    try { localStorage.removeItem(draftKey) } catch { /* ignore */ }
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
        width: 'min(440px, 94vw)', maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '1.3rem', boxShadow: '0 28px 72px rgba(0,0,0,0.45)',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        {/* progress dots — one per question, plus a final review dot */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {questions.map((_, i) => (
            <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < step ? 'var(--gold)' : i === step ? 'var(--text)' : 'var(--border)' }} />
          ))}
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: onReview ? 'var(--text)' : 'var(--border)' }} />
        </div>

        {onReview ? (
          <>
            <div style={{ fontSize: '0.92rem', color: 'var(--text)', fontWeight: 500 }}>Look this over</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
              You won’t be able to change these once you submit.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {questions.map((qq, i) => (
                <div key={qq.key} style={{ borderBottom: '1px solid var(--faint)', paddingBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem' }}>
                    <div style={{ fontSize: '0.66rem', color: 'var(--muted)', flex: 1 }}>{qq.text}</div>
                    <button onClick={() => setStep(i)} className="press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.64rem', flexShrink: 0 }}>Edit</button>
                  </div>
                  <div style={{ fontSize: qq.kind === 'emoji' ? '1.3rem' : '0.8rem', color: 'var(--text)', marginTop: '0.2rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {values[qq.key]?.trim() || '—'}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '0.92rem', color: 'var(--text)', lineHeight: 1.5, minHeight: '2.6em' }}>
              {q.text} <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>· required</span>
            </div>
            <Field q={q} value={values[q.key] ?? ''} onChange={set} />
          </>
        )}

        {error && <div style={{ fontSize: '0.7rem', color: 'var(--rose)' }}>{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="btn btn-ghost press" style={{ fontSize: '0.72rem' }}>Back</button>
          )}
          <div style={{ flex: 1 }} />
          {onReview ? (
            <button onClick={finish} disabled={saving || !allValid} className="btn btn-primary press" style={{ fontSize: '0.74rem' }}>
              {saving ? 'Submitting…' : 'Submit'}
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance}
              className="btn btn-primary press"
              style={{ fontSize: '0.74rem', opacity: canAdvance ? 1 : 0.4 }}
            >
              {step === questions.length - 1 ? 'Review' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ q, value, onChange }: { q: CheckinQuestion; value: string; onChange: (v: string) => void }) {
  if (q.kind === 'emoji') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
          {(q.options ?? []).map(opt => (
            <button key={opt} onClick={() => onChange(opt)} className="press" style={{
              borderRadius: 999, padding: '0.3rem 0.6rem', fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1,
              border: `1px solid ${value === opt ? 'var(--gold)' : 'var(--border)'}`,
              background: value === opt ? 'color-mix(in srgb, var(--gold) 16%, transparent)' : 'transparent',
            }}>{opt}</button>
          ))}
        </div>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="or type any emoji"
          inputMode="text"
          maxLength={20}
          style={{
            width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '0.55rem 0.7rem', fontSize: '1.2rem', color: 'var(--text)',
            outline: 'none', textAlign: 'center',
          }}
        />
        {value.trim() && !isSingleEmoji(value) && (
          <div style={{ fontSize: '0.66rem', color: 'var(--rose)' }}>Just one emoji, please.</div>
        )}
      </div>
    )
  }
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
              borderRadius: 999, padding: '0.35rem 0.7rem', fontSize: '0.75rem', cursor: 'pointer',
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
      placeholder="Required"
      autoFocus
      style={{
        width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '0.6rem 0.7rem', fontSize: '0.82rem', color: 'var(--text)',
        outline: 'none', fontFamily: 'inherit', resize: 'vertical',
      }}
    />
  )
}
