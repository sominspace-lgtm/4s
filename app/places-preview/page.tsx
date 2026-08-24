import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import PlacesPreviewClient from './PlacesPreviewClient'
import type { Place } from '@/lib/hooks/usePlaces'

// Dev-only diagnostic harness for the Places map (2026-08-24) — mirrors
// village-preview's role for the village scene. A map bug ("pins not
// showing") is otherwise unreproducible without a login; this fetches real
// place rows with the service-role client (bypassing auth/RLS) and renders
// the actual PlaceMap component so the real render path — and any console
// error — is visible without credentials. 404s in production, same guard
// village-preview uses.
export default async function PlacesPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('places').select('*').order('created_at', { ascending: false })
  return <PlacesPreviewClient places={(data as Place[] | null) ?? []} error={error?.message ?? null} />
}
