import { NextResponse } from 'next/server'
import { googleFetch, requireGoogleAccess } from '@/lib/google/server'

// The shared album's automatic half (2026-10-24). Google no longer lets an
// app read a Google Photos library on its own, but Drive it can: every photo
// in a Drive folder named "4S Photos" (on the shared account by default)
// shows in Our photos, with nothing to pick. GET lists them; GET ?id= streams
// one. Read only.

const BASE = 'https://www.googleapis.com/drive/v3/files'
const FOLDER = '4S Photos'

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams
  const who = await requireGoogleAccess(sp.get('account') ?? 'shared')
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const id = sp.get('id')
  try {
    if (id) {
      if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })
      const meta = await googleFetch(who.owner, `${BASE}/${id}?fields=mimeType,size,thumbnailLink`)
      if (!meta.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      const m = await meta.json() as { mimeType?: string; size?: string; thumbnailLink?: string }
      if (!m.mimeType?.startsWith('image/')) return NextResponse.json({ error: 'Not a photo' }, { status: 400 })
      // A big phone photo comes back as a resized thumbnail; small ones as they are.
      const url = Number(m.size ?? 0) > 4_000_000 && m.thumbnailLink ? m.thumbnailLink.replace(/=s\d+$/, '=s2000') : `${BASE}/${id}?alt=media`
      const img = await googleFetch(who.owner, url)
      if (!img.ok) return NextResponse.json({ error: 'Could not load' }, { status: 502 })
      return new NextResponse(img.body, { headers: { 'content-type': img.headers.get('content-type') ?? m.mimeType, 'cache-control': 'private, max-age=3600' } })
    }
    const f = await googleFetch(who.owner, `${BASE}?${new URLSearchParams({ q: `name = '${FOLDER}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`, fields: 'files(id)', pageSize: '5' })}`)
    if (!f.ok) return NextResponse.json({ folder: false, photos: [] })
    const folders = ((await f.json()) as { files?: { id: string }[] }).files ?? []
    if (folders.length === 0) return NextResponse.json({ folder: false, photos: [] })
    const parents = folders.map(x => `'${x.id}' in parents`).join(' or ')
    const l = await googleFetch(who.owner, `${BASE}?${new URLSearchParams({ q: `(${parents}) and mimeType contains 'image/' and trashed = false`, fields: 'files(id,name,createdTime)', orderBy: 'createdTime desc', pageSize: '200' })}`)
    if (!l.ok) return NextResponse.json({ folder: true, photos: [] })
    const files = ((await l.json()) as { files?: { id: string; name: string; createdTime?: string }[] }).files ?? []
    return NextResponse.json({ folder: true, photos: files.map(x => ({ id: x.id, name: x.name, created: x.createdTime ?? null })) })
  } catch (e) {
    if (e instanceof Error && e.message === 'not-connected') return NextResponse.json({ folder: false, photos: [], connected: false })
    return NextResponse.json({ folder: false, photos: [] })
  }
}
