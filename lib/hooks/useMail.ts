'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MailMessage {
  id: string
  space_id: string
  from_user_id: string
  body: string
  read_by: string[]
  created_at: string
}

// The household mailbox (2026-09-22) — see supabase/migrations/mail.sql for
// why this is async mail, not chat. Sending goes through /api/mail/send
// (not a direct insert) because delivering the push needs the admin client;
// see that route's own comment. Marking read IS a direct client update —
// RLS's mail_mark_read policy allows it, and there's no push/side-effect
// tied to it that would need the server.
export function useMail(spaceId: string | null) {
  const supabase = createClient()
  const [messages, setMessages] = useState<MailMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!spaceId) { setMessages([]); setLoading(false); return }
    setLoading(true)
    const [{ data: { user } }, { data }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('mail_messages').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }).limit(100),
    ])
    setUserId(user?.id ?? null)
    setMessages((data as MailMessage[] | null) ?? [])
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onChanged() { load() }
    window.addEventListener('4s:mail-changed', onChanged)
    return () => window.removeEventListener('4s:mail-changed', onChanged)
  }, [load])

  function notify() { window.dispatchEvent(new CustomEvent('4s:mail-changed')) }

  async function send(body: string): Promise<string | null> {
    if (!spaceId) return 'No shared household to mail.'
    const res = await fetch('/api/mail/send', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ spaceId, body }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return json.error ?? `Request failed (${res.status})`
    await load(); notify()
    return null
  }

  async function markRead(message: MailMessage) {
    if (!userId || message.read_by.includes(userId)) return
    const read_by = [...message.read_by, userId]
    const { error } = await supabase.from('mail_messages').update({ read_by }).eq('id', message.id)
    if (!error) {
      setMessages(prev => prev.map(m => (m.id === message.id ? { ...m, read_by } : m)))
      notify()
    }
  }

  const unread = userId ? messages.filter(m => m.from_user_id !== userId && !m.read_by.includes(userId)) : []

  return { messages, unread, loading, userId, send, markRead }
}
