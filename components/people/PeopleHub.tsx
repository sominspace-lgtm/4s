'use client'

import RelationshipMemory from '@/components/relationships/RelationshipMemory'
import YouTwo from '@/components/checkin/YouTwo'

// People (2026-09-03): the people you both want to stay close to. Since the
// 2026-10-21 redesign it opens with "You two": your weekly check-ins and
// Understanding each other, which used to sit in Collections.
export default function PeopleHub({ userId }: { userId: string }) {
  return (
    <>
      <YouTwo userId={userId} />
      <RelationshipMemory />
    </>
  )
}
