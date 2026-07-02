'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearch, type SearchResult } from '@/lib/hooks/useSearch'
import { useLang } from '@/lib/LangContext'
import { t } from '@/lib/i18n'

const TYPE_ICON: Record<string, string> = {
  capture:  '○',
  work:     '◈',
  wishlist: '✦',
  habit:    '◉',
  note:     '□',
}
const TYPE_COLOR: Record<string, string> = {
  capture:  'var(--muted)',
  work:     'var(--gold)',
  wishlist: 'var(--amber)',
  habit:    'var(--emerald)',
  note:     'var(--purple)',
}

interface Command {
  id: string
  label: string
  hint?: string
  icon: string
  run: () => void
}

function goTo(sectionId: string) {
  document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function SearchModal({ open, onClose }: Props) {
  const lang = useLang()
  const [query, setQuery] = useState('')
  const [idx, setIdx] = useState(0)
  const { results, loading, search, clear } = useSearch()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const commands: Command[] = [
    { id: 'go-brief',    label: 'Go to Today',       icon: '◒', run: () => goTo('brief') },
    { id: 'go-work',     label: 'Go to Work Hub',    icon: '◈', run: () => goTo('work') },
    { id: 'go-habits',   label: 'Go to Habits',      icon: '◉', run: () => goTo('habits') },
    { id: 'go-capture',  label: 'Go to Capture',     icon: '○', run: () => goTo('capture') },
    { id: 'go-domains',  label: 'Go to Domains',     icon: '◇', run: () => goTo('domains') },
    { id: 'go-money',    label: 'Go to Money',       icon: '✦', run: () => goTo('spending') },
    { id: 'go-calendar', label: 'Go to Calendar',    icon: '◎', run: () => goTo('calendar') },
    { id: 'go-council',  label: 'Go to Council',     icon: '⌂', run: () => goTo('council') },
    { id: 'add-task',    label: 'Add Task',          hint: 'Work Hub', icon: '+', run: () => { goTo('work'); window.dispatchEvent(new CustomEvent('app:open-add-task')) } },
    { id: 'add-habit',   label: 'Add Habit',         hint: 'Habits',   icon: '+', run: () => { goTo('habits'); window.dispatchEvent(new CustomEvent('app:open-add-habit')) } },
    { id: 'capture-thought', label: 'Capture a Thought', hint: 'Capture', icon: '+', run: () => { goTo('capture'); window.dispatchEvent(new CustomEvent('app:focus-capture')) } },
    { id: 'switch-theme', label: 'Switch Theme',     icon: '◐', run: () => window.dispatchEvent(new CustomEvent('app:open-theme-picker', { detail: { tab: 'theme' } })) },
    { id: 'switch-mode',  label: 'Switch Mode',      icon: '◐', run: () => window.dispatchEvent(new CustomEvent('app:open-theme-picker', { detail: { tab: 'mode' } })) },
  ]

  const matchedCommands = query.trim()
    ? commands.filter(c => c.label.toLowerCase().includes(query.trim().toLowerCase()))
    : commands.slice(0, 6)

  const totalCount = matchedCommands.length + results.length

  useEffect(() => {
    if (open) {
      setQuery(''); clear(); setIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  function handleChange(v: string) {
    setQuery(v); setIdx(0)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => search(v), 200)
  }

  function runAt(i: number) {
    if (i < matchedCommands.length) { matchedCommands[i].run(); onClose(); return }
    if (results[i - matchedCommands.length]) onClose()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown')  { e.preventDefault(); setIdx(i => Math.min(i + 1, totalCount - 1)) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Escape')     onClose()
    if (e.key === 'Enter')      runAt(idx)
  }

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 500, backdropFilter: 'blur(4px)' }}
      />
      <div style={{
        position: 'fixed', top: '18%', left: '50%', transform: 'translateX(-50%)',
        width: 'min(560px, 92vw)', zIndex: 501,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--muted)', fontSize: '1rem', opacity: 0.5 }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder={t('Search everything…', lang)}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.92rem', fontWeight: 300,
            }}
          />
          {loading && <span style={{ fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.68 }}>…</span>}
          <kbd style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.58, background: 'var(--surface2)', padding: '0.2em 0.5em', borderRadius: '4px' }}>esc</kbd>
        </div>

        {/* Commands + results */}
        {(matchedCommands.length > 0 || results.length > 0) && (
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {matchedCommands.length > 0 && (
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.58, padding: '0.6rem 1.25rem 0.3rem' }}>
                Quick actions
              </div>
            )}
            {matchedCommands.map((c, i) => (
              <CommandRow key={c.id} command={c} active={i === idx} onHover={() => setIdx(i)} onClick={() => { c.run(); onClose() }} />
            ))}
            {results.length > 0 && (
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.58, padding: '0.6rem 1.25rem 0.3rem' }}>
                Results
              </div>
            )}
            {results.map((r, i) => (
              <ResultRow key={r.id} result={r} active={matchedCommands.length + i === idx} onHover={() => setIdx(matchedCommands.length + i)} onClick={onClose} lang={lang} />
            ))}
          </div>
        )}

        {query && !loading && results.length === 0 && matchedCommands.length === 0 && (
          <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.68 }}>
            {lang === 'ko' ? `"${query}"에 대한 결과가 없습니다` : `No results for "${query}"`}
          </div>
        )}

        <div style={{ padding: '0.5rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem' }}>
          {[['↑↓', 'navigate'], ['↵', 'jump to'], ['esc', 'close']].map(([key, label]) => (
            <span key={key} style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.58 }}>
              <kbd style={{ background: 'var(--surface2)', padding: '0.15em 0.4em', borderRadius: '3px', marginRight: '0.3em' }}>{key}</kbd>{t(label, lang)}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}

function CommandRow({ command, active, onHover, onClick }: { command: Command; active: boolean; onHover: () => void; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onHover}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.7rem 1.25rem', cursor: 'pointer',
        background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <span style={{ fontSize: '0.8rem', color: 'var(--gold)', opacity: 0.7, flexShrink: 0, width: '1em', textAlign: 'center' }}>{command.icon}</span>
      <div style={{ flex: 1, minWidth: 0, fontSize: '0.82rem', color: 'var(--text)' }}>{command.label}</div>
      {command.hint && <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.68 }}>{command.hint}</span>}
    </div>
  )
}

function ResultRow({ result, active, onHover, onClick, lang }: { result: SearchResult; active: boolean; onHover: () => void; onClick: () => void; lang: import('@/lib/i18n').Lang }) {
  const color = TYPE_COLOR[result.type]
  return (
    <div
      onClick={onClick}
      onMouseEnter={onHover}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.7rem 1.25rem', cursor: 'pointer',
        background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <span style={{ fontSize: '0.8rem', color, opacity: 0.7, flexShrink: 0 }}>{TYPE_ICON[result.type]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.title}</div>
        {result.subtitle && <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.78, marginTop: '0.1rem' }}>{result.subtitle}</div>}
      </div>
      <span style={{ fontSize: '0.6rem', color, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{t(result.type, lang)}</span>
    </div>
  )
}
