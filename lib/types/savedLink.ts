// Shared between usePlaces.ts and useTrips.ts — a pasted link (Instagram,
// TikTok, a blog, a restaurant's own site) kept on the pin or trip it's
// about. One shape, one place, so the two hooks and LinksSection.tsx never
// drift apart on what a saved link actually looks like.
export interface SavedLink {
  id: string
  url: string
  title: string | null
  image: string | null
  added_at: string
}

export function newSavedLink(url: string, title: string | null, image: string | null): SavedLink {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  return { id, url, title, image, added_at: new Date().toISOString() }
}
