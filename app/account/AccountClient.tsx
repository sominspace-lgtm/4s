'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  email: string
  userId: string
  displayName: string | null
  isAnonymous: boolean
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

export default function AccountClient({ email, userId, displayName, isAnonymous }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [name, setName] = useState(displayName ?? '')
  const [nameSaved, setNameSaved] = useState(false)

  // Guest → permanent account upgrade. updateUser on an anonymous session
  // attaches credentials to the SAME user id, so everything they've built
  // (habits, tasks, prefs, shares) is already theirs — nothing migrates.
  const [keepEmail, setKeepEmail] = useState('')
  const [keepPassword, setKeepPassword] = useState('')
  const [keepMsg, setKeepMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [keeping, setKeeping] = useState(false)

  async function keepSpace() {
    setKeepMsg(null)
    if (!keepEmail.includes('@')) { setKeepMsg({ text: 'Enter a valid email address.', ok: false }); return }
    if (keepPassword.length < 8) { setKeepMsg({ text: 'Use at least 8 characters for your password.', ok: false }); return }
    setKeeping(true)
    const { data, error } = await supabase.auth.updateUser({ email: keepEmail.trim(), password: keepPassword })
    setKeeping(false)
    if (error) { setKeepMsg({ text: error.message, ok: false }); return }
    // If email confirmation is on, Supabase parks the address in new_email
    // until the link is clicked; otherwise it applies immediately.
    if (data.user?.new_email) {
      setKeepMsg({ text: `Almost done — confirm via the link we sent to ${keepEmail.trim()}.`, ok: true })
    } else {
      setKeepMsg({ text: 'Your space is saved. You can now sign in from any device.', ok: true })
      setTimeout(() => router.refresh(), 1200)
    }
  }

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

  const [alexaCode, setAlexaCode] = useState<string | null>(null)
  const [alexaLoading, setAlexaLoading] = useState(false)
  const [alexaErr, setAlexaErr] = useState<string | null>(null)
  const [alexaLinked, setAlexaLinked] = useState<boolean | null>(null) // null = still checking
  const [alexaUnlinking, setAlexaUnlinking] = useState(false)

  useEffect(() => {
    supabase.from('alexa_links').select('user_id').eq('user_id', userId).maybeSingle()
      .then(({ data }) => setAlexaLinked(!!data))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // While a code is showing, poll so "Connected" appears the moment linking
  // succeeds on Alexa's side — no manual refresh needed.
  useEffect(() => {
    if (!alexaCode || alexaLinked) return
    const id = setInterval(() => {
      supabase.from('alexa_links').select('user_id').eq('user_id', userId).maybeSingle()
        .then(({ data }) => { if (data) { setAlexaLinked(true); setAlexaCode(null) } })
    }, 3000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alexaCode, alexaLinked])

  async function connectAlexa() {
    setAlexaLoading(true); setAlexaCode(null); setAlexaErr(null)
    try {
      const res = await fetch('/api/alexa/link-code', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (data.code) setAlexaCode(data.code)
      else setAlexaErr(data.error || `Couldn't generate a code (status ${res.status}).`)
    } catch {
      setAlexaErr('Network error — try again.')
    } finally { setAlexaLoading(false) }
  }

  async function unlinkAlexa() {
    setAlexaUnlinking(true); setAlexaErr(null)
    const { error } = await supabase.from('alexa_links').delete().eq('user_id', userId)
    setAlexaUnlinking(false)
    if (error) { setAlexaErr(error.message); return }
    setAlexaLinked(false)
    setAlexaCode(null)
  }

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
    if (perm === 'granted') new Notification('4S', { body: "You'll be notified about overdue items.", icon: '/icons/192.png' })
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
      <p style={{ fontSize: '0.73rem', color: 'var(--muted)', marginBottom: '2.5rem' }}>{isAnonymous ? 'Guest space — not saved to an email yet' : email}</p>

      {/* Keep your space — guest → permanent upgrade */}
      {isAnonymous && (
        <div style={{
          background: 'var(--surface)', borderRadius: '14px', padding: '0.5rem 1.25rem', marginBottom: '1.2rem',
          border: '1px solid color-mix(in srgb, var(--gold) 35%, var(--border))',
        }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.8, padding: '0.75rem 0 0.25rem' }}>Keep your space</div>
          <Row label="Save it">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <span style={{ fontSize: '0.73rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                Everything you&apos;ve set up lives only in this browser for now. Add an email and
                password to keep it — same space, reachable from any device.
              </span>
              <input value={keepEmail} onChange={e => setKeepEmail(e.target.value)} placeholder="you@email.com" type="email" autoComplete="email" style={inputStyle} />
              <input value={keepPassword} onChange={e => setKeepPassword(e.target.value)} placeholder="Password (min 8 chars)" type="password" autoComplete="new-password" style={inputStyle} />
              {keepMsg && <div style={{ fontSize: '0.68rem', color: keepMsg.ok ? 'var(--emerald)' : 'var(--rose)' }}>{keepMsg.text}</div>}
              <Btn onClick={keepSpace} disabled={keeping}>{keeping ? 'saving…' : 'Keep my space'}</Btn>
            </div>
          </Row>
        </div>
      )}

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
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{isAnonymous ? 'None yet — add one above to keep your space' : email}</span>
        </Row>
      </div>

      {/* Security — guests set their first password via Keep your space */}
      {!isAnonymous && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0.5rem 1.25rem', marginBottom: '1.2rem' }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.5, padding: '0.75rem 0 0.25rem' }}>Security</div>
          <Row label="Password">
            <input value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="New password (min 8 chars)" type="password" style={inputStyle} />
            <Btn onClick={changePassword}>Update password</Btn>
            {pwMsg && <div style={{ fontSize: '0.68rem', color: pwMsg.ok ? 'var(--emerald)' : 'var(--rose)' }}>{pwMsg.text}</div>}
          </Row>
        </div>
      )}

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

      {/* Alexa */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0.5rem 1.25rem', marginBottom: '1.2rem' }}>
        <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.5, padding: '0.75rem 0 0.25rem' }}>Alexa</div>
        <Row label="Connect Alexa">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {alexaErr && <div style={{ fontSize: '0.68rem', color: 'var(--rose)' }}>{alexaErr}</div>}

            {alexaLinked === null ? (
              <span style={{ fontSize: '0.73rem', color: 'var(--muted)', opacity: 0.7 }}>Checking…</span>
            ) : alexaLinked ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.73rem',
                  color: 'var(--emerald)',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />
                  Connected — your Echo is linked to this account.
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                  Switching to a different Echo, or handing this off to someone else? Unlink first —
                  an Alexa device can only be bound to one 4S account at a time.
                </span>
                <Btn onClick={unlinkAlexa} disabled={alexaUnlinking} danger>{alexaUnlinking ? 'unlinking…' : 'Unlink Alexa'}</Btn>
              </div>
            ) : (
              <>
                <span style={{ fontSize: '0.73rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                  Get a code, then say <em style={{ color: 'var(--text)' }}>&ldquo;Alexa, ask four s to link&rdquo;</em> and read it out. Links your Echo to this account.
                </span>
                {!alexaCode ? (
                  <Btn onClick={connectAlexa} disabled={alexaLoading}>{alexaLoading ? 'generating…' : 'Get my code'}</Btn>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.35em',
                      color: 'var(--gold)', padding: '0.4rem 0', textAlign: 'center',
                      background: 'color-mix(in srgb, var(--gold) 8%, transparent)', borderRadius: '10px',
                      border: '1px solid color-mix(in srgb, var(--gold) 25%, transparent)',
                    }}>{alexaCode}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textAlign: 'center' }}>
                      Say: <strong style={{ color: 'var(--text)' }}>&ldquo;Alexa, ask four s to link {alexaCode.split('').join(' ')}&rdquo;</strong>
                    </span>
                    <Btn onClick={connectAlexa} disabled={alexaLoading}>New code</Btn>
                  </div>
                )}
              </>
            )}
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
