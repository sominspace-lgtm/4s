import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHouseholdToken } from '@/lib/household/resources'
import { buildWeeklyRecap } from '@/lib/household/weeklyRecap'

// Bespoke, not RESOURCES-driven: this reads across five tables and folds
// them into one shape, which a flat resource entry can't express. Shares
// buildWeeklyRecap with the 4S OS "This week" Home block, so the bot's
// Sunday post and the app's own view of the week can never disagree.

export async function GET(request: Request) {
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const recap = await buildWeeklyRecap(admin, caller.spaceId)
  return NextResponse.json(recap)
}
