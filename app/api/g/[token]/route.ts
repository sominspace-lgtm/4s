import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveGathering, KIND_FIELDS, pick, clip, type GuestKind } from '@/lib/guest/portal'

// A guest contribution from the phone portal. No account — the gathering
// token in the URL is the credential (resolveGathering), and every field
// written here is either server-stamped (space_id, gathering_id) or run
// through the per-kind allowlist in KIND_FIELDS. See the migration header.

// Light abuse defence in the spirit of the Alexa route: a soft per-gathering
// ceiling and a per-(gathering, ip) cooldown, both in module memory. A
// serverless cold start resets them, which is fine — this is a house party,
// not a public form.
const recent = new Map<string, number[]>() // key -> timestamps (last 60s)
const COOLDOWN_MS = 1500
const PER_MIN = 12

function throttled(key: string): boolean {
  const now = Date.now()
  const hits = (recent.get(key) ?? []).filter(t => now - t < 60_000)
  if (hits.length && now - hits[hits.length - 1] < COOLDOWN_MS) return true
  if (hits.length >= PER_MIN) return true
  hits.push(now)
  recent.set(key, hits)
  return false
}

interface Props { params: Promise<{ token: string }> }

export async function POST(request: Request, { params }: Props) {
  const { token } = await params
  const g = await resolveGathering(token)
  if (!g) return NextResponse.json({ error: 'This gathering link is not valid.' }, { status: 404 })
  if (!g.active) return NextResponse.json({ error: 'This gathering has ended.' }, { status: 410 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }

  const kind = body.kind as GuestKind
  const spec = KIND_FIELDS[kind]
  if (!spec || kind === 'photo') {
    return NextResponse.json({ error: 'Unknown kind' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
  if (throttled(`${g.id}:${ip}`)) {
    return NextResponse.json({ error: 'One moment — that was quick. Try again in a sec.' }, { status: 429 })
  }

  const guestName = clip(body.guest_name, 40)
  const text = spec.body ? clip(body.body, kind === 'guestbook' || kind === 'note' || kind === 'thank_you' ? 280 : 120) : null
  const meta = pick(body, spec.meta)
  // "from" never stores a precise point — round the coords hard so a guest
  // can't be placed at their doorstep from the map pin.
  if (kind === 'from') {
    if (typeof meta.lat === 'number') meta.lat = Math.round((meta.lat as number) * 20) / 20
    if (typeof meta.lng === 'number') meta.lng = Math.round((meta.lng as number) * 20) / 20
    if (meta.place) meta.place = clip(meta.place, 60)
  }
  if (kind === 'song') {
    if (meta.title) meta.title = clip(meta.title, 120)
    if (meta.url) meta.url = clip(meta.url, 400)
  }

  if (!text && Object.keys(meta).length === 0) {
    return NextResponse.json({ error: 'Nothing to add' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('guest_contributions')
    .insert({
      gathering_id: g.id,
      space_id: g.spaceId,
      kind,
      guest_name: guestName,
      body: text,
      meta,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: data.id })
}
