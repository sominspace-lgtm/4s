import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseQuick } from '@/lib/quick/parse'

// Quick add from an iPhone Shortcut (2026-10-19): "add oat milk" from the
// lock screen. The Shortcut sends the spoken text with the person's own key
// (Authorization: Bearer ...). Only the key's hash is stored, it can only
// add (never read or change anything), and it is limited per hour. The reply
// is one plain sentence for the Shortcut to show or say.

const recent = new Map<string, number[]>()
function limited(id: string): boolean {
  const now = Date.now()
  const hits = (recent.get(id) ?? []).filter(t => now - t < 3_600_000)
  hits.push(now)
  recent.set(id, hits)
  return hits.length > 60
}

const say = (message: string, status = 200) => NextResponse.json({ message }, { status })

export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const key = auth.replace(/^Bearer\s+/i, '').trim()
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(key)) return say('This Shortcut needs your 4S key. Make one in 4S under Connect.', 401)
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  const admin = createAdminClient()
  const { data: row } = await admin.from('quick_keys').select('user_id').eq('key_hash', hash).maybeSingle()
  if (!row) return say('That 4S key does not work any more. Make a new one in 4S under Connect.', 401)
  const userId = row.user_id as string
  if (limited(userId)) return say('That is a lot for one hour. Try again later.', 429)

  const ctype = request.headers.get('content-type') ?? ''
  const text = ctype.includes('json')
    ? String(((await request.json().catch(() => ({}))) as { text?: unknown }).text ?? '')
    : await request.text()
  const q = parseQuick(text.slice(0, 500))
  if (!q) return say('I did not catch anything to add.', 400)

  void admin.from('quick_keys').update({ last_used: new Date().toISOString() }).eq('user_id', userId)

  if (q.kind === 'task') {
    const { error } = await admin.from('work_items').insert({ user_id: userId, title: q.title, status: 'todo' })
    return error ? say('4S could not save that. Try again.', 500) : say(`Added the task: ${q.title}.`)
  }
  if (q.kind === 'note') {
    const { error } = await admin.from('notes').insert({ user_id: userId, space_id: null, title: '', body: q.text })
    return error ? say('4S could not save that. Try again.', 500) : say('Saved the note.')
  }
  // Shopping goes on the household list (the first shared space you are in).
  const { data: m } = await admin.from('shared_space_members').select('space_id').eq('member_id', userId).eq('status', 'accepted').order('created_at').limit(1).maybeSingle()
  const spaceId = (m?.space_id as string | undefined) ?? null
  const { error } = await admin.from('household_shopping').insert(q.items.map(name => ({ user_id: userId, space_id: spaceId, name, qty: null, category: null })))
  if (error) return say('4S could not save that. Try again.', 500)
  const list = q.items.length === 1 ? q.items[0] : `${q.items.slice(0, -1).join(', ')} and ${q.items[q.items.length - 1]}`
  return say(`Added ${list} to the shopping list.`)
}
