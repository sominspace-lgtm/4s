'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  email: string
  userId: string
  displayName: string | null
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '1rem 0', borderBottom: '1px solid var(--faint)', gap: '1rem',
    }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', paddingTop: '0.2rem', flexShrink: 0, minWidth: '120px' }}>{label}</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>{children}</div>
    </div>
  )
}

function Btn({ onClick, children, danger, disabled }: { onClick: () => void; children: React.ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '0.45rem 1rem', borderRadius: '8px', cursor: disabled ? 'default' : 'pointer',
      border: danger ? '1px solid var(--rose)' : '1px solid var(--border)',
      background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
      color: danger ? 'var(--rose)' : 'var(--text)', opacity: disabled ? 0.4 : 1,
    }}>{children}</button>
  )
}

export default function AccountClient({ email, userId, displayName }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [name, setName] = useState(displayName ?? '')
  const [nameSaved, setNameSaved] = useState(false)

  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const [notifState, setNotifState] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [exporting, setExporting] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null)

  async function saveName() {
    const { error } = await supabase.from('user_prefs').upsert({ user_id: userId, display_name: name.trim() || email.split('@')[0] })
    if (error) return
    setNameSaved(true); setTimeout(() => setNameSaved(false), 2000)
  }

  async function changePassword() {
    setPwMsg(null)
    if (!pwNew || pwNew.length < 8) { setPwMsg({ text: 'New password must be at least 8 characters.', ok: false }); return }
    const { error } = await supabase.auth.updateUser({ password: pwNew })
    if (error) { setPwMsg({ text: error.message, ok: false }); return }
    setPwMsg({ text: 'Password updated.', ok: true }); setPwCurrent(''); setPwNew('')
  }

  async function requestNotifications() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifState(perm)
    if (perm === 'granted') new Notification('4S', { body: "You'll be notified about overdue items.", icon: '/icon-192.png' })
  }

  async function exportData() {
    setExporting(true)
    try {
      const res = await fetch('/api/export')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `4s-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click(); URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  async function deleteAccount() {
    if (deleteInput.toLowerCase() !== 'delete') { setDeleteMsg('Type "delete" to confirm.'); return }
    // Sign out; actual deletion requires service role — stub with note
    await supabase.auth.signOut()
    router.push('/login?deleted=1')
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
    padding: '0.5rem 0.75rem', color: 'var(--text)', fontFamily: 'var(--font-body)',
    fontSize: '0.78rem', outline: 'none', width: '100%',
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      {/* Back */}
      <button
        onClick={() => router.push('/dashboard')}
        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem', marginBottom: '1.5rem', padding: 0 }}
      >← dashboard</button>

      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '2rem', marginBottom: '0.4rem' }}>Account</h1>
      <p style={{ fontSize: '0.73rem', color: 'var(--muted)', marginBottom: '2.5rem' }}>{email}</p>

      {/* Profile */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0.5rem 1.25rem', marginBottom: '1.2rem' }}>
        <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.5, padding: '0.75rem 0 0.25rem' }}>Profile</div>
        <Row label="Display name">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveName()} style={{ ...inputStyle, width: 'auto', flex: 1 }} />
            <Btn onClick={saveName}>{nameSaved ? 'saved ✓' : 'save'}</Btn>
          </div>
        </Row>
        <Row label="Email">
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{email}</span>
        </Row>
      </div>

      {/* Security */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0.5rem 1.25rem', marginBottom: '1.2rem' }}>
        <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.5, padding: '0.75rem 0 0.25rem' }}>Security</div>
        <Row label="Password">
          <input value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="New password (min 8 chars)" type="password" style={inputStyle} />
          <Btn onClick={changePassword}>Update password</Btn>
          {pwMsg && <div style={{ fontSize: '0.68rem', color: pwMsg.ok ? 'var(--emerald)' : 'var(--rose)' }}>{pwMsg.text}</div>}
        </Row>
      </div>

      {/* Notifications */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0.5rem 1.25rem', marginBottom: '1.2rem' }}>
        <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.5, padding: '0.75rem 0 0.25rem' }}>Notifications</div>
        <Row label="Browser alerts">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>
              {notifState === 'granted' ? "✓ Enabled — you'll be notified about overdue items" :
               notifState === 'denied'  ? '✗ Blocked — allow in browser settings to enable' :
               'Get alerted when work items go overdue'}
            </span>
            {notifState !== 'granted' && notifState !== 'denied' && (
              <Btn onClick={requestNotifications}>Enable</Btn>
            )}
          </div>
        </Row>
      </div>

      {/* Data */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0.5rem 1.25rem', marginBottom: '1.2rem' }}>
        <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.5, padding: '0.75rem 0 0.25rem' }}>Your data</div>
        <Row label="Export">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>Download everything as JSON — habits, tasks, captures, preferences.</span>
            <Btn onClick={exportData} disabled={exporting}>{exporting ? 'exporting…' : 'Export'}</Btn>
          </div>
        </Row>
      </div>

      {/* Danger zone */}
      <div style={{ background: 'var(--surface)', border: '1px solid color-mix(in srgb, var(--rose) 25%, transparent)', borderRadius: '14px', padding: '0.5rem 1.25rem' }}>
        <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--rose)', opacity: 0.6, padding: '0.75rem 0 0.25rem' }}>Danger zone</div>
        <Row label="Delete account">
          {!deleteConfirm ? (
            <Btn onClick={() => setDeleteConfirm(true)} danger>Delete my account</Btn>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Type <strong>delete</strong> to confirm. This is permanent and cannot be undone.</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder='type "delete"' style={{ ...inputStyle, width: 'auto', flex: 1 }} />
                <Btn onClick={deleteAccount} danger>Confirm</Btn>
                <Btn onClick={() => { setDeleteConfirm(false); setDeleteInput(''); setDeleteMsg(null) }}>Cancel</Btn>
              </div>
              {deleteMsg && <div style={{ fontSize: '0.68rem', color: 'var(--rose)' }}>{deleteMsg}</div>}
            </div>
          )}
        </Row>
      </div>
    </div>
  )
}
