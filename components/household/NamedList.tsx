'use client'

import { useLists } from '@/lib/hooks/useLists'
import { usePlaces } from '@/lib/hooks/usePlaces'
import { ListCard } from './HouseholdCustomLists'

// One specific list, embedded standalone where it actually belongs — "Dream
// hotels" under Trips, "Bathroom codes" under Places → Info (2026-09-23) —
// rather than found by scrolling a generic list-of-lists. Same underlying
// household_lists row either way: creating it here and finding it later in
// Household → Lists (or the reverse) is the same list, not a copy.
//
// Matching is by name, case-insensitively, because the list is user-created
// (via the "start it" button below) and there's no separate "kind" column to
// key off — the household_lists schema is deliberately generic (see
// household_lists.sql). If a list called "bathroom codes" already exists
// from before this feature, it's still found.
export default function NamedList({ spaceId, name, startLabel }: {
  spaceId: string | null
  name: string
  /** Button text before the list exists — e.g. "+ Start a Dream hotels list". */
  startLabel: string
}) {
  const { lists, loading, addList, addItem, updateItem, toggleItem, removeItem } = useLists(spaceId)
  const { places } = usePlaces()
  const list = lists.find(l => l.name.trim().toLowerCase() === name.toLowerCase())

  if (loading) return null

  if (!list) {
    return (
      <button onClick={() => addList(name)} className="btn btn-secondary press" style={{ fontSize: '0.72rem', alignSelf: 'flex-start' }}>
        {startLabel}
      </button>
    )
  }

  return (
    <ListCard
      list={list}
      places={places}
      defaultOpen
      onAddItem={(label, extra) => addItem(list.id, label, extra)}
      onUpdateItem={(itemId, patch) => updateItem(list.id, itemId, patch)}
      onToggleItem={itemId => toggleItem(list.id, itemId)}
      onRemoveItem={itemId => removeItem(list.id, itemId)}
    />
  )
}
