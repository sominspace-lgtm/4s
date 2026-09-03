'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/LangContext'
import { t } from '@/lib/i18n'

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
  const supabase = createClient()

  useEffect(() => {
    function openFresh() {
      setOpen(o => !o)
      setSaved(false)
      setError(null)
      setText('')
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
  async function submit() {
    const trimmed = text.trim()
    if (!trimmed) return
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("Couldn't confirm your session — your text is still here, try again.")
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
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
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
                {t('quick note — ⌘K', lang)}
              </div>
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
                  if (e.key === 'Escape') setOpen(false)
                }}
                placeholder={t("What's on your mind?", lang)}
                rows={3}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  color: 'var(--text)', fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.05rem,3vw,1.35rem)', fontWeight: 300,
                  outline: 'none', letterSpacing: '0.01em', resize: 'none', lineHeight: 1.5,
                }}
              />
            </div>

            {error && (
              <div role="alert" style={{
                fontSize: '0.72rem', color: 'var(--danger, #c0554d)',
                padding: '0 1.4rem 0.6rem',
              }}>{error}</div>
            )}
            <div style={{ padding: '0.75rem 1.4rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <button
                onClick={submit}
                disabled={!text.trim()}
                style={{
                  padding: '0.55rem 1.4rem', borderRadius: '10px', cursor: text.trim() ? 'pointer' : 'not-allowed',
                  background: text.trim() ? 'var(--gold)' : 'var(--hover-bg)',
                  border: 'none', color: text.trim() ? 'var(--bg)' : 'var(--muted)',
                  fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 500,
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                {t('Save ↵', lang)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
