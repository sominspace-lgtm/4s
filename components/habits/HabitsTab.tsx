'use client'

import PersonalRoutines from './PersonalRoutines'
import HabitTracker from './HabitTracker'
import HouseholdUpkeep from './HouseholdUpkeep'

// The Habits section — routines + the habit grid, plus a read-only view of
// the household's chores and routines at the bottom (2026-09-03). Goals
// moved to the Tasks section the same day.
export default function HabitsTab({ userId }: { userId: string }) {
  return (
    <div>
      {/* Routines sit inside the habits card (2026-10-23). */}
      <HabitTracker>
        <PersonalRoutines userId={userId} embedded />
      </HabitTracker>
      <HouseholdUpkeep userId={userId} />
    </div>
  )
}
