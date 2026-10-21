import { notFound } from 'next/navigation'
import UiPreviewClient from './UiPreviewClient'

// Dev-only harness for the app's chrome (2026-10-21 redesign): the bottom
// bar, the top bar, the Me grid, cards and sheets, with no sign-in. 404s in
// production, like village-preview.
export default function UiPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <UiPreviewClient />
}
