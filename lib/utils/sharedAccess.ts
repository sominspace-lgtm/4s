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
  'home', 'upkeep', 'reference', 'village', 'places', 'places-trips',
])

export const GUEST_MODE_IDS: ReadonlySet<string> = new Set([
  'reference', 'village', 'places',
])

/** Is `sectionId` reachable on a shared device right now? */
export function sharedSectionVisible(sectionId: string, guestMode: boolean): boolean {
  return (guestMode ? GUEST_MODE_IDS : SHARED_MODE_IDS).has(sectionId)
}
