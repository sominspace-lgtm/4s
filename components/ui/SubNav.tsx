'use client'

// The top bar inside a tab (2026-10-21 redesign). The bottom bar picks the
// place (Today, Home, Me, Places); this picks the page inside it, at a size a
// thumb can hit and an eye can read. Inside Me it is a back link instead,
// since Me opens to a grid of tiles, not a row of pills.

export interface SubNavItem { id: string; label: string }

export default function SubNav({ items, activeId, onSelect, back }: {
  items?: SubNavItem[]
  activeId: string
  onSelect: (id: string) => void
  back?: { label: string; title: string; onClick: () => void }
}) {
  return (
    <div className="subnav" style={{
      position: 'sticky', top: 0, zIndex: 80,
      margin: '0 0 1rem', padding: '0.5rem 0',
      background: 'color-mix(in srgb, var(--bg) 82%, transparent)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    }}>
      {back ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minHeight: 44 }}>
          <button onClick={back.onClick} className="press" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)',
            fontFamily: 'var(--font-body)', fontSize: '0.92rem', padding: '0.5rem 0.4rem 0.5rem 0', minHeight: 44,
          }}>‹ {back.label}</button>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text)' }}>{back.title}</div>
        </div>
      ) : (
        <div role="tablist" style={{
          display: 'flex', gap: '0.2rem', padding: '0.2rem', overflowX: 'auto', scrollbarWidth: 'none',
          background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12,
        }}>
          {(items ?? []).map(it => {
            const on = it.id === activeId
            return (
              <button key={it.id} role="tab" aria-selected={on} onClick={() => onSelect(it.id)} className="press" style={{
                flex: '1 0 auto', minHeight: 40, padding: '0 0.6rem', borderRadius: 9, border: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap', fontFamily: 'var(--font-body)', fontSize: '0.86rem',
                background: on ? 'var(--surface)' : 'transparent',
                color: on ? 'var(--text)' : 'var(--muted)',
                boxShadow: on ? '0 1px 4px var(--shadow)' : 'none',
                fontWeight: on ? 500 : 400,
              }}>{it.label}</button>
            )
          })}
        </div>
      )}
    </div>
  )
}
