// Switch the dashboard to a section tab from anywhere in the app.
// DashboardClient listens for this event; 'week-review' and 'brief-inbox'
// resolve to the Brief tab and then scroll to the matching anchor.
export function goToSection(id: string) {
  window.dispatchEvent(new CustomEvent('4s:navigate', { detail: id }))
}

export type GrowthTab = 'habits' | 'life' | 'council'

// Growth merges Habits/Life/Council into one tab with its own sub-tabs (see
// components/growth/GrowthHub.tsx) — plain goToSection('growth') always
// lands on whichever sub-tab was last open, which breaks callers like
// Brief's "Ask Council" card that mean a specific one. goToGrowth() carries
// that intent two ways: a module-level value GrowthHub reads once on mount
// (covers the common case where Growth isn't mounted yet, so a live event
// fired now would never be heard) and a CustomEvent for the case where
// Growth is already mounted and just needs to switch its own sub-tab.
let pendingGrowthTab: GrowthTab | null = null

export function goToGrowth(tab: GrowthTab) {
  pendingGrowthTab = tab
  window.dispatchEvent(new CustomEvent('4s:growth-tab', { detail: tab }))
  goToSection('growth')
}

// Read once, at mount — consumes the pending value so a later remount
// doesn't re-apply a stale target.
export function consumeGrowthTab(): GrowthTab | null {
  const t = pendingGrowthTab
  pendingGrowthTab = null
  return t
}
