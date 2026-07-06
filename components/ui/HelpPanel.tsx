'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Lang } from '@/lib/i18n'

interface Props {
  open: boolean
  onClose: () => void
  lang?: Lang
}

const SECTIONS = [
  {
    icon: '○',
    title: 'Tasks — just type it',
    body: 'Type tasks like you’d say them — "hw due today", "call mom friday", "p1 pay rent tomorrow". 4S sets the date and priority and shows a suggestion to confirm. Click the circle to cycle ○ → ◑ → ●; click P1/P2/P3 to change priority.',
  },
  {
    icon: '◉',
    title: 'Habits',
    body: 'Daily, weekly, or every-N-days schedules. "Due today" only counts the habits that actually are. Pause any habit without losing its history.',
  },
  {
    icon: '◉',
    title: 'Money & Refill',
    body: 'Wishlist, Gifts, Renewals, and Buy Again. Add something you run out of and 4S stays quiet until it’s time to rebuy — or scan a photo / paste a link and let AI fill the details.',
  },
  {
    icon: '◎',
    title: 'Calendar',
    body: 'Native Agenda and Month views built from your tasks, renewals, refills, and gifts. Connect Google Calendar to see events alongside them.',
  },
  {
    icon: '⚖',
    title: 'Council',
    body: 'Convene your Council for a calm per-area review plus one suggested next action. Runs on rules instantly; upgrades to a real AI review when AI is enabled.',
  },
  {
    icon: '✦',
    title: 'Ask Jarvis & AI',
    body: 'Ask a free-text question about your day, get an AI Council review, and scan refill labels — all powered by Claude when an API key is set. Only counts, titles, and dates are sent, never your notes.',
  },
  {
    icon: '⇆',
    title: 'Shared & People',
    body: 'Invite friends by email; accept or decline. Only accepted people become share targets. Shared spaces (Family, Couple, Trip) let you share with a whole group. Private by default, always.',
  },
  {
    icon: '◐',
    title: 'Themes & modes',
    body: '13 visual themes (dark & light) change only the look; 10 personality modes change only the tone. Mix freely. Gamer mode earns XP (+25 per task, +10 per habit).',
  },
  {
    icon: '🎙',
    title: 'Alexa',
    body: 'Link once from Account → Connect Alexa, then control 4S by voice: "Alexa, open four s", then "what needs attention", "read my tasks", "i did meditation", "money summary".',
  },
]

const SHORTCUTS = [
  { keys: '⌘ /', desc: 'Open search' },
  { keys: '⌘ K', desc: 'Quick capture (mobile FAB on small screens)' },
  { keys: '↑ ↓', desc: 'Navigate search results' },
  { keys: 'Enter', desc: 'Select search result' },
  { keys: 'Esc', desc: 'Close any panel or modal' },
]

export default function HelpPanel({ open, onClose, lang = 'en' }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />
      <div
        ref={ref}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
          width: 'min(420px, 100vw)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem 1.5rem 1rem',
          borderBottom: '1px solid var(--faint)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 400, color: 'var(--text)', letterSpacing: '0.02em' }}>
              {lang === 'ko' ? '4S 사용 방법' : 'How to use 4S'}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.2rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {lang === 'ko' ? '도움말 및 단축키' : 'features & shortcuts'}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
            padding: '0.4rem 0.7rem', color: 'var(--muted)', cursor: 'pointer',
            fontSize: '0.8rem', lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <Link href="/guide" onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.75rem', textAlign: 'center', textDecoration: 'none' }}>
            Open the full guide →
          </Link>

          {/* Keyboard shortcuts */}
          <div>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.6rem', opacity: 0.7 }}>
              {lang === 'ko' ? '단축키' : 'keyboard shortcuts'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {SHORTCUTS.map(s => (
                <div key={s.keys} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <kbd style={{
                    fontSize: '0.6rem', padding: '0.2em 0.55em', borderRadius: '5px',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--text)', fontFamily: 'var(--font-body)',
                    whiteSpace: 'nowrap', flexShrink: 0, minWidth: '3.5rem', textAlign: 'center',
                  }}>{s.keys}</kbd>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>{s.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--faint)' }} />

          {/* Section guide */}
          <div>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.75rem', opacity: 0.7 }}>
              {lang === 'ko' ? '기능 안내' : 'feature guide'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {SECTIONS.map(s => (
                <div key={s.icon} style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{
                    flexShrink: 0, width: '2rem', height: '2rem', borderRadius: '8px',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', color: 'var(--gold)',
                  }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.2rem' }}>{s.title}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.6, fontWeight: 300 }}>{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--faint)' }} />

          <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.5, lineHeight: 1.6, paddingBottom: '0.5rem' }}>
            {lang === 'ko'
              ? '모든 데이터는 Supabase에 안전하게 저장됩니다. 언제든지 계정 페이지에서 설정을 변경하세요.'
              : 'All data is stored securely via Supabase. Change settings, manage your account, or give feedback at the bottom of the dashboard.'}
          </div>
        </div>
      </div>
    </>
  )
}
