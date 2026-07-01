import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = user.id

  const [prefs, captures, habits, habitLogs, workItems, subs, watchItems, pulseItems, domains] = await Promise.all([
    supabase.from('user_prefs').select('*').eq('user_id', uid).single(),
    supabase.from('captures').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    supabase.from('habits').select('*').eq('user_id', uid),
    supabase.from('habit_logs').select('*').eq('user_id', uid).order('logged_date', { ascending: false }),
    supabase.from('work_items').select('*').eq('user_id', uid),
    supabase.from('subscriptions').select('*').eq('user_id', uid),
    supabase.from('watch_items').select('*').eq('user_id', uid),
    supabase.from('pulse_items').select('*').eq('user_id', uid),
    supabase.from('domain_captures').select('*').eq('user_id', uid),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    user: { id: uid, email: user.email },
    prefs: prefs.data,
    captures: captures.data ?? [],
    habits: habits.data ?? [],
    habit_logs: habitLogs.data ?? [],
    work_items: workItems.data ?? [],
    subscriptions: subs.data ?? [],
    watch_items: watchItems.data ?? [],
    pulse_items: pulseItems.data ?? [],
    domain_captures: domains.data ?? [],
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="4s-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
