import { gfetch, GoogleError } from './calendar'

// Gmail for Jarvis and the Mail panel (2026-10-18). Search and read use
// gmail.readonly; a reply is only ever saved as a draft (gmail.compose), never
// sent from here. Nothing in this file can delete, archive or relabel mail.

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

export interface Part { mimeType?: string; body?: { data?: string }; parts?: Part[] }
export interface Msg { id: string; threadId: string; snippet?: string; internalDate?: string; labelIds?: string[]; payload?: Part & { headers?: { name: string; value: string }[] } }

export const header = (m: Msg, name: string) => m.payload?.headers?.find(h => h.name.toLowerCase() === name)?.value ?? ''
const decode = (d: string) => Buffer.from(d.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')

export function textOf(p: Part | undefined): string {
  if (!p) return ''
  if (p.mimeType === 'text/plain' && p.body?.data) return decode(p.body.data)
  for (const c of p.parts ?? []) { const t = textOf(c); if (t) return t }
  if (p.mimeType === 'text/html' && p.body?.data) {
    return decode(p.body.data).replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>|<\/p>|<\/div>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n').trim()
  }
  return ''
}

export interface MailSummary { id: string; from: string; subject: string; date: string; snippet: string; unread: boolean }

export async function searchMail(userId: string, q: string, max = 10): Promise<MailSummary[]> {
  const list = await gfetch(userId, `${BASE}/messages?${new URLSearchParams({ maxResults: String(Math.min(20, Math.max(1, max))), ...(q ? { q: q.slice(0, 200) } : { labelIds: 'INBOX' }) })}`)
  const ids = ((await list.json()) as { messages?: { id: string }[] }).messages ?? []
  const out = await Promise.all(ids.map(async ({ id }) => {
    try {
      const r = await gfetch(userId, `${BASE}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`)
      const m = await r.json() as Msg
      return { id: m.id, from: header(m, 'from'), subject: header(m, 'subject') || '(no subject)', date: header(m, 'date'), snippet: m.snippet ?? '', unread: (m.labelIds ?? []).includes('UNREAD') }
    } catch { return null }
  }))
  return out.filter((m): m is MailSummary => !!m)
}

export async function readMail(userId: string, id: string): Promise<{ id: string; threadId: string; from: string; to: string; subject: string; date: string; messageId: string; body: string }> {
  if (!/^[a-zA-Z0-9]{5,64}$/.test(id)) throw new GoogleError('failed', 'That is not an email id.')
  const res = await gfetch(userId, `${BASE}/messages/${id}?format=full`)
  const m = await res.json() as Msg
  return {
    id: m.id, threadId: m.threadId, from: header(m, 'from'), to: header(m, 'to'), subject: header(m, 'subject'),
    date: header(m, 'date'), messageId: header(m, 'message-id'), body: textOf(m.payload).slice(0, 12_000),
  }
}

const enc = (s: string) => `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim()

/** Save a draft: a reply in the same thread when replyToId is given, otherwise a new email. Never sends. */
export async function saveDraft(userId: string, d: { body: string; replyToId?: string | null; to?: string | null; subject?: string | null }): Promise<{ id: string }> {
  let to = oneLine(d.to ?? ''), subject = oneLine(d.subject ?? ''), threadId: string | undefined
  const extra: string[] = []
  if (d.replyToId) {
    const orig = await readMail(userId, d.replyToId)
    threadId = orig.threadId
    to = to || oneLine(orig.from)
    subject = subject || (/^re:/i.test(orig.subject) ? orig.subject : `Re: ${orig.subject}`)
    if (orig.messageId) extra.push(`In-Reply-To: ${oneLine(orig.messageId)}`, `References: ${oneLine(orig.messageId)}`)
  }
  if (!to) throw new GoogleError('failed', 'A draft needs someone to send it to.')
  if (/[,;]/.test(to.replace(/"[^"]*"/g, ''))) throw new GoogleError('failed', 'A draft goes to one person.')
  const raw = [`To: ${to}`, `Subject: ${enc(subject || '(no subject)')}`, ...extra, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', '', d.body.slice(0, 20_000)].join('\r\n')
  const res = await gfetch(userId, `${BASE}/drafts`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: { raw: Buffer.from(raw).toString('base64url'), ...(threadId ? { threadId } : {}) } }),
  })
  const j = await res.json() as { id?: string }
  if (!j.id) throw new GoogleError('failed', 'Gmail did not confirm the draft.')
  return { id: j.id }
}
