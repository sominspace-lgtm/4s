'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/LangContext'
import { t } from '@/lib/i18n'
import { fileAction, ACTION_WORD, type CaptureAction } from '@/lib/capture/file'
import { useGoogleStatus } from '@/lib/hooks/useGoogle'

// The fast way to get a thought out of your head — ⌘K, the + button, the
// `c` key, the village mailbox all open this. One field, Enter saves a
// personal note and closes. (Was "Quick Capture" writing to a separate
// `captures` table with an Inbox to triage; folded into Notes 2026-09-04.)
export default function QuickNote() {
  const lang = useLang()

  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // The smart + (2026-10-25): a sentence becomes actions to confirm.
  const [actions, setActions] = useState<CaptureAction[] | null>(null)
  const [busy, setBusy] = useState(false)
  const { status: g } = useGoogleStatus()
  const supabase = createClient()

  useEffect(() => {
    function openFresh() {
      setOpen(o => !o)
      setSaved(false)
      setError(null)
      setText('')
      setActions(null)
    }
    function forceOpen() {
      setOpen(true)
      setSaved(false)
      setError(null)
    }
    function handle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openFresh() }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handle)
    window.addEventListener('app:open-quick-capture', openFresh)
    // The mailbox / the Today "New note" button fire this — always open,
    // never toggle shut.
    window.addEventListener('app:focus-capture', forceOpen)
    return () => {
      window.removeEventListener('keydown', handle)
      window.removeEventListener('app:open-quick-capture', openFresh)
      window.removeEventListener('app:focus-capture', forceOpen)
    }
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  // This is the app's single most-used entry point — losing a thought here
  // silently is the worst place for it to happen. Only claim success on real
  // success, and never wipe what someone typed if it didn't save.
  // Read the sentence: the AI splits it into actions (shopping, a chore, a
  // calendar event, a task, a note) for you to look over. With no AI, or
  // nothing it can place, it is simply saved as a note.
  async function read() {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task: 'route-capture', text: trimmed }) })
      const j = res.ok ? await res.json() as { result?: { actions?: CaptureAction[] } } : null
      const list = (j?.result?.actions ?? []).filter(a => a && a.type)
      if (list.length === 0 || (list.length === 1 && list[0].type === 'note')) { setBusy(false); await submit(); return }
      setActions(list)
    } catch { await submit() }
    setBusy(false)
  }

  async function fileAll() {
    if (!actions) return
    setBusy(true); setError(null)
    const problems: string[] = []
    for (const a of actions) {
      const e = await fileAction(a, { googleCalendar: g.connected && !!g.calendar })
      if (e) problems.push(e)
    }
    setBusy(false)
    if (problems.length) { setError(problems.join(' ')); return }
    setActions(null); setSaved(true); setText('')
    setTimeout(() => setOpen(false), 900)
  }

  async function submit() {
    const trimmed = text.trim()
    if (!trimmed) return
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("Couldn't confirm your session. Your text is still here, try again.")
      return
    }
    const { error: insertError } = await supabase
      .from('notes')
      .insert({ user_id: user.id, space_id: null, title: '', body: trimmed })
    if (insertError) {
      setError(`Couldn't save: ${insertError.message}`)
      return
    }
    window.dispatchEvent(new CustomEvent('4s:notes-changed'))
    setSaved(true)
    setText('')
    setTimeout(() => setOpen(false), 900)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick note"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'var(--scrim-modal)', backdropFilter: 'blur(6px)',
      }}
    >
      {/* Top-anchored, not centered — a vertically centered dialog is the one
          place a phone keyboard reliably covers. */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', top: '12%', left: '50%', transform: 'translateX(-50%)',
          width: 'min(540px, calc(100vw - 2rem))',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '20px', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {saved ? (
          <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--gold)', letterSpacing: '0.08em' }}>
            {t('saved ✓', lang)}
          </div>
        ) : (
          <>
            <div style={{ padding: '1.4rem 1.4rem 0' }}>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.85rem', opacity: 0.6 }}>
                Add anything · ⌘K
              </div>
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void read() }
                  if (e.key === 'Escape') setOpen(false)
                }}
                placeholder="Say anything: dinner with Mom Friday 7pm, buy cat litter, I cleaned the litter"
                rows={3}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  color: 'var(--text)', fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.05rem,3vw,1.35rem)', fontWeight: 300,
                  outline: 'none', letterSpacing: '0.01em', resize: 'none', lineHeight: 1.5,
                }}
              />
            </div>

            {actions && (
              <div style={{ padding: '0 1.4rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Here is what I will do. Remove anything that is wrong.</div>
                {actions.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--gold) 30%, var(--border))', background: 'color-mix(in srgb, var(--gold) 6%, transparent)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--gold)', minWidth: '4.5rem' }}>{ACTION_WORD[a.type]}{a.type === 'chore' && a.done ? ' done' : ''}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: '0.88rem', color: 'var(--text)' }}>{a.label}{a.date ? ` · ${a.date}` : ''}{a.time ? ` ${a.time}` : ''}</span>
                    <button onClick={() => setActions(list => { const n = (list ?? []).filter((_, k) => k !== i); return n.length ? n : null })} aria-label="Remove" style={{ minWidth: 36, minHeight: 36, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>
            )}
            {error && (
              <div role="alert" style={{
                fontSize: '0.72rem', color: 'var(--danger, #c0554d)',
                padding: '0 1.4rem 0.6rem',
              }}>{error}</div>
            )}
            <div style={{ padding: '0.75rem 1.4rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              {actions && (
                <button onClick={() => { setActions(null); void submit() }} disabled={busy}
                  style={{ marginRight: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.8rem', minHeight: 40 }}>
                  Just save it as a note
                </button>
              )}
              <button
                onClick={() => { if (actions) void fileAll(); else void read() }}
                disabled={!text.trim() || busy}
                style={{
                  padding: '0.55rem 1.4rem', borderRadius: '10px', cursor: text.trim() ? 'pointer' : 'not-allowed',
                  background: text.trim() ? 'var(--gold)' : 'var(--hover-bg)',
                  border: 'none', color: text.trim() ? 'var(--bg)' : 'var(--muted)',
                  fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 500,
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                {busy ? 'Working…' : actions ? 'Do it' : t('Save ↵', lang)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
