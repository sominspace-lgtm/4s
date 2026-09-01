'use client'

import Icon, { type IconName } from './Icon'

// The ONE nav for both personal and shared use (2026-08-25) — started as
// the shared/kiosk device's own bar (replacing SectionNav+BottomNav there),
// now replaces them everywhere so the two modes share one visual design,
// not just the same relative order. Broad contexts (Village / Household /
// Places / Controls, plus Today / Personal in personal mode only) instead
// of a flat row of individual tabs, with a second, quieter row of pills for
// whichever context is open and has more than one real destination inside
// it. A context switcher, not a standard app tab bar. Icons are this app's
// own (see components/ui/Icon.tsx), not emoji — an emoji renders
// differently per platform and carries its own baked-in color/style.
export interface HomeBarGroup {
  id: string
  icon: IconName
  label: string
  /** The real section ids this context covers — DashboardClient's section
   *  ids (brief/tasks/goals/habits/notes/money/people/village/home/calendar/
   *  smarthome/reference/places). members[0] is where selecting the group
   *  (without already being inside it) lands. */
  members: string[]
  /** True for a group whose tap opens an overlay (e.g. Smart Home) rather
   *  than switching `currentTab` — it can structurally never become
   *  `activeGroup`, so it would otherwise always render identically to a
   *  plain "not currently selected" icon. The small dot below its icon (see
   *  render below) is what tells those two states apart: "always opens
   *  something" vs. "just not the one you're on right now." */
  opensOverlay?: boolean
}

const MEMBER_LABELS: Record<string, string> = {
  brief: 'Today',
  tasks: 'Tasks', goals: 'Goals', habits: 'Habits', notes: 'Notes', money: 'Money', people: 'People',
  village: 'Village', home: 'Home', calendar: 'Calendar',
  smarthome: 'Controls', reference: 'Reference', places: 'Places',
}

export default function HomeBar({ groups, activeId, onSelect }: {
  groups: HomeBarGroup[]
  activeId: string
  onSelect: (id: string) => void
}) {
  const activeGroup = groups.find(g => g.members.includes(activeId)) ?? groups[0]

  return (
    <div style={{
      position: 'sticky', bottom: 0, zIndex: 90,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
      padding: '0.5rem 0 calc(0.5rem + env(safe-area-inset-bottom))',
    }}>
      {/* Secondary row — only the current context's own sub-destinations,
          quieter than the primary row so it reads as "within Home" rather
          than a second equal-weight nav. */}
      {activeGroup.members.length > 1 && (
        <div style={{
          display: 'flex', gap: '0.3rem', padding: '0.25rem',
          background: 'color-mix(in srgb, var(--gold) 6%, color-mix(in srgb, var(--bg) 55%, transparent))',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '999px', border: '1px solid color-mix(in srgb, var(--gold) 15%, var(--faint))',
          maxWidth: 'calc(100vw - 1.5rem)', overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {activeGroup.members.map(m => {
            const isActive = m === activeId
            return (
              <button key={m} onClick={() => onSelect(m)} className="press" style={{
                padding: '0.3rem 0.75rem', borderRadius: '999px', border: 'none', cursor: 'pointer', flexShrink: 0,
                background: isActive ? 'color-mix(in srgb, var(--gold) 16%, transparent)' : 'none',
                color: isActive ? 'var(--gold)' : 'var(--muted)',
                fontFamily: 'var(--font-body)', fontSize: '0.66rem', letterSpacing: '0.03em',
                opacity: isActive ? 1 : 0.75,
              }}>{MEMBER_LABELS[m] ?? m}</button>
            )
          })}
        </div>
      )}

      {/* Primary row — the four/five contexts. A little dock/signpost, not a
          standard app tab bar (2026-08-27 restyle, same icons/members/click
          behavior as before — purely visual): a warmer gold-tinted glass
          instead of a neutral one, a faint top highlight like a wood edge
          catching light, and the active state reads as a small grounding
          shadow under the icon (the same "sits above the scene" language
          every prop/building in the village itself uses) instead of a flat
          opacity/grayscale toggle. */}
      <div style={{
        position: 'relative',
        display: 'flex', gap: '0.15rem', padding: '0.3rem',
        background: 'color-mix(in srgb, var(--gold) 7%, color-mix(in srgb, var(--bg) 55%, transparent))',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderRadius: '20px', border: '1px solid color-mix(in srgb, var(--gold) 16%, var(--faint))',
        boxShadow: '0 2px 14px color-mix(in srgb, var(--text) 6%, transparent), inset 0 1px 0 color-mix(in srgb, var(--gold) 14%, transparent)',
        maxWidth: 'calc(100vw - 1.5rem)', overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {groups.map(g => {
          const isActive = g.id === activeGroup.id
          return (
            <button
              key={g.id}
              onClick={() => onSelect(isActive ? activeId : g.members[0])}
              aria-current={isActive ? 'page' : undefined}
              className="press"
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem',
                padding: '0.4rem 0.9rem', borderRadius: '16px', border: 'none', cursor: 'pointer',
                background: 'none', minWidth: '3.6rem', flexShrink: 0,
              }}
            >
              <span aria-hidden style={{
                position: 'relative', display: 'inline-flex',
                color: isActive ? 'var(--gold)' : 'var(--muted)', opacity: isActive ? 1 : 0.6,
                transition: 'opacity 160ms ease, color 160ms ease',
              }}>
                <Icon name={g.icon} size={19} />
                {/* See opensOverlay's own comment — a fixed cue, not tied to
                    isActive, since this icon can never BE active. */}
                {g.opensOverlay && (
                  <span aria-hidden style={{
                    position: 'absolute', bottom: -2, right: -3, width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--gold)', opacity: 0.75, boxShadow: '0 0 0 1.5px color-mix(in srgb, var(--bg) 55%, transparent)',
                  }} />
                )}
              </span>
              {/* Grounding shadow, only under the active icon — a small flat
                  ellipse, same shape/opacity language as the shadow under
                  every prop and building in the scene itself. */}
              <span aria-hidden style={{
                width: isActive ? 16 : 0, height: 3, borderRadius: '50%',
                background: 'var(--text)', opacity: isActive ? 0.14 : 0,
                transition: 'width 160ms ease, opacity 160ms ease', marginTop: '-1px',
              }} />
              <span style={{
                fontSize: '0.58rem', letterSpacing: '0.04em', fontFamily: 'var(--font-body)',
                color: isActive ? 'var(--text)' : 'var(--muted)', opacity: isActive ? 0.9 : 0.6,
              }}>{g.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
