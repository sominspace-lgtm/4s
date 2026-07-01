'use client'

import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/LangContext'
import { t } from '@/lib/i18n'

interface Section { id: string; label?: string }

const NAV_LABELS: Record<string, string> = {
  brief: 'Brief', work: 'Work', habits: 'Habits',
  capture: 'Capture', domains: 'Domains',
  pulse: 'Pulse', wishlist: 'Wishlist', spending: 'Money',
  calendar: 'Calendar', council: 'Council',
}

interface Props {
  sections: Section[]
}

export default function SectionNav({ sections }: Props) {
  const lang = useLang()
  const [active, setActive] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ids = sections.map(s => s.id)
    const els = ids.map(id => document.getElementById(`section-${id}`)).filter(Boolean) as HTMLElement[]

    function onScroll() {
      const scrollY = window.scrollY + 100
      let current = ids[0] ?? ''
      for (const el of els) {
        if (el.offsetTop <= scrollY) current = el.id.replace('section-', '')
      }
      setActive(current)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sections])

  function scrollTo(id: string) {
    const el = document.getElementById(`section-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (sections.length < 2) return null

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 90,
      background: 'color-mix(in srgb, var(--bg) 85%, transparent)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div
        ref={ref}
        style={{
          maxWidth: '900px', margin: '0 auto', padding: '0 2rem',
          display: 'flex', gap: '0', overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {sections.map(s => {
          const label = t(NAV_LABELS[s.id] ?? s.id, lang)
          const isActive = active === s.id
          return (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              style={{
                padding: '0.55rem 0.9rem', flexShrink: 0,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.65rem',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: isActive ? 'var(--text)' : 'var(--muted)',
                borderBottom: isActive ? '1.5px solid var(--gold)' : '1.5px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
