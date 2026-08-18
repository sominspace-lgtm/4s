import { notFound } from 'next/navigation'
import VillagePreviewClient from './VillagePreviewClient'

// Dev-only harness for the village scene.
//
// The village is the one screen whose correctness is mostly visual, and it has
// 4 seasons × 4 times of day × 6 themes of state that are otherwise only
// reachable by changing the system clock and waiting three months. This renders
// them side by side from synthetic data, with no auth and no Supabase.
//
// 404s in production. It imports the real VillageScene, so it can't drift from
// what users actually see.
export default function VillagePreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <VillagePreviewClient />
}
