import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Issues a fresh 4-digit pairing code for the logged-in user. They speak it to
// Alexa once ("ask four s to link 4 2 9 1"); the skill webhook matches the code
// and binds their Alexa account. One active code per user — generating a new
// one replaces the old.
export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  await admin.from('alexa_link_codes').delete().eq('user_id', user.id)

  // Retry a couple times in the (tiny) chance of a code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = String(Math.floor(1000 + Math.random() * 9000))
    const { error } = await admin.from('alexa_link_codes').insert({ code, user_id: user.id })
    if (!error) return NextResponse.json({ code })
  }
  return NextResponse.json({ error: 'Could not generate a code, try again.' }, { status: 500 })
}
