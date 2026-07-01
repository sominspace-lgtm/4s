'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'

interface ArchivedItem {
  id: string
  title: string
  project: string | null
  status: string
  completed_at: string | null
  created_at: string
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function ArchivePanel({ open, onClose }: Props) {
  const supabase = createClient()
  const ref = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<ArchivedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'done' | 'cancelled'>('all')

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    supabase
      .from('work_items')
      .select('id, title, project, status, completed_at, created_at')
      .in('status', ['done', 'cancelled'])
      .order('completed_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { setItems(data ?? []); setLoading(false) })
  }, [open])

  const visible = items.filter(i => filter === 'all' ? true : i.status === filter)

  const grouped: Record<string, ArchivedItem[]> = {}
  for (const item of visible) {
    const key = item.completed_at
      ? format(parseISO(item.completed_at), 'MMMM yyyy')
      : format(parseISO(item.created_at), 'MMMM yyyy')
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  }

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 299,
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.2s',
      }} />
      <div ref={ref} style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '340px',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 300, padding: '1.5rem',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Archive</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.5, marginTop: '0.15rem' }}>Completed & cancelled work</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(['all', 'done', 'cancelled'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '0.25rem 0.7rem', borderRadius: '8px', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.65rem',
              border: `1px solid ${filter === f ? 'var(--gold)' : 'var(--border)'}`,
              background: filter === f ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'transparent',
              color: filter === f ? 'var(--gold)' : 'var(--muted)',
            }}>{f}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.5 }}>Loading…</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.4 }}>
            Nothing archived yet.<br />Complete tasks to see them here.
          </div>
        ) : (
          Object.entries(grouped).map(([month, monthItems]) => (
            <div key={month} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.45 }}>{month}</div>
              {monthItems.map(item => (
                <div key={item.id} style={{
                  padding: '0.6rem 0.75rem', borderRadius: '9px',
                  background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: item.status === 'done' ? 'var(--text)' : 'var(--muted)', lineHeight: 1.4, textDecoration: item.status === 'cancelled' ? 'line-through' : 'none' }}>
                      {item.title}
                    </div>
                    <span style={{
                      fontSize: '0.56rem', padding: '0.15em 0.5em', borderRadius: '99px',
                      background: item.status === 'done'
                        ? 'color-mix(in srgb, var(--emerald) 15%, transparent)'
                        : 'color-mix(in srgb, var(--muted) 10%, transparent)',
                      color: item.status === 'done' ? 'var(--emerald)' : 'var(--muted)',
                      flexShrink: 0,
                    }}>
                      {item.status === 'done' ? '✓' : '×'}
                    </span>
                  </div>
                  {item.project && <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.5, marginTop: '0.2rem' }}>{item.project}</div>}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </>
  )
}
