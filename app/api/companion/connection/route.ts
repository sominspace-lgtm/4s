import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Lets either half of a CONFIRMED relationship_pairs save their own
// Companion bot's tunnel URL + API key. RLS on companion_connections
// enforces that only the two confirmed people on that pair can write here —
// this route doesn't add any authorization beyond what the database already
// guarantees, it just gives the client a place to POST to.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const apiUrl = (body.apiUrl as string ?? '').trim()
  const apiKey = (body.apiKey as string ?? '').trim()
  if (!apiUrl || !apiKey) return NextResponse.json({ error: 'apiUrl and apiKey are both required' }, { status: 400 })
  if (!/^https:\/\//i.test(apiUrl)) return NextResponse.json({ error: 'apiUrl must start with https://' }, { status: 400 })

  const { data: pair } = await supabase
    .from('relationship_pairs')
    .select('id')
    .eq('status', 'confirmed')
    .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle()
  if (!pair) return NextResponse.json({ error: 'Confirm a relationship partner before connecting Companion.' }, { status: 400 })

  const { error } = await supabase
    .from('companion_connections')
    .upsert({ pair_id: pair.id, api_url: apiUrl, api_key: apiKey, created_by: user.id }, { onConflict: 'pair_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: pair } = await supabase
    .from('relationship_pairs')
    .select('id')
    .eq('status', 'confirmed')
    .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle()
  if (!pair) return NextResponse.json({ ok: true })

  await supabase.from('companion_connections').delete().eq('pair_id', pair.id)
  return NextResponse.json({ ok: true })
}
