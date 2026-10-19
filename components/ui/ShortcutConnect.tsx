'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Set up "add oat milk" from the iPhone lock screen (2026-10-19). Makes a
// personal key (only its hash is saved) and shows the steps for a Shortcut
// that sends what you say to 4S. Making a new key turns the old one off.

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}
function newKey(): string {
  const b = new Uint8Array(24)
  crypto.getRandomValues(b)
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export default function ShortcutConnect() {
  const supabase = createClient()
  const [has, setHas] = useState<boolean | null>(null)
  const [key, setKey] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.from('quick_keys').select('created_at').maybeSingle()
      .then(({ data, error }) => { if (error) setErr('Not set up on the server yet.'); setHas(!!data) })
  }, [supabase])

  async function make() {
    setErr(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const k = newKey()
    const { error } = await supabase.from('quick_keys').upsert({ user_id: user.id, key_hash: await sha256(k), created_at: new Date().toISOString() })
    if (error) { setErr('Could not make a key. Is the server set up?'); return }
    setKey(k); setHas(true)
  }
  async function turnOff() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('quick_keys').delete().eq('user_id', user.id)
    setHas(false); setKey(null)
  }

  const muted: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }
  const url = typeof window !== 'undefined' ? `${window.location.origin}/api/quick-add` : '/api/quick-add'
  const btn: React.CSSProperties = { padding: '0.45rem 1rem', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={muted}>Say &ldquo;add oat milk&rdquo; or &ldquo;task call the vet&rdquo; from your iPhone lock screen, and it lands in 4S.</div>
      {err && <div style={{ ...muted, color: 'var(--rose)' }}>{err}</div>}
      {key ? (
        <>
          <div style={muted}>Your key. It is shown only now, so copy it into the Shortcut:</div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--text)', background: 'var(--surface2)', borderRadius: 8, padding: '0.5rem' }}>{key}</div>
          <button style={btn} onClick={async () => { try { await navigator.clipboard.writeText(key); setCopied(true) } catch { /* no clipboard */ } }}>{copied ? 'Copied' : 'Copy key'}</button>
          <ol style={{ ...muted, margin: 0, paddingLeft: '1.1rem' }}>
            <li>Open Shortcuts and make a new shortcut called &ldquo;Add to 4S&rdquo;.</li>
            <li>Add <b>Dictate Text</b>.</li>
            <li>Add <b>Get Contents of URL</b>. URL: <span style={{ color: 'var(--text)', wordBreak: 'break-all' }}>{url}</span>. Method: POST. Headers: <b>Authorization</b> = <b>Bearer</b>, a space, then your key. Request Body: JSON, with <b>text</b> set to Dictated Text.</li>
            <li>Add <b>Get Dictionary Value</b> for <b>message</b>, then <b>Show Result</b> (or <b>Speak Text</b>).</li>
            <li>Long-press the lock screen, Customize, and add the Shortcuts widget, or use the Action button.</li>
          </ol>
        </>
      ) : has ? (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={muted}>A key is set up.</span>
          <button style={btn} onClick={make}>Make a new key</button>
          <button style={{ ...btn, color: 'var(--rose)', borderColor: 'var(--rose)' }} onClick={turnOff}>Turn off</button>
        </div>
      ) : has === false ? (
        <div><button style={btn} onClick={make}>Set up the Shortcut</button></div>
      ) : null}
    </div>
  )
}
