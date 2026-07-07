'use client'

interface Section { id: string; label?: string }

const NAV_LABELS: Record<string, string> = {
  brief: 'Brief', work: 'Tasks', habits: 'Habits', domains: 'Life',
  money: 'Money', calendar: 'Calendar', council: 'Council', shared: 'Shared',
}
const ICONS: Record<string, string> = {
  brief: '◒', work: '◈', habits: '◉', domains: '◇',
  money: '✦', calendar: '◎', council: '⌂', shared: '⇆',
}

// Thumb-first bottom navigation for mobile. Shows the first few core tabs and
// drives the same tab switch as the top SectionNav (which is hidden on mobile).
export default function BottomNav({ sections, activeId, onSelect }: { sections: Section[]; activeId: string; onSelect: (id: string) => void }) {
  if (sections.length < 2) return null
  // Show every section; the row scrolls horizontally so nothing is unreachable
  // once the top nav is hidden on mobile. Even spacing when few, scroll when many.
  const fill = sections.length <= 5

  return (
    <nav className="bottom-nav" aria-label="Sections" style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 480,
      background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)',
      overflowX: 'auto', scrollbarWidth: 'none',
    }}>
      {sections.map(s => {
        const active = s.id === activeId
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: fill ? 1 : '0 0 auto', minWidth: '3.9rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem',
              background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0.35rem 0.55rem',
              color: active ? 'var(--gold)' : 'var(--muted)', fontFamily: 'var(--font-body)',
              transition: 'color var(--t-fast)',
            }}
          >
            <span style={{ fontSize: '1.05rem', lineHeight: 1, opacity: active ? 1 : 0.8 }}>{ICONS[s.id] ?? '•'}</span>
            <span style={{ fontSize: '0.58rem', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{NAV_LABELS[s.id] ?? s.label ?? s.id}</span>
          </button>
        )
      })}
    </nav>
  )
}
