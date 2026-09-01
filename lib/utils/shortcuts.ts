// Bare-key global shortcuts (t / c / h / / / ?) — see DashboardClient's
// keydown effect. There was no input-focus guard anywhere in the app before
// this; every existing global handler relied on ⌘/⌃ to avoid clashing with
// typing. A bare letter needs to actively bow out when the user is typing or
// a dialog is up.

/** True when a bare-letter shortcut should be ignored for this keypress. */
export function ignoreShortcut(e: KeyboardEvent): boolean {
  // Let real browser/OS shortcuts through untouched.
  if (e.metaKey || e.ctrlKey || e.altKey) return true
  if (e.repeat) return true

  const el = (e.target as HTMLElement | null) ?? (document.activeElement as HTMLElement | null)
  if (el) {
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (el.isContentEditable) return true
  }

  // Any modal / overlay open (Search, Quick Capture, Unlock, Customize,
  // the shortcut sheet itself, …) — those own the keyboard while up.
  if (document.querySelector('[role="dialog"]')) return true

  return false
}
