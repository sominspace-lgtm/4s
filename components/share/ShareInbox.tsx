'use client'

import { useEffect, useState } from 'react'
import { useWishlist } from '@/lib/hooks/useWishlist'
import { useNotes } from '@/lib/hooks/useNotes'
import { useWorkItems } from '@/lib/hooks/useWorkItems'
import { goToSection } from '@/lib/utils/navigate'
import { RECIPE_URL_KEY, decodeShared, SHARE_PARAM, type SharedItem } from '@/lib/share/parse'

// "Share to 4S" lands here (2026-10-13): whatever came from the phone's share
// sheet, and one question: what is this? One tap files it where it belongs.

const btn = { minHeight: 48, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left' as const, padding: '0 1rem' }

export default function ShareInbox() {
  const [item, setItem] = useState<SharedItem | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const wishes = useWishlist()
  const notes = useNotes(null)
  const work = useWorkItems()

  useEffect(() => {
    const url = new URL(window.location.href)
    const p = url.searchParams.get(SHARE_PARAM)
    if (!p) return
    url.searchParams.delete(SHARE_PARAM)
    window.history.replaceState({}, '', url.toString())
    const s = decodeShared(p)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the address on arrival
    if (s) setItem(s)
  }, [])

  if (!item) return null
  const label = item.title || item.text || item.url || ''
  const close = () => { setItem(null); setMsg(null) }

  function recipe() {
    try { sessionStorage.setItem(RECIPE_URL_KEY, JSON.stringify({ url: item!.url, text: [item!.title, item!.text].filter(Boolean).join('\n') })) } catch { /* private mode */ }
    close()
    setTimeout(() => goToSection('kitchen'), 60)
  }
  async function wish() {
    let name = item!.title, image: string | null = null, price: number | null = null
    if (item!.url) {
      try {
        const r = await fetch(`/api/link-preview?url=${encodeURIComponent(item!.url)}`)
        if (r.ok) { const j = await r.json() as { title?: string | null; image?: string | null; price?: number | null }; name = j.title || name; image = j.image ?? null; price = j.price ?? null }
      } catch { /* the link alone is still worth saving */ }
    }
    const e = await wishes.add({ name: name || item!.url || 'Saved item', url: item!.url, image_url: image, price, list: 'Someday' })
    if (e) setMsg(e); else { close(); goToSection('wishlist') }
  }
  async function note() {
    const id = await notes.add({ title: item!.title, body: [item!.text, item!.url].filter(Boolean).join('\n\n') })
    if (!id) setMsg('Could not save the note.'); else { close(); goToSection('notes') }
  }
  async function task() {
    const e = await work.add({ title: (label || 'Shared item').slice(0, 200), notes: item!.url ? [item!.url, item!.text].filter(Boolean).join('\n') : item!.text || null, due_date: null, energy: null, domain: null, recur_days: null })
    if (e) setMsg(e); else { close(); goToSection('tasks') }
  }

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', borderRadius: '18px 18px 0 0', padding: '1.2rem 1rem calc(1.2rem + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>What is this?</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }}>{label}</div>
        <button style={btn} onClick={recipe}>A recipe</button>
        <button style={btn} onClick={wish}>Something I want (wishlist)</button>
        <button style={btn} onClick={note}>A note</button>
        <button style={btn} onClick={task}>A task</button>
        {msg && <div style={{ fontSize: '0.8rem', color: 'var(--rose)' }}>{msg}</div>}
        <button onClick={close} style={{ ...btn, background: 'transparent', border: 'none', color: 'var(--muted)', textAlign: 'center' }}>Cancel</button>
      </div>
    </div>
  )
}
