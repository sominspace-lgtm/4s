import type { CSSProperties } from 'react'

// One look for every card under the village (2026-10-19, "elegant but
// cozy"): warm paper rather than a coloured tint per card, a hairline edge,
// a serif title, and room to breathe. The tint a card used to carry now only
// colours its small icon.
export const panelCard: CSSProperties = {
  background: 'color-mix(in srgb, var(--surface) 90%, #f3e3c8 10%)',
  border: '1px solid color-mix(in srgb, var(--border) 70%, #d9c4a0 30%)',
  borderRadius: 16,
  padding: '0.85rem 1rem',
  display: 'flex', flexDirection: 'column', gap: '0.45rem',
  boxShadow: '0 1px 0 color-mix(in srgb, #fff 35%, transparent) inset, 0 6px 18px -12px rgba(60, 40, 20, 0.35)',
}

export const panelTitle: CSSProperties = {
  fontFamily: 'var(--font-display)', fontSize: '0.98rem', fontWeight: 400, letterSpacing: '0.01em', color: 'var(--text)',
}

export const panelLabel: CSSProperties = {
  fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)',
}
