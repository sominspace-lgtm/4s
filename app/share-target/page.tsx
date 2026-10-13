import { redirect } from 'next/navigation'
import { encodeShared, SHARE_PARAM } from '@/lib/share/parse'

// Where a share from another app lands: "share to 4S" from your phone's share
// sheet (Android installed app, or an iPhone Shortcut that opens this address).
// GET, because that is the one form every mobile browser honors for shares.
//
// It no longer files the share anywhere itself (2026-10-13): it hands it to the
// dashboard, which asks "What is this?" so a recipe link becomes a recipe, a
// product link a wish, and so on. proxy.ts sends a signed-out visitor to sign in
// first and brings them back here with the share intact.
export default async function ShareTargetPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; text?: string; url?: string }>
}) {
  const { title = '', text = '', url = '' } = await searchParams
  if (!title.trim() && !text.trim() && !url.trim()) redirect('/dashboard')
  redirect(`/dashboard?${SHARE_PARAM}=${encodeShared({ title: title.slice(0, 500), text: text.slice(0, 4000), url: url.slice(0, 2000) })}`)
}
