// What a shared device (the "Shared" login) can reach without the PIN,
// and the tighter set once a gathering is actually live on it (2026-09-10).
//
// Plain shared view: the household's shared surfaces — Home, Upkeep,
// Reference — plus the Village (a picture drawn from personal data) and
// Places. Going into personal data still prompts the PIN.
//
// Guest / host mode (a gathering is live): only the Village, Places (no
// Trips), and the guest-safe part of Reference. Everything else needs the
// PIN, and all of it is back in plain shared view the moment the gathering
// ends. The `guestMode` flag itself is `sharedMode && gathering?.phase ===
// 'live'`, computed in DashboardClient.

export const SHARED_MODE_IDS: ReadonlySet<string> = new Set([
  'home', 'upkeep', 'reference', 'village', 'places', 'places-trips', 'places-lists',
])

// Lists is in GUEST_MODE_IDS deliberately (2026-09-22): "what's the wifi
// password" / "what's the bathroom code" is exactly the kind of thing a
// guest at a live gathering should be able to look up without the PIN —
// the same reasoning Reference is already here for. This is coarser than
// per-list: any list is guest-visible, not just the guest-appropriate ones,
// matching the granularity Reference already accepts (house notes and all).
export const GUEST_MODE_IDS: ReadonlySet<string> = new Set([
  'reference', 'village', 'places', 'places-lists',
])

/** Is `sectionId` reachable on a shared device right now? */
export function sharedSectionVisible(sectionId: string, guestMode: boolean): boolean {
  return (guestMode ? GUEST_MODE_IDS : SHARED_MODE_IDS).has(sectionId)
}
