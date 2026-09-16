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

// Mail is plain-shared (the household's own device) but deliberately NOT
// guest-safe below, same tier as Upkeep — it's correspondence between the
// two of you, not a lookup a party guest's device should be able to read.
export const SHARED_MODE_IDS: ReadonlySet<string> = new Set([
  'home', 'upkeep', 'reference', 'village', 'places', 'places-trips', 'places-nearby', 'mail',
])

// Nearby is in GUEST_MODE_IDS deliberately (2026-09-22, tab renamed from
// Info 2026-09-23): a map of what's around you plus your saved pins is
// exactly the kind of thing a guest at a live gathering should be able to
// see without the PIN — the same reasoning Reference is already here for.
// There's no editable list chrome left in this tab at all (bathroom codes
// are saved through a pin's own sheet, not here), so this is an even easier
// guest-visibility call than the old Info tab was.
export const GUEST_MODE_IDS: ReadonlySet<string> = new Set([
  'reference', 'village', 'places', 'places-nearby',
])

/** Is `sectionId` reachable on a shared device right now? */
export function sharedSectionVisible(sectionId: string, guestMode: boolean): boolean {
  return (guestMode ? GUEST_MODE_IDS : SHARED_MODE_IDS).has(sectionId)
}
