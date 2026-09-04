'use client'

import { goToSection, goToPersonal, goToHousehold } from '@/lib/utils/navigate'
import { KITCHEN_URL, HOME_URL } from '@/lib/utils/cheatSheets'
import Icon, { type IconName } from '@/components/ui/Icon'

// Jump tiles for the Village home panel — every tab one tap away, plus the
// two external cheat sheets. In locked (wall) mode an in-app tile asks for
// the PIN first, exactly like a district tap does (onLockedNavigate).

type Tile =
  | { kind: 'section'; label: string; icon: IconName; go: () => void }
  | { kind: 'external'; label: string; icon: IconName; href: string }

const TILES: Tile[] = [
  { kind: 'section', label: 'Today',     icon: 'today',     go: () => goToSection('brief') },
  { kind: 'section', label: 'Tasks',     icon: 'clipboard', go: () => goToPersonal('tasks') },
  { kind: 'section', label: 'Habits',    icon: 'sprout',    go: () => goToPersonal('habits') },
  { kind: 'section', label: 'Notes',     icon: 'brain',     go: () => goToPersonal('notes') },
  { kind: 'section', label: 'Money',     icon: 'scale',     go: () => goToPersonal('money') },
  { kind: 'section', label: 'People',    icon: 'handshake', go: () => goToPersonal('people') },
  { kind: 'section', label: 'Household', icon: 'household', go: () => goToHousehold('home') },
  { kind: 'section', label: 'Calendar',  icon: 'calendar',  go: () => goToHousehold('calendar') },
  { kind: 'section', label: 'Places',    icon: 'places',    go: () => goToSection('places') },
  { kind: 'external', label: 'Kitchen',  icon: 'plate', href: KITCHEN_URL },
  { kind: 'external', label: 'Home',     icon: 'household', href: HOME_URL },
]

export default function ShortcutsCard({ locked = false, onLockedNavigate, onInteract }: {
  locked?: boolean
  onLockedNavigate?: (label: string) => void
  onInteract?: () => void
}) {
  return (
    <div className="organic" style={{
      background: 'color-mix(in srgb, var(--slate) 9%, var(--surface2))',
      border: '1px solid color-mix(in srgb, var(--slate) 22%, var(--border))',
      borderRadius: 14, padding: '0.65rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span aria-hidden style={{ display: 'inline-flex', color: 'var(--slate)' }}><Icon name="controls" size={16} /></span>
        <span style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text)' }}>Shortcuts</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: '0.4rem' }}>
        {TILES.map(t => {
          const inner = (
            <>
              <Icon name={t.icon} size={17} />
              <span style={{ fontSize: '0.64rem' }}>{t.label}</span>
            </>
          )
          const style: React.CSSProperties = {
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '0.55rem 0.3rem', cursor: 'pointer', color: 'var(--text)',
            fontFamily: 'inherit', textDecoration: 'none',
          }
          if (t.kind === 'external') {
            return (
              <a key={t.label} href={t.href} target="_blank" rel="noreferrer" className="press" style={style}
                onClick={() => onInteract?.()}>{inner}</a>
            )
          }
          return (
            <button key={t.label} className="press" style={style}
              onClick={() => { onInteract?.(); if (locked) onLockedNavigate?.(t.label); else t.go() }}>
              {inner}
            </button>
          )
        })}
      </div>
    </div>
  )
}
