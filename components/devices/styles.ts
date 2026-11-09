import type { CSSProperties } from 'react'

// Warm, standalone look for the pairing pages and the paired screen
// (2026-11-08). These pages run outside the dashboard, so no theme tokens.
export const SHELL: CSSProperties = {
  minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
  background: 'radial-gradient(120% 90% at 50% 0%, #f6ecd8 0%, #efe2c8 55%, #e7d6b8 100%)',
  fontFamily: 'var(--font-body, system-ui, sans-serif)', color: '#4a3f35',
}
export const CARD: CSSProperties = {
  background: '#fffdf7', border: '1px solid #e6d8bd', borderRadius: 20, padding: '2rem 1.6rem',
  maxWidth: '24rem', width: '100%', textAlign: 'center', boxShadow: '0 10px 30px rgba(74, 63, 53, 0.08)',
}
export const H1: CSSProperties = {
  fontFamily: 'var(--font-display, Georgia, serif)', fontWeight: 400, fontSize: '1.45rem', margin: '0 0 0.5rem', color: '#4a3f35',
}
export const P: CSSProperties = { fontSize: '0.92rem', color: '#8a7d6f', lineHeight: 1.6, margin: 0 }
export const BTN: CSSProperties = {
  padding: '0.7rem 1.3rem', borderRadius: 12, border: '1px solid #c9a86a', background: '#c9a86a', color: '#fffdf7',
  fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit',
}
export const BTN_QUIET: CSSProperties = { ...BTN, background: 'transparent', color: '#8a7d6f', borderColor: '#e6d8bd' }
export const INPUT: CSSProperties = {
  width: '100%', padding: '0.65rem 0.8rem', borderRadius: 10, border: '1px solid #e6d8bd', background: '#fffaf0',
  fontSize: '1rem', fontFamily: 'inherit', color: '#4a3f35', boxSizing: 'border-box',
}
