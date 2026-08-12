// Per-kind display spec for places (2026-08-12).
//
// A single flat taxonomy on purpose, not a category/subcategory tree — the
// spec this feature grew from listed pickleball, tennis, restaurants, cafes,
// parks, beaches, trails, shops, hotels and "favourite places" as one list of
// things people actually say, and a tree would force a decision ("is a beach
// under Outdoors or its own thing?") nobody asked to make.
//
// `kind` on the places row is free text, not a check constraint — see
// supabase/migrations/places_travel.sql for why. PLACE_KINDS is the render
// spec for the kinds this client knows about; `place` is the fallback for
// anything else (an older client, a bot writing an unrecognised kind, or a
// kind added here later without a migration). Falling back to `place` means
// an unknown kind is visible-but-unstyled, never lost.
//
// `fields` describes what PlaceKindFields renders from a place's `details`
// jsonb — display and edit only. Nothing here is ever filtered or sorted on;
// `kind` itself (the real column) is what filters use.

export type FieldType = 'text' | 'select' | 'bool' | 'url'

export interface KindField {
  key: string
  label: string
  type: FieldType
  options?: string[]
  placeholder?: string
}

export interface KindSpec {
  label: string
  icon: string
  color: string // a CSS custom property name, e.g. '--amber'
  fields: KindField[]
}

export const PLACE_KINDS: Record<string, KindSpec> = {
  restaurant: {
    label: 'Restaurant', icon: '◍', color: '--amber',
    fields: [
      { key: 'cuisine', label: 'Cuisine', type: 'text', placeholder: 'e.g. ramen' },
      { key: 'price_level', label: 'Price', type: 'select', options: ['$', '$$', '$$$', '$$$$'] },
      { key: 'reservation', label: 'Reservation', type: 'text', placeholder: 'notes on booking' },
    ],
  },
  cafe: {
    label: 'Cafe', icon: '◔', color: '--amber',
    fields: [
      { key: 'good_for', label: 'Good for', type: 'text', placeholder: 'e.g. working, quiet mornings' },
      { key: 'wifi', label: 'Wifi', type: 'bool' },
    ],
  },
  bar: {
    label: 'Bar', icon: '◑', color: '--rose',
    fields: [
      { key: 'vibe', label: 'Vibe', type: 'text' },
    ],
  },
  court: {
    label: 'Court', icon: '◫', color: '--emerald',
    fields: [
      { key: 'sport', label: 'Sport', type: 'text', placeholder: 'pickleball, tennis...' },
      { key: 'surface', label: 'Surface', type: 'text' },
      { key: 'indoor_outdoor', label: 'Indoor / outdoor', type: 'select', options: ['indoor', 'outdoor'] },
      { key: 'lights', label: 'Lights', type: 'bool' },
      { key: 'reservation_required', label: 'Reservation required', type: 'bool' },
      { key: 'booking_url', label: 'Booking link', type: 'url' },
      { key: 'fee', label: 'Fee', type: 'text' },
    ],
  },
  park: {
    label: 'Park', icon: '♣', color: '--emerald',
    fields: [
      { key: 'amenities', label: 'Amenities', type: 'text', placeholder: 'trails, dog park, picnic...' },
    ],
  },
  beach: {
    label: 'Beach', icon: '≈', color: '--slate',
    fields: [
      { key: 'parking', label: 'Parking', type: 'text' },
    ],
  },
  trail: {
    label: 'Trail', icon: '⟿', color: '--emerald',
    fields: [
      { key: 'distance', label: 'Distance', type: 'text' },
      { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['easy', 'moderate', 'hard'] },
    ],
  },
  hotel: {
    label: 'Hotel', icon: '◧', color: '--purple',
    fields: [
      { key: 'check_in', label: 'Check-in', type: 'text' },
      { key: 'nightly_rate', label: 'Nightly rate', type: 'text' },
    ],
  },
  shop: {
    label: 'Shop', icon: '◨', color: '--slate',
    fields: [
      { key: 'sells', label: 'Sells', type: 'text' },
    ],
  },
  activity: {
    label: 'Activity', icon: '✳', color: '--purple',
    fields: [
      { key: 'booking_url', label: 'Booking link', type: 'url' },
    ],
  },
  // The fallback for anything not listed above, and the default for a new
  // pin nobody has categorised yet.
  place: {
    label: 'Place', icon: '◇', color: '--gold',
    fields: [],
  },
}

export function kindSpec(kind: string): KindSpec {
  return PLACE_KINDS[kind] ?? PLACE_KINDS.place
}

// Order used by the kind picker and the filter chips — most-used first,
// 'place' last since it's the "none of these" option.
export const KIND_ORDER = [
  'place', 'restaurant', 'cafe', 'bar', 'court', 'park', 'beach', 'trail',
  'hotel', 'shop', 'activity',
]
