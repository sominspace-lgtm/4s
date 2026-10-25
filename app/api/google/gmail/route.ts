import { NextResponse } from 'next/server'
import { getConnection, googleFetch, googleReason, requireGoogleAccess } from '@/lib/google/server'
import { header, textOf, type Msg } from '@/lib/google/gmail'

// Gmail (2026-10-05). GET lists/searches (metadata only) or, with ?id=, reads
// one message body. POST sends. Read uses gmail.readonly, send uses
// gmail.send; nothing here can delete or relabel mail.
const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

function fail(e: unknown) {
  if (e instanceof Error && e.message === 'not-connected') return NextResponse.json({ error: 'not-connected' }, { status: 409 })
  return NextResponse.json({ error: 'Google request failed' }, { status: 502 })
}
export async function GET(request: Request) {
  const who = await requireGoogleAccess(new URL(request.url).searchParams.get('account'))
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const gid = who.owner
  const sp = new URL(request.url).searchParams
  const id = sp.get('id')
  try {
    // How many unread in the inbox (2026-10-25), for the village mailbox flag.
    if (sp.get('unread')) {
      const r = await googleFetch(gid, `${BASE}/labels/INBOX`)
      if (!r.ok) return NextResponse.json({ unread: 0 })
      const j = await r.json() as { messagesUnread?: number }
      return NextResponse.json({ unread: j.messagesUnread ?? 0 })
    }

    // Needs a reply (2026-10-25): conversations from real people where the
    // last word is not yours. Newsletters, receipts and no-reply senders are
    // left out, so this is the short list of emails waiting on you.
    if (sp.get('needsReply')) {
      const me = ((await getConnection(gid))?.email ?? '').toLowerCase()
      const robot = /no-?reply|donotreply|do-not-reply|newsletter|notifications?@|mailer|news@|info@|support@|billing@|updates?@|marketing/i
      const tl = await googleFetch(gid, `${BASE}/threads?${new URLSearchParams({ maxResults: '25', q: 'in:inbox category:primary -from:me newer_than:30d' })}`)
      if (!tl.ok) return NextResponse.json({ error: await googleReason(tl, 'Gmail API') }, { status: 502 })
      const threads = ((await tl.json()) as { threads?: { id: string }[] }).threads ?? []
      const out = await Promise.all(threads.map(async ({ id: tid }) => {
        const r = await googleFetch(gid, `${BASE}/threads/${tid}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`)
        if (!r.ok) return null
        const t = await r.json() as { messages?: Msg[] }
        const last = t.messages?.[t.messages.length - 1]
        if (!last) return null
        const from = header(last, 'from')
        if ((me && from.toLowerCase().includes(me)) || robot.test(from)) return null
        return {
          id: last.id, from, subject: header(last, 'subject') || '(no subject)', date: header(last, 'date'),
          snippet: last.snippet ?? '', unread: (last.labelIds ?? []).includes('UNREAD'),
        }
      }))
      return NextResponse.json({ messages: out.filter(Boolean) })
    }

    if (id) {
      if (!/^[a-zA-Z0-9]{5,64}$/.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })
      const res = await googleFetch(gid, `${BASE}/messages/${id}?format=full`)
      if (!res.ok) return NextResponse.json({ error: await googleReason(res, 'Gmail API') }, { status: 502 })
      const m = await res.json() as Msg
      return NextResponse.json({
        id: m.id, from: header(m, 'from'), to: header(m, 'to'), subject: header(m, 'subject'), date: header(m, 'date'),
        body: textOf(m.payload).slice(0, 20_000),
      })
    }
    const q = (sp.get('q') ?? '').slice(0, 200)
    const max = Math.min(25, Math.max(1, Number(sp.get('max')) || 15))
    const list = await googleFetch(gid, `${BASE}/messages?${new URLSearchParams({ maxResults: String(max), ...(q ? { q } : { labelIds: 'INBOX' }) })}`)
    if (!list.ok) return NextResponse.json({ error: await googleReason(list, 'Gmail API') }, { status: 502 })
    const ids = ((await list.json()) as { messages?: { id: string }[] }).messages ?? []
    const messages = await Promise.all(ids.map(async ({ id: mid }) => {
      const r = await googleFetch(gid, `${BASE}/messages/${mid}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`)
      if (!r.ok) return null
      const m = await r.json() as Msg
      return {
        id: m.id, from: header(m, 'from'), subject: header(m, 'subject') || '(no subject)', date: header(m, 'date'),
        snippet: m.snippet ?? '', unread: (m.labelIds ?? []).includes('UNREAD'),
      }
    }))
    return NextResponse.json({ messages: messages.filter(Boolean) })
  } catch (e) { return fail(e) }
}

export async function POST(request: Request) {
  const who = await requireGoogleAccess(new URL(request.url).searchParams.get('account'))
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const gid = who.owner
  const b = await request.json().catch(() => ({})) as { to?: string; subject?: string; body?: string }
  const to = (b.to ?? '').trim()
  const subject = (b.subject ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 200)
  const text = (b.body ?? '').slice(0, 20_000)
  // One plain address; no header injection, no bulk send.
  if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(to)) return NextResponse.json({ error: 'Enter one valid email address.' }, { status: 400 })
  if (!text.trim()) return NextResponse.json({ error: 'Write something first.' }, { status: 400 })
  const raw = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject || '(no subject)').toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    text,
  ].join('\r\n')
  try {
    const res = await googleFetch(gid, `${BASE}/messages/send`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ raw: Buffer.from(raw).toString('base64url') }),
    })
    if (!res.ok) return NextResponse.json({ error: 'Google rejected the message' }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (e) { return fail(e) }
}
