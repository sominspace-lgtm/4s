import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveGathering } from '@/lib/guest/portal'

// A guest upvote on a song someone else suggested. Dedup is client-side
// (localStorage) — this is a party queue, not an election. The write is
// pinned to the gathering and to kind='song', visible only.

const recent = new Map<string, number[]>()
function throttled(key: string): boolean {
  const now = Date.now()
  const hits = (recent.get(key) ?? []).filter(t => now - t < 60_000)
  if (hits.length >= 30) return true
  hits.push(now); recent.set(key, hits)
  return false
}

interface Props { params: Promise<{ token: string }> }

export async function POST(request: Request, { params }: Props) {
  const { token } = await params
  const g = await resolveGathering(token)
  if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!g.active) return NextResponse.json({ error: 'This gathering has ended.' }, { status: 410 })

  let body: { contributionId?: string; dir?: number }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }
  const id = body.contributionId
  if (!id) return NextResponse.json({ error: 'contributionId required' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
  if (throttled(`${g.id}:${ip}`)) return NextResponse.json({ error: 'Slow down a sec.' }, { status: 429 })

  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from('guest_contributions')
    .select('id, upvotes')
    .eq('id', id)
    .eq('gathering_id', g.id)
    .eq('kind', 'song')
    .eq('status', 'visible')
    .maybeSingle()
  if (error || !row) return NextResponse.json({ error: 'Song not found' }, { status: 404 })

  const delta = body.dir === -1 ? -1 : 1
  const next = Math.max(0, (row.upvotes ?? 0) + delta)
  const { error: upErr } = await admin.from('guest_contributions').update({ upvotes: next }).eq('id', id)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, upvotes: next })
}

// The current song list, so the portal can show the queue + tallies.
export async function GET(request: Request, { params }: Props) {
  const { token } = await params
  const g = await resolveGathering(token)
  if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('guest_contributions')
    .select('id, guest_name, body, meta, upvotes')
    .eq('gathering_id', g.id)
    .eq('kind', 'song')
    .eq('status', 'visible')
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: true })

  const songs = (data ?? []).map(r => ({
    id: r.id,
    title: (r.meta as Record<string, unknown>)?.title as string || r.body || 'a song',
    by: r.guest_name,
    votes: r.upvotes ?? 0,
  }))
  return NextResponse.json({ musicUrl: g.musicUrl, songs })
}
