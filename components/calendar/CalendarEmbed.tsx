'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CalendarEmbed({ userId, initialUrl }: { userId: string; initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl ?? '')
  const [input, setInput] = useState('')
  const [showInput, setShowInput] = useState(!initialUrl)

  async function apply() {
    if (!input.trim()) return
    const supabase = createClient()
    await supabase.from('user_prefs').upsert({ user_id: userId, calendar_url: input.trim() })
    setUrl(input.trim())
    setShowInput(false)
    setInput('')
  }

  return (
    <div style={{ background: 'var(--surface)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
      {showInput ? (
        <div style={{ padding: '2rem 1.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', color: 'var(--gold)', marginBottom: '0.8rem' }}>◎</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--text)', marginBottom: '0.6rem' }}>Google Calendar</div>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.65, marginBottom: '1.2rem', maxWidth: '480px', margin: '0 auto 1.2rem' }}>
            Paste your embed URL below. Get it from Google Calendar → Settings → <em style={{ color: 'var(--text)' }}>your calendar</em> → Integrate calendar → Embed code.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '520px', margin: '0 auto' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && apply()}
              placeholder="https://calendar.google.com/calendar/embed?src=..."
              aria-label="Google Calendar embed URL"
              style={{
                flex: 1, background: 'var(--bg)', borderWidth: '1px', borderStyle: 'solid',
                borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)',
                fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 300,
                padding: '0.55rem 0.8rem', outline: 'none',
              }}
            />
            <button onClick={apply} style={{
              padding: '0.55em 1.2em', borderRadius: '8px', border: '1px solid rgba(232,160,192,0.3)',
              background: 'rgba(232,160,192,0.08)', color: 'var(--gold)', fontFamily: 'var(--font-body)',
              fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>Apply</button>
          </div>
        </div>
      ) : (
        <>
          <iframe src={url} style={{ width: '100%', height: '420px', display: 'block', border: 'none' }} title="Google Calendar" />
          <button onClick={() => setShowInput(true)} style={{
            display: 'block', width: '100%', padding: '0.5rem', background: 'transparent',
            border: 'none', borderTop: '1px solid var(--border)', color: 'var(--muted)',
            fontFamily: 'var(--font-body)', fontSize: '0.68rem', letterSpacing: '0.06em',
            cursor: 'pointer',
          }}>
            Change calendar URL
          </button>
        </>
      )}
    </div>
  )
}
