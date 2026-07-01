'use client'

import { useRef, useState } from 'react'
import { useCaptures } from '@/lib/hooks/useCaptures'

export default function CaptureBar() {
  const [text, setText] = useState('')
  const { add } = useCaptures()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleKey(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' || !text.trim()) return
    await add(text.trim())
    setText('')
  }

  return (
    <div style={{
      display: 'flex', gap: '0.6rem', alignItems: 'center',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '0.7rem 1rem', marginBottom: '0.4rem',
    }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--muted)', flexShrink: 0, userSelect: 'none' }}>◌</span>
      <input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Dump a thought — assign it later"
        aria-label="Quick capture"
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 300,
        }}
      />
      <span style={{ fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.6, flexShrink: 0 }}>↵ enter</span>
    </div>
  )
}
