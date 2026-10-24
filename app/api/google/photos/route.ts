import { NextResponse } from 'next/server'
import { googleFetch, googleReason, requireGoogleAccess } from '@/lib/google/server'

// Google Photos (2026-10-24), through Google's Photos Picker: you choose the
// photos in Google's own picker, and 4S only ever sees the ones you chose.
// (Google closed whole-library access to apps in 2025; the picker is the way
// in now.) Steps: POST makes a picking session and returns the picker link;
// GET ?session= reports when you are done; GET ?session=&list=1 lists what
// you picked; GET ?session=&file=<n> streams one picked photo, resized.

const API = 'https://photospicker.googleapis.com/v1'

interface PickedItem { id: string; createTime?: string; type?: string; mediaFile?: { baseUrl: string; mimeType?: string; filename?: string } }

function fail(e: unknown) {
  if (e instanceof Error && e.message === 'not-connected') return NextResponse.json({ error: 'not-connected' }, { status: 409 })
  return NextResponse.json({ error: 'Google Photos did not answer. Try again.' }, { status: 502 })
}

async function listPicked(owner: string, session: string): Promise<PickedItem[]> {
  const out: PickedItem[] = []
  let token = ''
  for (let page = 0; page < 5; page++) {
    const res = await googleFetch(owner, `${API}/mediaItems?${new URLSearchParams({ sessionId: session, pageSize: '50', ...(token ? { pageToken: token } : {}) })}`)
    if (!res.ok) throw new Error(`list ${res.status}`)
    const j = await res.json() as { mediaItems?: PickedItem[]; nextPageToken?: string }
    out.push(...(j.mediaItems ?? []))
    if (!j.nextPageToken) break
    token = j.nextPageToken
  }
  return out
}

export async function POST(request: Request) {
  const who = await requireGoogleAccess(new URL(request.url).searchParams.get('account'))
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  try {
    const res = await googleFetch(who.owner, `${API}/sessions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    if (!res.ok) return NextResponse.json({ error: await googleReason(res, 'Google Photos Picker API') }, { status: res.status === 403 ? 403 : 502 })
    const j = await res.json() as { id: string; pickerUri: string; pollingConfig?: { pollInterval?: string } }
    return NextResponse.json({ session: j.id, url: j.pickerUri, poll: j.pollingConfig?.pollInterval ?? '3s' })
  } catch (e) { return fail(e) }
}

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams
  const who = await requireGoogleAccess(sp.get('account'))
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const session = sp.get('session') ?? ''
  if (!/^[\w-]{6,200}$/.test(session)) return NextResponse.json({ error: 'session is required' }, { status: 400 })
  try {
    const file = sp.get('file')
    if (file !== null) {
      // One picked photo, resized so a phone can upload it quickly.
      const items = await listPicked(who.owner, session)
      const item = items[Number(file)]
      if (!item?.mediaFile?.baseUrl) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      const img = await googleFetch(who.owner, `${item.mediaFile.baseUrl}=w2048-h2048`)
      if (!img.ok) throw new Error(`file ${img.status}`)
      return new NextResponse(img.body, { headers: { 'content-type': img.headers.get('content-type') ?? 'image/jpeg', 'cache-control': 'private, no-store' } })
    }
    if (sp.get('list')) {
      const items = await listPicked(who.owner, session)
      // n is the position in the full list, which is what ?file= expects.
      return NextResponse.json({ items: items.map((i, n) => ({ n, type: i.type ?? 'PHOTO', name: i.mediaFile?.filename ?? 'photo', taken: i.createTime ?? null })).filter(i => i.type === 'PHOTO') })
    }
    const res = await googleFetch(who.owner, `${API}/sessions/${encodeURIComponent(session)}`)
    if (!res.ok) throw new Error(`poll ${res.status}`)
    const j = await res.json() as { mediaItemsSet?: boolean }
    return NextResponse.json({ done: !!j.mediaItemsSet })
  } catch (e) { return fail(e) }
}

export async function DELETE(request: Request) {
  const sp = new URL(request.url).searchParams
  const who = await requireGoogleAccess(sp.get('account'))
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const session = sp.get('session') ?? ''
  if (/^[\w-]{6,200}$/.test(session)) {
    await googleFetch(who.owner, `${API}/sessions/${encodeURIComponent(session)}`, { method: 'DELETE' }).catch(() => null)
  }
  return NextResponse.json({ ok: true })
}
