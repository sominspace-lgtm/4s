'use client'

import { useLang } from '@/lib/LangContext'
import { t } from '@/lib/i18n'

interface Section { id: string; label?: string }

const NAV_LABELS: Record<string, string> = {
  brief: 'Brief', work: 'Tasks', habits: 'Habits',
  domains: 'Life', money: 'Money',
  calendar: 'Calendar', council: 'Council', shared: 'Shared',
}

// Same icons as the mobile BottomNav, so a section looks identical on both
// surfaces — recognition carries across devices.
const NAV_ICONS: Record<string, string> = {
  brief: '◒', work: '◈', habits: '◉', domains: '◇',
  money: '✦', calendar: '◎', council: '⌂', shared: '⇆',
}

interface Props {
  sections: Section[]
  activeId: string
  onSelect: (id: string) => void
}

export default function SectionNav({ sections, activeId, onSelect }: Props) {
  const lang = useLang()

  if (sections.length < 2) return null

  return (
    <div className="section-nav" style={{
      position: 'sticky', top: 0, zIndex: 90,
      background: 'color-mix(in srgb, var(--bg) 85%, transparent)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div
        style={{
          maxWidth: '900px', margin: '0 auto', padding: '0 2rem',
          display: 'flex', gap: '0', overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {sections.map(s => {
          const label = t(NAV_LABELS[s.id] ?? s.id, lang)
          const isActive = activeId === s.id
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              aria-current={isActive ? 'page' : undefined}
              style={{
                padding: '0.7rem 1rem', flexShrink: 0, minHeight: '44px',
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.78rem',
                letterSpacing: '0.05em', textTransform: 'uppercase',
                color: isActive ? 'var(--text)' : 'var(--muted)',
                borderBottom: isActive ? '1.5px solid var(--gold)' : '1.5px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              <span aria-hidden style={{ fontSize: '0.9rem', opacity: isActive ? 1 : 0.7, color: isActive ? 'var(--gold)' : 'inherit' }}>
                {NAV_ICONS[s.id] ?? '•'}
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
