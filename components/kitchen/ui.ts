import type { CSSProperties } from 'react'

// Shared look for the kitchen screens (2026-10-13). Same tokens as the rest of
// the dashboard; kept here so the dozen small pieces do not each restate them.
export const field: CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '0.45rem 0.65rem', color: 'var(--text)', fontFamily: 'var(--font-body)',
  fontSize: '0.8rem', outline: 'none',
}
export const muted: CSSProperties = { fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5 }
export const card: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem 1.2rem' }
export const small: CSSProperties = {
  fontSize: '0.66rem', padding: '0.25em 0.7em', borderRadius: '7px', border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)',
}
export const label: CSSProperties = { fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }

export const chip = (active: boolean): CSSProperties => ({
  fontSize: '0.66rem', padding: '0.25em 0.75em', borderRadius: '999px', cursor: 'pointer', fontFamily: 'var(--font-body)',
  border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
  background: active ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'transparent',
  color: active ? 'var(--gold)' : 'var(--muted)',
})
