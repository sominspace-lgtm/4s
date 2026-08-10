'use client'

import DomainGrid from '@/components/domains/DomainGrid'

// Life = the long-term care of every important area.
//
// This used to be a two-tab wrapper (Domains · Home Brain). Home Brain moved
// to Household (2026-08-07) — none of it is personal, and all of it is what
// the other people in the house need when you're not there. That left a tab
// bar with exactly one tab, which is pure chrome, so the wrapper is gone and
// Life renders its domains directly.
//
// Kept as a component rather than pointing PersonalHub straight at
// DomainGrid: "Life" is the concept and DomainGrid is one way of drawing it,
// and this is where anything else life-shaped would land.
export default function LifeHub() {
  return <DomainGrid />
}
