'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface WorkItem { id: string; title: string; project: string | null; status: string; due_date: string | null }
interface Habit    { id: string; name: string; category: string | null }
interface WishItem { id: string; name: string; price: number | null; category: string | null }
interface Capture  { id: string; text: string; domain: string | null; created_at: string }
interface Sub      { id: string; name: string; amount: number; billing_cycle: string }

interface Props {
  ownerId: string
  ownerEmail: string
  sections: string[]
  viewerId: string
}

const STATUS_COLOR: Record<string, string> = {
  todo: 'var(--muted)', 'in-progress': 'var(--gold)', done: 'var(--emerald)', blocked: 'var(--rose)',
}

export default function CompanionViewClient({ ownerId, ownerEmail, sections, viewerId }: Props) {
  const supabase = createClient()
  const [work,     setWork]     = useState<WorkItem[]>([])
  const [habits,   setHabits]   = useState<Habit[]>([])
  const [wishlist, setWishlist] = useState<WishItem[]>([])
  const [captures, setCaptures] = useState<Capture[]>([])
  const [subs,     setSubs]     = useState<Sub[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      const loads: Promise<unknown>[] = []

      if (sections.includes('work')) {
        loads.push(
          supabase.from('work_items').select('id, title, project, status, due_date')
            .eq('user_id', ownerId).eq('shared', true).neq('status', 'done')
            .then(({ data }) => setWork(data ?? []))
        )
      }
      if (sections.includes('habits')) {
        loads.push(
          supabase.from('habits').select('id, name, category')
            .eq('user_id', ownerId).eq('shared', true)
            .then(({ data }) => setHabits(data ?? []))
        )
      }
      if (sections.includes('wishlist')) {
        loads.push(
          supabase.from('wishlist_items').select('id, name, price, category')
            .eq('user_id', ownerId)
            .then(({ data }) => setWishlist(data ?? []))
        )
      }
      if (sections.includes('domains') || sections.includes('capture')) {
        loads.push(
          supabase.from('captures').select('id, text, domain, created_at')
            .eq('user_id', ownerId).order('created_at', { ascending: false }).limit(50)
            .then(({ data }) => setCaptures(data ?? []))
        )
      }
      if (sections.includes('spending')) {
        loads.push(
          supabase.from('subscriptions').select('id, name, amount, billing_cycle')
            .eq('user_id', ownerId)
            .then(({ data }) => setSubs(data ?? []))
        )
      }

      await Promise.all(loads)
      setLoading(false)
    }
    load()
  }, [ownerId, sections])

  const displayName = ownerEmail.split('@')[0]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* Back */}
        <Link href="/dashboard" style={{ fontSize: '0.7rem', color: 'var(--muted)', textDecoration: 'none', opacity: 0.6, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1.5rem' }}>
          ← back to dashboard
        </Link>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text)', fontWeight: 400 }}>
            {displayName}&apos;s shared space
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.5, marginTop: '0.3rem' }}>
            {ownerEmail} · read-only
          </div>
        </div>

        {loading ? (
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.5 }}>Loading…</div>
        ) : sections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', fontSize: '0.8rem', color: 'var(--muted)', opacity: 0.5 }}>
            {displayName} hasn&apos;t shared anything with you yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Work */}
            {sections.includes('work') && work.length > 0 && (
              <Section title="Work" icon="◈">
                {work.map(w => (
                  <div key={w.id} style={{ padding: '0.6rem 0.75rem', borderRadius: '9px', background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[w.status] ?? 'var(--muted)', flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text)' }}>{w.title}</div>
                    {w.project && <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.5 }}>{w.project}</span>}
                  </div>
                ))}
              </Section>
            )}

            {/* Habits */}
            {sections.includes('habits') && habits.length > 0 && (
              <Section title="Habits" icon="◉">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {habits.map(h => (
                    <span key={h.id} style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: '99px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                      {h.name}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Inbox captures */}
            {sections.includes('capture') && captures.filter(c => !c.domain).length > 0 && (
              <Section title="Captures / Inbox" icon="○">
                {captures.filter(c => !c.domain).slice(0, 15).map(c => (
                  <div key={c.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--faint)', fontSize: '0.78rem', color: 'var(--text)' }}>
                    {c.text}
                  </div>
                ))}
              </Section>
            )}

            {/* Domain notes */}
            {sections.includes('domains') && captures.filter(c => c.domain).length > 0 && (
              <Section title="Domain notes" icon="○">
                {captures.filter(c => c.domain).slice(0, 15).map(c => (
                  <div key={c.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--faint)', fontSize: '0.78rem', color: 'var(--text)', display: 'flex', gap: '0.6rem' }}>
                    {c.domain && <span style={{ fontSize: '0.6rem', color: 'var(--gold)', opacity: 0.7, flexShrink: 0, marginTop: '0.1rem' }}>{c.domain}</span>}
                    <span>{c.text}</span>
                  </div>
                ))}
              </Section>
            )}

            {/* Wishlist */}
            {sections.includes('wishlist') && wishlist.length > 0 && (
              <Section title="Wishlist" icon="✦">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {wishlist.map(w => (
                    <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--faint)' }}>
                      <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text)' }}>{w.name}</span>
                      {w.price != null && <span style={{ fontSize: '0.7rem', color: 'var(--gold)' }}>${w.price}</span>}
                      {w.category && <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.5 }}>{w.category}</span>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Subscriptions */}
            {sections.includes('spending') && subs.length > 0 && (
              <Section title="Subscriptions" icon="◇">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {subs.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--faint)' }}>
                      <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text)' }}>{s.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>${s.amount}/{s.billing_cycle}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ color: 'var(--gold)', fontSize: '0.75rem' }}>{icon}</span>
        <span style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>{children}</div>
    </div>
  )
}
