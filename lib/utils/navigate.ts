// Switch the dashboard to a section tab from anywhere in the app.
// DashboardClient listens for this event; 'week-review' and 'brief-inbox'
// resolve to the Brief tab and then scroll to the matching anchor.
export function goToSection(id: string) {
  window.dispatchEvent(new CustomEvent('4s:navigate', { detail: id }))
}
