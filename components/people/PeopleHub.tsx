'use client'

import RelationshipMemory from '@/components/relationships/RelationshipMemory'

// People — a flat contact sheet (2026-09-03). The household is exactly two
// accounts and always will be, so there's no friends/sharing layer here;
// this is just the people you both want to stay close to — birthdays, last
// hellos, notes, gift ideas. RelationshipMemory is the whole thing now
// (it renders its own card); this file is just the section entry point.
export default function PeopleHub() {
  return <RelationshipMemory />
}
