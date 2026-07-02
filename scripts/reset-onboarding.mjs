// Forces every existing user back through onboarding, WITHOUT touching any
// user content (tasks, habits, notes, domains, money items, calendar prefs,
// council data, companions/shared spaces, etc).
//
// What it does: sets user_prefs.onboarded = false for every row.
// The app's own middleware (proxy.ts) already redirects any signed-in user
// whose user_prefs.onboarded is false to /onboard, and the onboarding flow's
// "finish" step sets onboarded back to true. So flipping this one column is
// the entire mechanism — no other schema or app change is required.
//
// Safe to re-run (idempotent): running it again just sets the same rows to
// false again; it never inserts, deletes, or touches any other column.
//
// Usage:
//   npm run reset:onboarding
//
// Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local
// (server-only secret — never committed, never sent to the client).
//
// Manual fallback (if you'd rather run this by hand in the Supabase SQL
// editor instead of running this script):
//
//   update user_prefs set onboarded = false;

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

function loadEnvLocal() {
  const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local')
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

async function main() {
  loadEnvLocal()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: before, error: readError } = await supabase.from('user_prefs').select('user_id, onboarded')
  if (readError) {
    console.error('Failed to read user_prefs:', readError.message)
    process.exit(1)
  }

  const alreadyReset = before.filter(r => r.onboarded === false).length
  const toReset = before.filter(r => r.onboarded !== false).length

  const { error: updateError, count } = await supabase
    .from('user_prefs')
    .update({ onboarded: false })
    .neq('user_id', '00000000-0000-0000-0000-000000000000') // match-all safety filter (every real user_id differs from this)
    .select('user_id', { count: 'exact' })

  if (updateError) {
    console.error('Failed to reset onboarding state:', updateError.message)
    process.exit(1)
  }

  console.log(`Users found: ${before.length}`)
  console.log(`Already reset (onboarded=false): ${alreadyReset}`)
  console.log(`Newly reset this run: ${toReset}`)
  console.log(`Rows updated: ${count ?? 'unknown'}`)
  console.log('Done. No user content was modified — only user_prefs.onboarded was set to false.')
}

main()
