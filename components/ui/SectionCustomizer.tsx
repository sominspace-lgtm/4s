'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// The one reorder/hide drawer, used at every level that has a customizable
// list — top-level tabs (CustomizePanel), Today's blocks (was
// TodayCustomizePanel, now a thin caller), and as of 2026-08-12 Personal's
// and Household's sub-tabs plus Household Home's content blocks. All of
// these used to be near-identical hand-copies of the same drawer; this is
// the one copy, parameterized over what it's customizing.
//
// "iPhone home screen" is the right mental model: every level that has a
// list of named, positioned things gets the same reorder-and-hide gesture,
// recursively, rather than each screen inventing its own. What's NOT here
// on purpose: nothing enforces that every possible list in the app is
// customizable — only ones that already exist as a real {id,label}[] array
// get wired up. See the implementation plan for which ones are and aren't
// (People's Sharing sub-toggles and Money's internal tabs are explicitly
// deferred, not silently forgotten).
export interface SectionConfig {
  id: string
  label: string
  hidden: boolean
  // A second line under the label — Today's blocks and Household's Home
  // blocks use this ("The single next action", "What's due, what to buy"),
  // top-level tabs don't set it.
  hint?: string
  collapsed?: boolean
}

interface Props {
  open: boolean
  title: string
  intro?: string
  sections: SectionConfig[]
  // Ids that can't change position — a fixed-position exception, same idea
  // as TodayCustomizePanel's old REORDERABLE set. Omit to make everything
  // reorderable (the top-level-tabs case).
  reorderable?: Set<string>
  // Lets the drawer offer "reset to default" — omit to hide that button
  // (not every caller has a meaningful single default to reset to).
  defaultSections?: SectionConfig[]
  onChange: (next: SectionConfig[]) => void
  onClose: () => void
}

export default function SectionCustomizer({
  open, title, intro, sections, reorderable, defaultSections, onChange, onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // Portal to document.body (2026-08-12 fix): PersonalHub/HouseholdHub render
  // inside DashboardClient's `.tab-in` wrapper, which carries a CSS
  // `animation` that sets a real (non-'none') `transform` on it for the
  // first 240ms after every tab switch. Per spec, ANY transform on an
  // ancestor — including one from a CSS animation — turns that ancestor into
  // the containing block for `position:fixed` descendants, so this drawer
  // was rendering relative to `.tab-in`'s box instead of the viewport: wrong
  // position, wrong size context, and it could appear "open" without a
  // click. The pre-existing top-level CustomizePanel/TodayCustomizePanel
  // never hit this because they render outside `.tab-in`. A portal sidesteps
  // the whole class of bug regardless of what any ancestor's CSS does.
  const [mounted, setMounted] = useState(false)
  // The standard SSR-safe mount detection for a portal target — document.body
  // doesn't exist during server render, so this must wait for the client.
  // There's no external system to synchronize with here; it's a one-time
  // "am I in the browser yet" flag, which is exactly what this effect is for.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  function toggle(id: string) {
    onChange(sections.map(s => (s.id === id ? { ...s, hidden: !s.hidden } : s)))
  }

  function canReorder(id: string): boolean {
    return !reorderable || reorderable.has(id)
  }

  // Swaps within the reorderable subset only — fixed-position entries still
  // carry a real `hidden` flag, just not a meaningful position.
  function move(id: string, dir: -1 | 1) {
    const order = sections.filter(s => canReorder(s.id))
    const idx = order.findIndex(s => s.id === id)
    const j = idx + dir
    if (idx === -1 || j < 0 || j >= order.length) return
    const a = order[idx], b = order[j]
    onChange(sections.map(x => (x.id === a.id ? b : x.id === b.id ? a : x)))
  }

  const reorderOrder = sections.filter(s => canReorder(s.id)).map(s => s.id)

  // Not mounted yet (SSR / first client paint) — nothing to portal into.
  // The drawer is closed on first paint anyway (open starts false in every
  // caller), so this is never visible either way.
  if (!mounted) return null

  return createPortal(
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 199, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.2s',
      }} />

      <div ref={ref} style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '300px',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 200, padding: '1.5rem',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {title}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
          }}>✕</button>
        </div>

        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.6, marginBottom: '0.5rem', lineHeight: 1.6 }}>
          {intro ?? 'Reorder with ↑↓ or hide with the eye toggle.'}
        </div>

        {sections.map((s) => {
          const reorderableRow = canReorder(s.id)
          const ri = reorderOrder.indexOf(s.id)
          return (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 0.7rem', borderRadius: '8px',
              background: s.hidden ? 'transparent' : 'var(--hover-bg)',
              border: '1px solid var(--border)', opacity: s.hidden ? 0.4 : 1,
              transition: 'opacity 0.15s',
            }}>
              {reorderableRow ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <button onClick={() => move(s.id, -1)} disabled={ri === 0} className="press" style={{
                    background: 'none', border: 'none', color: 'var(--muted)', cursor: ri === 0 ? 'default' : 'pointer',
                    fontSize: '0.55rem', lineHeight: 1, padding: '1px', opacity: ri === 0 ? 0.2 : 0.6,
                  }}>▲</button>
                  <button onClick={() => move(s.id, 1)} disabled={ri === reorderOrder.length - 1} className="press" style={{
                    background: 'none', border: 'none', color: 'var(--muted)', cursor: ri === reorderOrder.length - 1 ? 'default' : 'pointer',
                    fontSize: '0.55rem', lineHeight: 1, padding: '1px', opacity: ri === reorderOrder.length - 1 ? 0.2 : 0.6,
                  }}>▼</button>
                </div>
              ) : (
                <div style={{ width: '0.9rem', flexShrink: 0 }} title="Fixed position" />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text)', fontWeight: 300 }}>{s.label}</div>
                {s.hint && <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.65 }}>{s.hint}</div>}
              </div>

              <button onClick={() => toggle(s.id)} title={s.hidden ? 'Show' : 'Hide'} className="press" style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.82rem', color: 'var(--muted)', opacity: s.hidden ? 0.3 : 0.7,
                padding: '2px', lineHeight: 1,
              }}>
                {s.hidden ? '🙈' : '👁'}
              </button>
            </div>
          )
        })}

        {defaultSections && (
          <button
            onClick={() => onChange(defaultSections)}
            style={{
              marginTop: '1rem', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: '0.68rem',
              letterSpacing: '0.05em',
            }}
          >
            Reset to default
          </button>
        )}
      </div>
    </>,
    document.body,
  )
}
