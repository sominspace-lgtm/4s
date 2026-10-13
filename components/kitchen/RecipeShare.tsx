'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { card, muted, small } from './ui'

// Send one recipe to anyone by link (2026-10-13). The link shows the recipe
// and nothing else of yours; stopping it makes the link stop working.

const newToken = () => {
  const b = new Uint8Array(18)
  crypto.getRandomValues(b)
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export default function RecipeShare({ recipeId, title }: { recipeId: string; title: string }) {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    supabase.from('recipe_shares').select('token').eq('recipe_id', recipeId).limit(1).maybeSingle()
      .then(({ data }) => { if (live) { setToken((data?.token as string | undefined) ?? null); setReady(true) } })
    return () => { live = false }
  }, [supabase, recipeId])

  const url = token ? `${window.location.origin}/r/${token}` : null

  async function create() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const t = newToken()
    const { error } = await supabase.from('recipe_shares').insert({ token: t, recipe_id: recipeId, user_id: user.id })
    if (error) setNote('Sharing by link is not set up on the server yet.'); else setToken(t)
  }
  async function stop() {
    if (!token) return
    const { error } = await supabase.from('recipe_shares').delete().eq('token', token)
    if (error) setNote(error.message); else { setToken(null); setNote('The link no longer works.') }
  }
  async function copy() {
    if (!url) return
    try { await navigator.clipboard.writeText(url); setNote('Link copied.') } catch { setNote(url) }
  }

  if (!ready) return null
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {!url ? (
        <>
          <div style={muted}>Make a link anyone can open to read this recipe. They do not need an account.</div>
          <div><button className="btn btn-primary press" style={{ fontSize: '0.8rem', minHeight: 44 }} onClick={create}>Make a link</button></div>
        </>
      ) : (
        <>
          <div style={{ ...muted, wordBreak: 'break-all', color: 'var(--text)' }}>{url}</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button className="btn btn-primary press" style={{ fontSize: '0.8rem', minHeight: 44 }} onClick={() => navigator.share({ title, url }).catch(() => {})}>Send</button>
            )}
            <button className="btn btn-secondary press" style={{ fontSize: '0.8rem', minHeight: 44 }} onClick={copy}>Copy link</button>
            <button style={{ ...small, color: 'var(--rose)', minHeight: 44 }} onClick={stop}>Stop sharing</button>
          </div>
        </>
      )}
      {note && <div style={muted}>{note}</div>}
    </div>
  )
}
