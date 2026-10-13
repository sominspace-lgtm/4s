'use client'

import { useEffect, useRef, useState } from 'react'
import type { RecipeDraft } from '@/lib/recipes/types'
import { buildBookmarklet } from '@/lib/recipes/bookmarklet'
import { card, field, label, muted, small, chip } from './ui'

// Get a recipe into the book (2026-10-13): paste a link (a recipe site, a
// YouTube video, or a TikTok/Instagram post), paste text, or upload a photo
// or screenshot. It comes back as a draft to look over and save. A link to a
// recipe site is read exactly from its own markup; a social post is read by
// the AI from the caption, and some of those sites will not let a server in,
// which is why text and screenshots are right there.

type Mode = 'link' | 'text' | 'photo'

// Shrink a phone photo before sending: a screenshot is plenty at this size.
async function shrink(file: File): Promise<{ data: string; mime: string }> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  const url = c.toDataURL('image/jpeg', 0.82)
  return { data: url.split(',')[1], mime: 'image/jpeg' }
}

export default function RecipeImport({ onDraft, onWrite, onClose, prefill }: {
  onDraft: (d: RecipeDraft, via: string) => void
  onWrite: () => void
  onClose: () => void
  /** Page text sent by the bookmarklet, ready to be read. */
  prefill?: { text: string; url: string } | null
}) {
  const [mode, setMode] = useState<Mode>(prefill ? 'text' : 'link')
  const [url, setUrl] = useState('')
  const [text, setText] = useState(prefill?.text ?? '')
  const [bookmarklet, setBookmarklet] = useState(false)
  const linkRef = useRef<HTMLAnchorElement>(null)
  // A javascript: link is set on the element directly: React refuses to render one from props.
  useEffect(() => { if (bookmarklet && linkRef.current) linkRef.current.setAttribute('href', buildBookmarklet(window.location.origin)) }, [bookmarklet])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<{ message: string; code?: string } | null>(null)

  async function send(body: Record<string, unknown>) {
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/recipes/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json() as { draft?: RecipeDraft; via?: string; error?: string; code?: string }
      if (!res.ok || !j.draft) {
        setErr({ message: j.error ?? 'Could not read that.', code: j.code })
        if ((j.code === 'needs-text' || j.code === 'blocked') && mode === 'link') { setMode('text'); setBookmarklet(true) }
        return
      }
      onDraft(j.draft, j.via ?? 'page')
    } catch { setErr({ message: 'Could not reach the server. Check your connection and try again.' }) }
    finally { setBusy(false) }
  }

  async function photo(file: File | null) {
    if (!file) return
    setBusy(true); setErr(null)
    try {
      const { data, mime } = await shrink(file)
      setBusy(false)
      await send({ image: data, mime })
    } catch { setBusy(false); setErr({ message: 'Could not open that picture.' }) }
  }

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={label}>Add a recipe</div>
        <button onClick={onClose} style={{ ...small, border: 'none' }}>Close</button>
      </div>
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        <button className="press" style={chip(mode === 'link')} onClick={() => setMode('link')}>From a link</button>
        <button className="press" style={chip(mode === 'text')} onClick={() => setMode('text')}>Paste text</button>
        <button className="press" style={chip(mode === 'photo')} onClick={() => setMode('photo')}>Photo or screenshot</button>
        <button className="press" style={chip(false)} onClick={onWrite}>Write my own</button>
      </div>

      {mode === 'link' && (
        <form onSubmit={e => { e.preventDefault(); if (url.trim()) send({ url }) }} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste a recipe link, a YouTube video, a TikTok or Instagram post" style={field} autoFocus />
          <div style={muted}>Recipe sites import exactly. Social posts are read from the caption.</div>
          <div><button disabled={busy || !url.trim()} className="btn btn-primary press" style={{ fontSize: '0.74rem' }}>{busy ? 'Reading…' : 'Import'}</button></div>
        </form>
      )}

      {mode === 'text' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={8} style={{ ...field, resize: 'vertical', lineHeight: 1.5 }}
            placeholder="Paste the caption, the recipe text from an email, anything. I will pull out the ingredients and steps." autoFocus />
          <div><button disabled={busy || text.trim().length < 20} onClick={() => send({ text })} className="btn btn-primary press" style={{ fontSize: '0.74rem' }}>{busy ? 'Reading…' : 'Read this'}</button></div>
        </div>
      )}

      {mode === 'photo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={muted}>A screenshot of a post, a page from a cookbook, or a handwritten card. Take it now or pick one you already have.</div>
          <label className="btn btn-secondary press" style={{ fontSize: '0.74rem', alignSelf: 'flex-start', position: 'relative', cursor: 'pointer' }}>
            {busy ? 'Reading…' : 'Choose a picture'}
            <input type="file" accept="image/*" disabled={busy} onChange={e => photo(e.target.files?.[0] ?? null)}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
          </label>
        </div>
      )}

      {prefill?.url && <div style={muted}>From {prefill.url}</div>}

      <div>
        <button onClick={() => setBookmarklet(b => !b)} style={{ ...small, border: 'none', padding: 0 }}>{bookmarklet ? 'Hide' : 'Save from any page'}</button>
        {bookmarklet && (
          <div style={{ ...muted, marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div>Some sites block automatic reading. This button reads the page in your own browser instead, so it works on any site you can open, and sends it here.</div>
            <div>On a computer: drag this to your bookmarks bar, then click it on any recipe page.</div>
            <a ref={linkRef} onClick={e => e.preventDefault()} draggable className="btn btn-secondary press" style={{ alignSelf: 'flex-start', fontSize: '0.74rem', cursor: 'grab' }}>Save to 4S</a>
            <div>On a phone, bookmarklets are fiddly. Instead, open the page, tap and hold to select all, copy, then use Paste text. Or take a screenshot and use Photo.</div>
            <button style={{ ...small, alignSelf: 'flex-start' }} onClick={() => { try { navigator.clipboard.writeText(buildBookmarklet(window.location.origin)) } catch { /* no clipboard */ } }}>Copy the bookmark code</button>
          </div>
        )}
      </div>

      {err && (
        <div style={{ ...muted, color: err.code === 'not-configured' ? 'var(--muted)' : 'var(--rose)' }}>
          {err.message}
        </div>
      )}
    </div>
  )
}
