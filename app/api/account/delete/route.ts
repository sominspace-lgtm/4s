import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Real account deletion (2026-08-21) — Settings' "Delete my account" used to
// just sign out and redirect, with a comment admitting it was a stub, while
// the copy right next to the button said "permanent and cannot be undone."
// A button that claims to do something destructive and doesn't is worse
// than not having the button.
//
// auth.users deletion cascades through every table in this app — every
// user_id column is declared `references auth.users(id) on delete cascade`,
// confirmed across the migrations (people, work_items, household_*, notes,
// …). Deleting the auth row via the admin API is the whole operation; there
// is no second pass of manual per-table deletes to keep in sync as new
// tables get added.
//
// The user id to delete comes ONLY from the caller's own authenticated
// session (getUser() below), never from the request body — accepting a
// client-supplied id here would let anyone delete anyone else's account.
export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 })
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
