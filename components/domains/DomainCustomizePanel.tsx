'use client'

import { useEffect, useRef, useState } from 'react'
import type { Domain } from '@/lib/constants/domains'

const PRESET_ICONS = ['◈', '◇', '◉', '○', '♡', '✦', '⌂', '◎', '✧', '◐', '△', '✿', '◆', '⬡', '⊕', '⊗']
const COLOR_OPTIONS = [
  { label: 'Gold',     value: 'var(--gold)' },
  { label: 'Purple',   value: 'var(--purple)' },
  { label: 'Emerald',  value: 'var(--emerald)' },
  { label: 'Rose',     value: 'var(--rose)' },
  { label: 'Blush',    value: 'var(--blush)' },
  { label: 'Amber',    value: 'var(--amber)' },
  { label: 'Slate',    value: 'var(--slate)' },
  { label: 'Lavender', value: 'var(--lavender)' },
]

interface Props {
  open: boolean
  domains: (Domain & { hidden?: boolean })[]
  onClose: () => void
  onMove: (id: string, dir: -1 | 1) => void
  onToggle: (id: string) => void
  onAdd: (d: Domain) => void
  onRemove: (id: string) => void
  onReset: () => void
}

const DEFAULT_IDS = new Set(['biz-active', 'biz-future', 'money', 'health', 'relationship', 'creative', 'home', 'self'])

export default function DomainCustomizePanel({ open, domains, onClose, onMove, onToggle, onAdd, onRemove, onReset }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [label, setLabel] = useState('')
  const [sublabel, setSublabel] = useState('')
  const [icon, setIcon] = useState('✦')
  const [color, setColor] = useState('var(--gold)')

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  function handleAdd() {
    if (!label.trim()) return
    const id = `custom-${Date.now()}`
    onAdd({ id, label: label.trim(), sublabel: sublabel.trim() || label.trim(), icon, color })
    setLabel(''); setSublabel(''); setIcon('✦'); setColor('var(--gold)')
    setShowAdd(false)
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
    padding: '0.4rem 0.65rem', outline: 'none', width: '100%',
  }

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 299, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.2s',
      }} />
      <div ref={ref} style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '288px',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 300, padding: '1.5rem',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Domains</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>

        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.6, lineHeight: 1.6, marginBottom: '0.25rem' }}>
          Reorder, hide, or add your own life areas.
        </div>

        {/* Domain rows */}
        {domains.map((d, i) => (
          <div key={d.id} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.55rem 0.7rem', borderRadius: '8px',
            background: d.hidden ? 'transparent' : 'var(--hover-bg)',
            border: '1px solid var(--border)',
            opacity: d.hidden ? 0.4 : 1, transition: 'opacity 0.15s',
          }}>
            {/* Reorder */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <button onClick={() => onMove(d.id, -1)} disabled={i === 0} style={{
                background: 'none', border: 'none', color: 'var(--muted)', cursor: i === 0 ? 'default' : 'pointer',
                fontSize: '0.5rem', lineHeight: 1, padding: '1px', opacity: i === 0 ? 0.2 : 0.6,
              }}>▲</button>
              <button onClick={() => onMove(d.id, 1)} disabled={i === domains.length - 1} style={{
                background: 'none', border: 'none', color: 'var(--muted)', cursor: i === domains.length - 1 ? 'default' : 'pointer',
                fontSize: '0.5rem', lineHeight: 1, padding: '1px', opacity: i === domains.length - 1 ? 0.2 : 0.6,
              }}>▼</button>
            </div>

            {/* Icon */}
            <span style={{ fontSize: '0.85rem', color: d.color, flexShrink: 0, width: '1.1rem', textAlign: 'center' }}>{d.icon}</span>

            {/* Label */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</div>
              {d.sublabel && d.sublabel !== d.label && (
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.sublabel}</div>
              )}
            </div>

            {/* Eye toggle */}
            <button onClick={() => onToggle(d.id)} title={d.hidden ? 'Show domain' : 'Hide domain'} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem',
              color: 'var(--muted)', opacity: d.hidden ? 0.3 : 0.7, padding: '2px', lineHeight: 1,
            }}>{d.hidden ? '🙈' : '👁'}</button>

            {/* Remove (custom only) */}
            {!DEFAULT_IDS.has(d.id) && (
              <button onClick={() => onRemove(d.id)} title="Remove domain" style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.62rem',
                color: 'var(--rose)', opacity: 0.5, padding: '2px',
              }}>✕</button>
            )}
          </div>
        ))}

        {/* Add custom domain */}
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} style={{
            padding: '0.45rem', borderRadius: '8px', border: '1px dashed var(--border)',
            background: 'transparent', color: 'var(--muted)', fontFamily: 'var(--font-body)',
            fontSize: '0.7rem', cursor: 'pointer', opacity: 0.6, marginTop: '0.2rem',
          }}>+ add domain</button>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.2rem' }}>
            <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.6, marginBottom: '0.1rem' }}>New domain</div>

            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Name (e.g. Travel)" style={inputStyle} />
            <input value={sublabel} onChange={e => setSublabel(e.target.value)} placeholder="Sublabel (optional)" style={inputStyle} />

            {/* Icon picker */}
            <div>
              <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.6, marginBottom: '0.3rem' }}>Icon</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {PRESET_ICONS.map(ic => (
                  <button key={ic} onClick={() => setIcon(ic)} style={{
                    width: 28, height: 28, borderRadius: '6px', border: `1px solid ${ic === icon ? 'var(--gold)' : 'var(--border)'}`,
                    background: ic === icon ? 'var(--hover-bg)' : 'transparent',
                    cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text)',
                  }}>{ic}</button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.6, marginBottom: '0.3rem' }}>Color</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {COLOR_OPTIONS.map(c => (
                  <button key={c.value} onClick={() => setColor(c.value)} title={c.label} style={{
                    width: 22, height: 22, borderRadius: '50%', border: `2px solid ${c.value === color ? 'var(--text)' : 'transparent'}`,
                    background: c.value, cursor: 'pointer', outline: 'none', padding: 0,
                    boxShadow: c.value === color ? `0 0 0 1px var(--surface2)` : 'none',
                  }} />
                ))}
              </div>
            </div>

            {/* Preview */}
            {label && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', background: 'var(--hover-bg)', borderRadius: '7px', marginTop: '0.1rem' }}>
                <span style={{ color, fontSize: '0.9rem' }}>{icon}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text)' }}>{label}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
              <button onClick={() => { setShowAdd(false); setLabel(''); setSublabel('') }} style={{
                flex: 1, padding: '0.38em', borderRadius: '7px', border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: '0.7rem', cursor: 'pointer',
              }}>cancel</button>
              <button onClick={handleAdd} disabled={!label.trim()} style={{
                flex: 2, padding: '0.38em', borderRadius: '7px', border: '1px solid var(--border)',
                background: 'var(--hover-bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.7rem',
                cursor: label.trim() ? 'pointer' : 'default', opacity: label.trim() ? 1 : 0.4,
              }}>add domain</button>
            </div>
          </div>
        )}

        <button onClick={onReset} style={{
          marginTop: 'auto', padding: '0.45rem', borderRadius: '8px', cursor: 'pointer',
          border: '1px solid var(--border)', background: 'transparent',
          color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: '0.65rem',
          letterSpacing: '0.05em',
        }}>Reset to default</button>
      </div>
    </>
  )
}
