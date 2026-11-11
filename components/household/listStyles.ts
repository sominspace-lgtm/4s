// Shared look for the friendly Reference lists (date ideas, movies, games).

export const field: React.CSSProperties = {
  boxSizing: 'border-box', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10,
  padding: '0 0.75rem', minHeight: 44, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.92rem', outline: 'none',
}

export const muted: React.CSSProperties = { fontSize: '0.74rem', color: 'var(--muted)', lineHeight: 1.5 }

export const chip = (on: boolean): React.CSSProperties => ({
  minHeight: 34, padding: '0 0.8rem', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.78rem',
  border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`, background: on ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
  color: on ? 'var(--gold)' : 'var(--muted)', whiteSpace: 'nowrap',
})

export const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.7rem', padding: 0, fontFamily: 'var(--font-body)',
}

export const card: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.6rem 0.75rem',
  display: 'flex', flexDirection: 'column', gap: '0.3rem', textAlign: 'left', fontFamily: 'var(--font-body)', color: 'var(--text)',
}

export const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.76rem', color: 'var(--muted)' }
