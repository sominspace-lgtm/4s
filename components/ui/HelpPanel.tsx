'use client'

import { useEffect, useRef } from 'react'
import type { Lang } from '@/lib/i18n'

interface Props {
  open: boolean
  onClose: () => void
  lang?: Lang
}

const SECTIONS = [
  {
    icon: '⌘/',
    title: 'Search everything',
    body: 'Press ⌘/ (or Ctrl+/) to open search. Jump between tasks, habits, captures, and wishlist items instantly. Arrow keys navigate, Enter opens.',
  },
  {
    icon: '◎',
    title: 'Focus mode',
    body: 'Click ◎ in the header to enter a distraction-free timer. Pick 15, 25, 45, 60, or 90 minutes — or type a custom duration. The page dims so you stay on track.',
  },
  {
    icon: '◻',
    title: 'Archive',
    body: 'Click ◻ to see all completed and cancelled tasks grouped by month. Nothing is deleted — everything is archived.',
  },
  {
    icon: '⇆',
    title: 'Companions',
    body: 'Add friends by email. Choose exactly which sections they can see (work, habits, captures, wishlist, etc.). They get a read-only link to your shared content.',
  },
  {
    icon: '⊹',
    title: 'Customize layout',
    body: 'Drag and reorder sections, or toggle the eye icon to hide/show any section. Your layout is saved automatically.',
  },
  {
    icon: '◐',
    title: 'Themes & modes',
    body: '15 visual themes (Sunset, Midnight, Linen, Ember…) and 10 personality modes (Balanced, Coach, Gamer…). Mix freely. Gamer mode earns XP for tasks (+25) and habits (+10).',
  },
  {
    icon: '○',
    title: 'Work Hub',
    body: 'Click the circle to cycle status: ○ todo → ◑ in-progress → ● done. Click the priority badge (P1/P2/P3) to change urgency. Edit notes inline by clicking them.',
  },
  {
    icon: '✦',
    title: 'Domains',
    body: 'Eight life domains (Business, Health, Creative…). Each has its own notes and hidden/shared toggle. Tag tasks and captures to a domain for better organisation.',
  },
  {
    icon: '↻',
    title: 'Recurring tasks',
    body: 'When adding a task, set a repeat interval (daily, weekly, monthly…). When you complete it, the next occurrence is created automatically.',
  },
  {
    icon: '♡',
    title: 'Quick Capture',
    body: 'The bar at the top captures anything instantly. Use the domain dropdown to tag it right away, or leave it Unsorted and sort later from the Capture section.',
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
