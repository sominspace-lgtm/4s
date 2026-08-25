'use client'

import { useLang } from '@/lib/LangContext'
import { t } from '@/lib/i18n'

interface Section { id: string; label?: string }

const NAV_LABELS: Record<string, string> = {
  brief: 'Today', village: 'Village',
  personal: 'Personal', household: 'Household', places: 'Places',
  // Household's own sub-tabs, shown at top level in shared mode only
  // (2026-08-25) — see DashboardClient's navSections/HOUSEHOLD_SHARED_TABS.
  home: 'Home', calendar: 'Calendar', routines: 'Routines',
  smarthome: 'Smart Home', reference: 'Reference',
}

// Same icons as the mobile BottomNav, so a section looks identical on both
// surfaces — recognition carries across devices.
const NAV_ICONS: Record<string, string> = {
  brief: '◒', village: '⌂',
  personal: '◉', household: '◫', places: '◇',
  home: '⌂', calendar: '▤', routines: '↻', smarthome: '◈', reference: '▥',
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
    // Softened (2026-08-25) — this bar used to read as a strong, near-opaque
    // slab of --bg above the much softer scene underneath, worst on a dark
    // theme since Village always renders in Bloom's light palette regardless
    // of the account's active theme (see Village.tsx's own THEMES.bloom
    // override), so a dark theme's nav could sit directly on top of a light
    // world. More translucency, a fainter bottom edge, and lighter/wider-set
    // type all pull it toward "integrated frame" rather than "app chrome."
    <div className="section-nav" style={{
      position: 'sticky', top: 0, zIndex: 90,
      background: 'color-mix(in srgb, var(--bg) 68%, transparent)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--faint)',
      WebkitBackdropFilter: 'blur(16px)',
    }}>
      <div
        style={{
          maxWidth: '900px', margin: '0 auto', padding: '0 2rem',
          display: 'flex', gap: '0.15rem', overflowX: 'auto',
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
              // .nav-tab draws the underline as a pseudo-element that grows
              // from the centre, so switching tabs slides rather than snaps.
              // data-active drives it in CSS — see globals.css.
              className="nav-tab"
              data-active={isActive}
              style={{
                padding: '0.7rem 1.15rem', flexShrink: 0, minHeight: '44px',
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 450,
                letterSpacing: '0.07em', textTransform: 'uppercase',
                color: isActive ? 'var(--text)' : 'var(--muted)',
                opacity: isActive ? 1 : 0.75,
                borderRadius: '8px 8px 0 0',
              }}
            >
              <span aria-hidden style={{ fontSize: '0.88rem', opacity: isActive ? 1 : 0.65, color: isActive ? 'var(--gold)' : 'inherit', transition: 'color 160ms ease, opacity 160ms ease' }}>
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
