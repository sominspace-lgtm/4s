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

export type PersonalTab = 'tasks' | 'goals' | 'habits' | 'notes' | 'money' | 'people'

// Tasks/Habits/Notes/Money/People are their own top-level sections now
// (2026-09-01), so this is mostly just goToSection with a narrower type.
// Goals folded into the Tasks section (2026-09-03, was Habits) — a 'goals'
// target lands there and asks it to open the Goals section (see TasksTab).
export function goToPersonal(tab: PersonalTab) {
  if (tab === 'goals') {
    goToSection('tasks')
    // Let the Tasks section mount before its listener is expected to catch
    // this — same 60ms beat the keyboard shortcuts use for open-form events.
    setTimeout(() => window.dispatchEvent(new CustomEvent('4s:open-goals')), 60)
    return
  }
  goToSection(tab)
}

// Kept in sync with HouseholdTabId in lib/utils/householdLayout.ts — the two
// must not drift, or a deep link can land on a tab that no longer renders.
export type HouseholdTab = 'today' | 'home' | 'calendar' | 'smarthome' | 'reference'
// `calendar` is no longer its own section (2026-09-02, folded back into a Home
// block) — a 'calendar' deep link now lands on Home. Kept in the union so
// existing callers keep type-checking. `today` is the section id `hhtoday`
// (2026-09-03).

// Smart Home gets its own overlay/transition (2026-08-25), not a tab switch
// — tapping Home in the Village should feel like the house opening up, with
// the Village staying visible (dimmed, non-interactive) behind it, per the
// "Village becomes background/context only" vision doc. DashboardClient
// listens for this the same way it already does for app:open-archive.
export function openSmartHome() {
  window.dispatchEvent(new CustomEvent('app:open-smarthome'))
}

// Household's sub-tabs are real top-level sections now (2026-08-25), so
// every tab id IS a section id — this is just goToSection, with the one
// exception of smarthome, which is an overlay, not a section.
export function goToHousehold(tab: HouseholdTab) {
  if (tab === 'smarthome') { openSmartHome(); return }
  if (tab === 'calendar') { goToSection('home'); return }
  if (tab === 'today') { goToSection('hhtoday'); return }
  goToSection(tab)
}
