'use client'

import { useState } from 'react'
import { usePushNotifications } from '@/lib/hooks/usePushNotifications'

// What 4S is allowed to push, and whether pushes are on at all. The daily
// cron (app/api/cron/daily) and the fridge-note route read notifyPrefs;
// a missing key means on.

const KINDS: { key: string; label: string; hint: string }[] = [
  { key: 'overdueTasks', label: 'Overdue tasks', hint: 'Once a day, if something is past due' },
  { key: 'subRenewal', label: 'Subscription renewals', hint: 'The day before one renews' },
  { key: 'checkinNudge', label: 'Weekly check-in', hint: 'Sunday, if you haven’t done it yet' },
  { key: 'fridgeNote', label: 'Fridge notes', hint: 'When your partner leaves one' },
]

export default function NotificationsPanel({ open, prefs, onChange, onClose }: {
  open: boolean
  prefs: Record<string, boolean>
  onChange: (next: Record<string, boolean>) => void
  onClose: () => void
}) {
  const push = usePushNotifications()
  const [test, setTest] = useState<{ state: 'idle' | 'sending' | 'sent' | 'error'; msg?: string }>({ state: 'idle' })
  if (!open) return null

  const on = (k: string) => prefs[k] !== false
  const toggle = (k: string) => onChange({ ...prefs, [k]: !on(k) })

  async function sendTest() {
    setTest({ state: 'sending' })
    try {
      const r = await fetch('/api/notify/test', { method: 'POST' })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j.sent > 0) setTest({ state: 'sent' })
      else if (r.ok) setTest({ state: 'error', msg: 'Nothing delivered — the subscription may be stale. Turn off and back on.' })
      else setTest({ state: 'error', msg: j.error === 'VAPID keys are not configured' ? 'Server is missing its push keys — tell an admin.' : (j.error ?? 'Send failed.') })
    } catch {
      setTest({ state: 'error', msg: 'Send failed.' })
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 525, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '1rem',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(360px, 92vw)', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '14px', padding: '1.2rem 1.3rem', boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
      }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.9rem' }}>Notifications</div>

        {push.status === 'unsupported' ? (
          <div style={{ fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            This browser can’t receive push notifications.
          </div>
        ) : push.status !== 'subscribed' ? (
          <div>
            <div style={{ fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '0.8rem' }}>
              {push.status === 'denied'
                ? 'Blocked in your browser settings — allow notifications for this site, then reload.'
                : 'Turn on push notifications on this device to choose what 4S tells you about.'}
            </div>
            {push.status !== 'denied' && (
              <button onClick={push.subscribe} className="btn btn-primary" style={{ fontSize: '0.74rem' }}>
                Turn on
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {KINDS.map(k => (
                <label key={k.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={on(k.key)} onChange={() => toggle(k.key)} style={{ marginTop: '0.15rem' }} />
                  <span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text)', display: 'block' }}>{k.label}</span>
                    <span style={{ fontSize: '0.66rem', color: 'var(--muted)', opacity: 0.8 }}>{k.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button onClick={sendTest} disabled={test.state === 'sending'} className="btn btn-ghost press" style={{ fontSize: '0.68rem' }}>
                {test.state === 'sending' ? 'Sending…' : test.state === 'sent' ? 'Sent — check your device ✓' : 'Send a test'}
              </button>
              <button onClick={push.unsubscribe} className="btn btn-ghost press" style={{ fontSize: '0.68rem', opacity: 0.7 }}>
                Turn off on this device
              </button>
            </div>
            {test.state === 'error' && test.msg && (
              <div role="alert" style={{ fontSize: '0.66rem', color: 'var(--rose)', marginTop: '0.5rem', lineHeight: 1.5 }}>{test.msg}</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
