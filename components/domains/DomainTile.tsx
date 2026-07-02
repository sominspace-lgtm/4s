'use client'

import { useState, useRef } from 'react'
import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns'
import type { Domain } from '@/lib/constants/domains'
import { useDomainCaptures } from '@/lib/hooks/useDomainCaptures'

interface DomainTileProps {
  domain: Domain & { shared?: boolean }
  lastTouched: string | null
  onOpen: () => void
  onToggleShare?: () => void
}

export default function DomainTile({ domain, lastTouched, onOpen, onToggleShare }: DomainTileProps) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { items, add, remove } = useDomainCaptures(domain.id)

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) {
      onOpen()
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }

  async function handleAdd(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' || !draft.trim()) return
    await add(draft)
    setDraft('')
  }

  const touchedLabel = lastTouched
    ? `reviewed ${formatDistanceToNow(parseISO(lastTouched))} ago`
    : 'not reviewed yet'

  // A domain that was never opened isn't a problem — it's just new. Alarm
  // colors are reserved for domains with real history that have gone stale.
  const daysSince = lastTouched ? differenceInDays(new Date(), parseISO(lastTouched)) : null
  const isNew = daysSince === null
  const reviewDue = !isNew && daysSince > 7
  const statusLabel = isNew ? 'not reviewed yet' : reviewDue ? 'review due' : 'steady'
  const statusColor = isNew ? 'var(--muted)' : reviewDue ? 'var(--amber)' : 'var(--emerald)'

  const glowStyle = (open || hovered) ? {
    borderColor: `color-mix(in srgb, ${domain.color} 40%, transparent)`,
    boxShadow: `0 0 24px color-mix(in srgb, ${domain.color} 14%, transparent), inset 0 0 0 1px color-mix(in srgb, ${domain.color} 10%, transparent)`,
    background: 'var(--surface2)',
  } : {}

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)', borderRadius: '14px',
        padding: '1.4rem 1.5rem 1.2rem', position: 'relative',
        transition: 'border-color 0.25s, box-shadow 0.25s, background 0.2s, transform 0.2s', userSelect: 'none',
        transform: (open || hovered) ? 'translateY(-2px)' : 'none',
        ...glowStyle,
      }}
    >
      {/* Radial glow overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '14px', pointerEvents: 'none',
        background: `radial-gradient(ellipse at top left, color-mix(in srgb, ${domain.color} 8%, transparent), transparent 70%)`,
        opacity: open || hovered ? 1 : 0, transition: 'opacity 0.3s',
      }} />

      {/* Header — clickable to toggle */}
      <div onClick={toggle} style={{ cursor: 'pointer' }}>
        <span style={{ fontSize: '1.2rem', lineHeight: 1, marginBottom: '0.6rem', display: 'block' }}>{domain.icon}</span>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 400, letterSpacing: '0.01em', color: 'var(--text)', lineHeight: 1.2 }}>{domain.label}</div>
            <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.1rem' }}>{domain.sublabel}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            {onToggleShare && (
              <button
                onClick={e => { e.stopPropagation(); onToggleShare() }}
                title={domain.shared ? 'Shared with companions' : 'Share with companions'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: '0.65rem', color: domain.shared ? 'var(--gold)' : 'var(--muted)',
                  opacity: domain.shared ? 0.85 : hovered ? 0.35 : 0, transition: 'opacity 0.15s',
                }}
              >⇆</button>
            )}
            <span style={{ color: 'var(--muted)', fontSize: '0.7rem', marginTop: '0.15rem', transition: 'transform 0.3s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.5, letterSpacing: '0.03em' }}>
            {touchedLabel} · {items.length} note{items.length !== 1 ? 's' : ''}
          </span>
          <span style={{
            fontSize: '0.56rem', letterSpacing: '0.05em', textTransform: 'uppercase',
            color: statusColor, opacity: 0.85, padding: '0.1em 0.5em', borderRadius: '99px',
            background: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${statusColor} 25%, transparent)`,
          }}>{statusLabel}</span>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          {/* Add input */}
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleAdd}
            placeholder="Add a note, idea, or task… (Enter)"
            style={{
              width: '100%', background: 'var(--bg)', borderWidth: '1px', borderStyle: 'solid',
              borderColor: `color-mix(in srgb, ${domain.color} 30%, var(--border))`,
              borderRadius: '8px', color: 'var(--text)', fontFamily: 'var(--font-body)',
              fontSize: '0.78rem', fontWeight: 300, padding: '0.45rem 0.7rem',
              outline: 'none', marginBottom: '0.75rem',
            }}
          />

          {/* Items */}
          {items.length === 0 && (
            <div style={{ fontSize: '0.73rem', color: 'var(--muted)', opacity: 0.5, fontStyle: 'italic' }}>
              Nothing here yet — type above to add.
            </div>
          )}
          {items.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
              padding: '0.35rem 0', borderBottom: '1px solid var(--faint)',
            }}>
              <span style={{
                fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '0.1rem',
                color: domain.color,
                background: `color-mix(in srgb, ${domain.color} 10%, transparent)`,
                padding: '0.15em 0.5em', borderRadius: '4px',
              }}>note</span>
              <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.5, fontWeight: 300 }}>{item.text}</span>
              <button
                onClick={() => remove(item.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.7rem', opacity: 0.4, padding: '0', flexShrink: 0, marginTop: '0.1rem' }}
                aria-label="Remove"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
