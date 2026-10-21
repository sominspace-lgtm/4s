'use client'

import Icon, { type IconName } from './Icon'

export interface HomeBarGroup {
  id: string
  icon: IconName
  label: string
  /** The real section ids this place covers. The first is where a tap on
   *  the icon lands (its "root"); DashboardClient's top SubNav moves between
   *  the rest. */
  members: string[]
  /** True for a group whose tap opens an overlay (e.g. Smart Home) rather
   *  than switching tabs. Shown with a small dot. */
  opensOverlay?: boolean
}

// The bottom bar (2026-10-21 redesign): one row, four places on a phone
// (Today, Home, Me, Places; Village, Home, Places on the shared iPad). The
// pages inside a place moved to a readable bar at the top (SubNav), so the
// bottom is never two rows tall. Tapping the place you are already in goes
// back to its first page, the way phone apps do.
export default function HomeBar({ groups, activeId, onSelect }: {
  groups: HomeBarGroup[]
  activeId: string
  onSelect: (id: string) => void
}) {
  const activeGroup = groups.find(g => g.members.includes(activeId)) ?? groups[0]

  return (
    <nav aria-label="Main" className="homebar" style={{
      position: 'sticky', bottom: 0, zIndex: 90,
      display: 'flex', justifyContent: 'center',
      padding: '0.4rem 0.75rem calc(0.45rem + env(safe-area-inset-bottom))',
    }}>
      <div style={{
        position: 'relative',
        display: 'flex', gap: '0.1rem', padding: '0.3rem', width: 'min(100%, 26rem)', justifyContent: 'space-around',
        background: 'color-mix(in srgb, var(--surface) 78%, transparent)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '22px', border: '1px solid color-mix(in srgb, var(--gold) 14%, var(--border))',
        boxShadow: '0 8px 28px color-mix(in srgb, var(--text) 10%, transparent), inset 0 1px 0 color-mix(in srgb, var(--gold) 12%, transparent)',
      }}>
        {groups.map(g => {
          const isActive = g.id === activeGroup?.id
          return (
            <button
              key={g.id}
              onClick={() => onSelect(g.members[0])}
              aria-current={isActive ? 'page' : undefined}
              className="press"
              style={{
                position: 'relative', flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem',
                minHeight: 52, padding: '0.35rem 0.4rem', borderRadius: '17px', border: 'none', cursor: 'pointer',
                background: isActive ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'none',
                transition: 'background 160ms ease',
              }}
            >
              <span aria-hidden style={{
                position: 'relative', display: 'inline-flex',
                color: isActive ? 'var(--gold)' : 'var(--muted)', opacity: isActive ? 1 : 0.75,
                transition: 'opacity 160ms ease, color 160ms ease',
              }}>
                <Icon name={g.icon} size={21} />
                {g.opensOverlay && (
                  <span aria-hidden style={{
                    position: 'absolute', bottom: -2, right: -3, width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--gold)', opacity: 0.75, boxShadow: '0 0 0 1.5px color-mix(in srgb, var(--bg) 55%, transparent)',
                  }} />
                )}
              </span>
              <span style={{
                fontSize: '0.72rem', fontFamily: 'var(--font-body)', fontWeight: isActive ? 500 : 400,
                color: isActive ? 'var(--text)' : 'var(--muted)',
              }}>{g.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
