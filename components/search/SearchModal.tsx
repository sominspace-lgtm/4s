'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearch, type SearchResult } from '@/lib/hooks/useSearch'
import { useLang } from '@/lib/LangContext'
import { t } from '@/lib/i18n'
import { goToSection } from '@/lib/utils/navigate'
import { DOMAINS } from '@/lib/constants/domains'

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
  keywords?: string[]
  run: () => void
}

// Score a command against a natural-language query. Every query token that
// appears in the label or a keyword adds a point; an exact phrase match is
// weighted heavily so "review health" beats a generic "Go to Life". This is
// what lets Search act as a command center: "pay rent", "what needs
// attention", "doctor" all route to the right place without exact labels.
function scoreCommand(cmd: Command, q: string): number {
  const hay = `${cmd.label} ${(cmd.keywords ?? []).join(' ')}`.toLowerCase()
  const query = q.trim().toLowerCase()
  const tokens = query.split(/\s+/).filter(tok => tok.length >= 2)
  if (tokens.length === 0) return 0
  let score = 0
  for (const tok of tokens) if (hay.includes(tok)) score += 1
  if (query.length >= 3 && hay.includes(query)) score += 3
  return score
}

function goTo(sectionId: string) {
  goToSection(sectionId)
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

  const baseCommands: Command[] = [
    { id: 'what-attention', label: 'What needs attention', hint: 'Brief', icon: '◒', keywords: ['attention', 'urgent', 'important', 'priorities', 'what matters', 'today', 'now', 'focus'], run: () => goTo('brief') },
    { id: 'go-brief',    label: 'Go to Brief',       icon: '◒', keywords: ['home', 'overview', 'start', 'today', 'morning'], run: () => goTo('brief') },
    { id: 'go-work',     label: 'Go to Tasks',       icon: '◈', keywords: ['task', 'todo', 'to do', 'work', 'due', 'deadline'], run: () => goTo('work') },
    { id: 'go-habits',   label: 'Go to Habits',      icon: '◉', keywords: ['habit', 'routine', 'streak', 'ritual', 'gym', 'exercise', 'daily'], run: () => goTo('habits') },
    { id: 'go-domains',  label: 'Go to Life',        icon: '◇', keywords: ['life', 'domain', 'area', 'balance'], run: () => goTo('domains') },
    { id: 'go-money',    label: 'Go to Money',       icon: '✦', keywords: ['money', 'rent', 'pay', 'bill', 'budget', 'subscription', 'renewal', 'spend', 'finance', 'buy', 'refill', 'wishlist', 'gift'], run: () => goTo('money') },
    { id: 'go-calendar', label: 'Go to Calendar',    icon: '◎', keywords: ['calendar', 'schedule', 'event', 'meeting', 'appointment', 'doctor', 'plan', 'time'], run: () => goTo('calendar') },
    { id: 'go-shared',   label: 'Go to Shared',      icon: '⇆', keywords: ['shared', 'share', 'friend', 'people', 'family', 'partner', 'companion', 'space'], run: () => goTo('shared') },
    { id: 'go-council',  label: 'Go to Council',     icon: '⌂', keywords: ['council', 'advice', 'advisor', 'reflect', 'decision', 'guidance'], run: () => goTo('council') },
    { id: 'add-task',    label: 'Add task',          hint: 'Tasks',  icon: '+', keywords: ['new task', 'create task', 'remind me'], run: () => { goTo('work'); window.dispatchEvent(new CustomEvent('app:open-add-task')) } },
    { id: 'add-habit',   label: 'Add habit',         hint: 'Habits', icon: '+', keywords: ['new habit', 'create habit', 'start routine'], run: () => { goTo('habits'); window.dispatchEvent(new CustomEvent('app:open-add-habit')) } },
    { id: 'capture-thought', label: 'Capture a thought', hint: 'Brief', icon: '+', keywords: ['note', 'capture', 'remember', 'idea', 'jot', 'inbox', 'quick add'], run: () => { goTo('brief'); window.dispatchEvent(new CustomEvent('app:focus-capture')) } },
    { id: 'switch-theme', label: 'Switch theme',     icon: '◐', keywords: ['theme', 'appearance', 'color', 'dark', 'light'], run: () => window.dispatchEvent(new CustomEvent('app:open-theme-picker', { detail: { tab: 'theme' } })) },
    { id: 'switch-mode',  label: 'Switch mode',      icon: '◐', keywords: ['mode', 'personality', 'tone', 'guide', 'voice'], run: () => window.dispatchEvent(new CustomEvent('app:open-theme-picker', { detail: { tab: 'mode' } })) },
  ]

  // A "Review <domain>" command per life domain, so "review health" or just
  // "health" jumps straight to Life. Hidden from the default list (only base
  // commands show when the query is empty) so they never clutter.
  const domainCommands: Command[] = DOMAINS.filter(d => !d.hidden).map(d => ({
    id: `review-${d.id}`,
    label: `Review ${d.label}`,
    hint: d.sublabel,
    icon: d.icon,
    keywords: ['review', 'check', d.label.toLowerCase(), d.sublabel.toLowerCase()],
    run: () => goTo('domains'),
  }))

  const allCommands = [...baseCommands, ...domainCommands]

  const matchedCommands = query.trim()
    ? allCommands
        .map(c => ({ c, s: scoreCommand(c, query) }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 7)
        .map(x => x.c)
    : baseCommands.slice(0, 6)

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
