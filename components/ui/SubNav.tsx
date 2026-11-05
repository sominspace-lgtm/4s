'use client'

import { useEffect, useRef, useState } from 'react'

// The top bar inside a tab (2026-10-21 redesign). The bottom bar picks the
// place (Today, Home, Me, Places); this picks the page inside it, at a size a
// thumb can hit and an eye can read. Inside Me it is a back link instead,
// since Me opens to a grid of tiles, not a row of pills.
//
// On a phone the row can be wider than the screen (Home has six pages), so
// it scrolls (2026-10-29): the open page slides into view, and the edge fades
// wherever more pages are hiding, so none of them look missing.

export interface SubNavItem { id: string; label: string }

export default function SubNav({ items, activeId, onSelect, back }: {
  items?: SubNavItem[]
  activeId: string
  onSelect: (id: string) => void
  back?: { label: string; title: string; onClick: () => void }
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState({ left: false, right: false })

  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const check = () => setMore({ left: row.scrollLeft > 2, right: row.scrollLeft + row.clientWidth < row.scrollWidth - 2 })
    check()
    row.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => { row.removeEventListener('scroll', check); window.removeEventListener('resize', check) }
  }, [items?.length])

  useEffect(() => {
    const tab = rowRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeId])

  const fade = 28
  const mask = more.left || more.right
    ? `linear-gradient(to right, ${more.left ? 'transparent' : '#000'} 0, #000 ${more.left ? fade : 0}px, #000 calc(100% - ${more.right ? fade : 0}px), ${more.right ? 'transparent' : '#000'} 100%)`
    : undefined

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
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div ref={rowRef} role="tablist" style={{
            display: 'flex', gap: '0.2rem', padding: '0.2rem', overflowX: 'auto', scrollbarWidth: 'none',
            maskImage: mask, WebkitMaskImage: mask,
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
        </div>
      )}
    </div>
  )
}
