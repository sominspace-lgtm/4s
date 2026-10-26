'use client'

import { useEffect, useState } from 'react'
import VaultHub from '@/components/vault/VaultHub'

// Settings (2026-10-25): everything that used to be spread across the ⋯
// menu and Me, on one page. Each row opens the same panel as before.

export interface SettingsActions {
  theme: () => void
  connect: () => void
  notifications: () => void
  customize: () => void
  archive: () => void
  ipad?: () => void
  signOut: () => void
}

function Row({ label, hint, onClick, href, danger = false }: { label: string; hint?: string; onClick?: () => void; href?: string; danger?: boolean }) {
  const inner = (
    <>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '0.95rem', color: danger ? 'var(--rose)' : 'var(--text)' }}>{label}</span>
        {hint && <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)' }}>{hint}</span>}
      </span>
      <span aria-hidden style={{ color: 'var(--muted)' }}>›</span>
    </>
  )
  const style: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%', minHeight: 56, padding: '0.55rem 0.2rem',
    background: 'none', border: 'none', borderBottom: '1px solid var(--faint, var(--border))', cursor: 'pointer',
    textAlign: 'left', fontFamily: 'var(--font-body)', textDecoration: 'none',
  }
  return href ? <a href={href} className="press" style={style}>{inner}</a> : <button onClick={onClick} className="press" style={style}>{inner}</button>
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '0.8rem 1.1rem 0.4rem', marginBottom: '0.9rem' }}>
      <div className="t-label" style={{ marginBottom: '0.2rem' }}>{title}</div>
      {children}
    </section>
  )
}

export default function SettingsPage({ userId, actions }: { userId: string; actions: SettingsActions }) {
  const [vault, setVault] = useState(false)
  // Passwords opens here when something asks for it (it used to be its own page).
  useEffect(() => {
    const on = () => setVault(true)
    window.addEventListener('4s:open-vault', on)
    return () => window.removeEventListener('4s:open-vault', on)
  }, [])

  return (
    <div>
      <Group title="You">
        <Row label="Account" hint="Name, email, PIN" href="/account" />
        <Row label="Look" hint="Theme, light or dark" onClick={actions.theme} />
      </Group>
      <Group title="Connections">
        <Row label="Google and apps" hint="Your Google, the shared account, calendar sharing, Alexa" onClick={actions.connect} />
        <Row label="Notifications" hint="What 4S may tell you, and when" onClick={actions.notifications} />
      </Group>
      <Group title="Layout">
        <Row label="Tabs and sections" hint="Show, hide and reorder" onClick={actions.customize} />
        {actions.ipad && <Row label="iPad settings" hint="Guest view, screen on, bedtime" onClick={actions.ipad} />}
      </Group>
      <Group title="Private">
        <Row label={vault ? 'Hide passwords' : 'Passwords'} hint="Your locked password vault" onClick={() => setVault(v => !v)} />
        {vault && <div style={{ padding: '0.8rem 0' }}><VaultHub userId={userId} /></div>}
        <Row label="Archive" hint="What you have put away" onClick={actions.archive} />
      </Group>
      <Group title="Leave">
        <Row label="Switch account" onClick={actions.signOut} />
        <Row label="Sign out" onClick={actions.signOut} danger />
      </Group>
    </div>
  )
}
