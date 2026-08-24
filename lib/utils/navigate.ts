// Switch the dashboard to a section tab from anywhere in the app.
// DashboardClient listens for this event; 'week-review', 'brief-inbox' and
// 'brief-calendar' resolve to the Today tab and then scroll to that anchor.
export function goToSection(id: string) {
  window.dispatchEvent(new CustomEvent('4s:navigate', { detail: id }))
}

// Scroll to an in-page anchor, and actually verify it happened.
//
// Two failure modes this guards against, both of which were live:
//  1. The target may not be mounted yet — the tab it lives in can still be
//     mid-render when the navigation event fires, so a single lookup finds
//     nothing and the click silently does nothing. Hence the short retry.
//  2. `behavior: 'smooth'` is not honoured everywhere. Where it isn't, the
//     call is a silent no-op rather than an instant jump — so the anchor is
//     simply never reached and, again, the click appears to do nothing.
//     Hence: attempt smooth, then check, then fall back to an instant jump.
//
// The verification is the point. Scrolling is one of those things that
// looks fine in code and quietly fails in a real browser.
export function scrollToAnchor(id: string, attempt = 0) {
  const el = document.getElementById(id)
  if (!el) {
    if (attempt < 12) setTimeout(() => scrollToAnchor(id, attempt + 1), 40)
    return
  }

  const before = window.scrollY
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })

  setTimeout(() => {
    const moved = Math.abs(window.scrollY - before) > 4
    const rect = el.getBoundingClientRect()
    const alreadyInView = rect.top >= -4 && rect.top < window.innerHeight * 0.6
    if (!moved && !alreadyInView) el.scrollIntoView({ block: 'start' })
  }, 350)
}

export type PersonalTab = 'tasks' | 'goals' | 'habits' | 'notes' | 'money' | 'people' | 'council'

// Personal holds Habits/Life/Money/People/Council as sub-tabs (see
// components/personal/PersonalHub.tsx) — plain goToSection('personal')
// always lands on whichever sub-tab was last open, which breaks callers
// like Brief's "Ask Council" card that mean a specific one.
// goToPersonal() carries that intent two ways: a module-level value
// PersonalHub reads once on mount (covers the common case where Personal
// isn't mounted yet, so a live event fired now would never be heard) and a
// CustomEvent for the case where it's already mounted and just needs to
// switch its own sub-tab.
let pendingPersonalTab: PersonalTab | null = null

export function goToPersonal(tab: PersonalTab) {
  pendingPersonalTab = tab
  window.dispatchEvent(new CustomEvent('4s:personal-tab', { detail: tab }))
  goToSection('personal')
}

// Read once, at mount — consumes the pending value so a later remount
// doesn't re-apply a stale target.
export function consumePersonalTab(): PersonalTab | null {
  const t = pendingPersonalTab
  pendingPersonalTab = null
  return t
}

// Kept in sync with HouseholdTabId in lib/utils/householdLayout.ts — the two
// must not drift, or a deep link can land on a tab that no longer renders.
export type HouseholdTab = 'home' | 'calendar' | 'routines' | 'movein' | 'reference'

// Same reasoning and shape as goToPersonal/consumePersonalTab above: lets a
// caller land on a SPECIFIC Household sub-tab, which a bare
// goToSection('household') can't express.
let pendingHouseholdTab: HouseholdTab | null = null

export function goToHousehold(tab: HouseholdTab) {
  pendingHouseholdTab = tab
  window.dispatchEvent(new CustomEvent('4s:household-tab', { detail: tab }))
  goToSection('household')
}

export function consumeHouseholdTab(): HouseholdTab | null {
  const t = pendingHouseholdTab
  pendingHouseholdTab = null
  return t
}
