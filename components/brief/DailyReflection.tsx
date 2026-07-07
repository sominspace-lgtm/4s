'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useCaptures } from '@/lib/hooks/useCaptures'
import { useLang } from '@/lib/LangContext'

// One calm question a day. Answering is optional; a saved reflection is kept
// as a 'self' capture so it can be revisited later. Never nags — once you've
// reflected (or skipped) today, it collapses to a quiet line.
const QUESTIONS = [
  'What mattered today?',
  'What are you avoiding?',
  'Who deserves your attention?',
  'What feels lighter than yesterday?',
  'What deserves tomorrow?',
  'What would make today meaningful?',
]

const QUESTIONS_KO = [
  '오늘 무엇이 중요했나요?',
  '무엇을 미루고 있나요?',
  '누구에게 마음을 써야 할까요?',
  '어제보다 가벼워진 것은 무엇인가요?',
  '내일 무엇을 챙기고 싶나요?',
  '오늘을 의미 있게 만드는 건 무엇일까요?',
]

function dayIndex() {
  const start = new Date(new Date().getFullYear(), 0, 0)
  const diff = Number(new Date()) - Number(start)
  return Math.floor(diff / 86400000)
}

export default function DailyReflection() {
  const lang = useLang()
  const { add } = useCaptures()
  const today = format(new Date(), 'yyyy-MM-dd')
  const key = `4s-reflected-${today}`

  const [done, setDone] = useState(false)
  const [open, setOpen] = useState(false)
  const [answer, setAnswer] = useState('')

  useEffect(() => { setDone(localStorage.getItem(key) === '1') }, [key])

  const question = (lang === 'ko' ? QUESTIONS_KO : QUESTIONS)[dayIndex() % QUESTIONS.length]

  function markDone() {
    localStorage.setItem(key, '1')
    setDone(true)
    setOpen(false)
  }

  async function save() {
    const text = answer.trim()
    if (text) await add(`Reflection · ${question} — ${text}`, 'self')
    setAnswer('')
    markDone()
  }

  const label = lang === 'ko' ? '오늘의 되돌아보기' : 'Daily reflection'

  if (done) {
    return (
      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.6, fontStyle: 'italic', padding: '0.2rem 0.1rem' }}>
        {lang === 'ko' ? '오늘은 되돌아봤어요.' : 'Reflected today.'}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem 1.2rem' }}>
      <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.68, marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--text)', fontWeight: 300, lineHeight: 1.4 }}>{question}</div>

      {open ? (
        <div style={{ marginTop: '0.75rem' }}>
          <textarea
            value={answer} onChange={e => setAnswer(e.target.value)} autoFocus rows={2}
            placeholder={lang === 'ko' ? '한 줄이면 충분해요…' : 'A line is enough…'}
            style={{
              width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
              padding: '0.7rem 0.85rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.85rem',
              outline: 'none', resize: 'none', lineHeight: 1.5,
            }}
          />
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
            <button onClick={save} className="btn btn-primary" style={{ fontSize: '0.72rem' }}>
              {answer.trim() ? (lang === 'ko' ? '저장' : 'Keep it') : (lang === 'ko' ? '완료' : 'Done')}
            </button>
            <button onClick={markDone} className="btn btn-ghost" style={{ fontSize: '0.72rem' }}>
              {lang === 'ko' ? '오늘은 넘기기' : 'Not today'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.7rem' }}>
          <button onClick={() => setOpen(true)} className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: 0 }}>
            {lang === 'ko' ? '되돌아보기 →' : 'Reflect →'}
          </button>
          <button onClick={markDone} className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: 0, opacity: 0.6 }}>
            {lang === 'ko' ? '넘기기' : 'Skip'}
          </button>
        </div>
      )}
    </div>
  )
}
