'use client'

// A small set of the app's own icons (2026-08-25) — replaces emoji in the
// Home Bar, Today's shortcut cards, and the Village widgets/sheet. Flat,
// single-color, currentColor-filled shapes at a fixed 18×18 viewBox, matching
// the minimal-line language Village's own FeatureIcon/DistrictIcon and
// Places' kindSpec glyphs already use elsewhere in this app — an emoji
// renders differently per platform and carries its own baked-in color and
// style; these don't.
export type IconName =
  | 'today' | 'personal' | 'village' | 'household' | 'places' | 'controls'
  | 'calendar' | 'plate' | 'heart' | 'box' | 'pin' | 'basket'

const PATHS: Record<IconName, React.ReactNode> = {
  // Sun — a circle with short rays, today's own mark.
  today: (
    <>
      <circle cx="9" cy="9" r="3.6" />
      <g strokeWidth="1.4" stroke="currentColor" strokeLinecap="round">
        <line x1="9" y1="1.6" x2="9" y2="3.4" />
        <line x1="9" y1="14.6" x2="9" y2="16.4" />
        <line x1="1.6" y1="9" x2="3.4" y2="9" />
        <line x1="14.6" y1="9" x2="16.4" y2="9" />
        <line x1="3.6" y1="3.6" x2="4.8" y2="4.8" />
        <line x1="13.2" y1="13.2" x2="14.4" y2="14.4" />
        <line x1="3.6" y1="14.4" x2="4.8" y2="13.2" />
        <line x1="13.2" y1="4.8" x2="14.4" y2="3.6" />
      </g>
    </>
  ),
  // A simple head-and-shoulders silhouette.
  personal: (
    <>
      <circle cx="9" cy="6" r="3" />
      <path d="M 3 16.5 Q 3 10.5 9 10.5 Q 15 10.5 15 16.5 Z" />
    </>
  ),
  // A small pine — the Village's own emblem, one triangular canopy over a
  // short trunk rather than the leaf FeatureIcon already uses elsewhere.
  village: (
    <>
      <path d="M 9 1.5 L 14 10 L 4 10 Z" />
      <path d="M 9 5.5 L 13 12.5 L 5 12.5 Z" />
      <rect x="7.7" y="12.5" width="2.6" height="4" />
    </>
  ),
  // A simple gable-roofed house — Home/Household's own mark.
  household: (
    <>
      <path d="M 9 2 L 16 8.5 L 14.4 8.5 L 14.4 16 L 3.6 16 L 3.6 8.5 L 2 8.5 Z" />
      <rect x="7.6" y="11" width="2.8" height="5" fill="var(--surface2)" />
    </>
  ),
  // A map pin.
  places: (
    <path d="M 9 1.5 C 12.6 1.5 15 4.1 15 7.3 C 15 11.4 9 16.5 9 16.5 C 9 16.5 3 11.4 3 7.3 C 3 4.1 5.4 1.5 9 1.5 Z M 9 9.6 A 2.3 2.3 0 1 0 9 5 A 2.3 2.3 0 0 0 9 9.6 Z" fillRule="evenodd" />
  ),
  // A lightning bolt — smart-home controls.
  controls: (
    <path d="M 10.2 1.5 L 3.6 10.5 L 8 10.5 L 7.2 16.5 L 14.4 7 L 9.8 7 Z" />
  ),
  // A small calendar grid.
  calendar: (
    <>
      <rect x="2.5" y="3.5" width="13" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <line x1="2.5" y1="7" x2="15.5" y2="7" stroke="currentColor" strokeWidth="1.4" />
      <line x1="6" y1="2" x2="6" y2="5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="12" y1="2" x2="12" y2="5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  // A plate + fork — tonight's dinner / meals.
  plate: (
    <>
      <circle cx="10" cy="9" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="10" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        <line x1="2.6" y1="3" x2="2.6" y2="8" />
        <line x1="2.6" y1="8" x2="2.6" y2="15.5" />
      </g>
    </>
  ),
  // An outlined heart — date ideas.
  heart: (
    <path d="M 9 15.5 C 9 15.5 2.5 11.2 2.5 6.8 C 2.5 4.3 4.4 2.5 6.6 2.5 C 7.9 2.5 8.6 3.2 9 3.8 C 9.4 3.2 10.1 2.5 11.4 2.5 C 13.6 2.5 15.5 4.3 15.5 6.8 C 15.5 11.2 9 15.5 9 15.5 Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
  ),
  // A small box — move-in / shipments.
  box: (
    <>
      <path d="M 2.5 6 L 9 3 L 15.5 6 L 9 9 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M 2.5 6 L 2.5 13 L 9 16 L 9 9 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" opacity="0.75" />
      <path d="M 15.5 6 L 15.5 13 L 9 16 L 9 9 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </>
  ),
  // A small filled pin — a quieter version of `places`, for inline use next
  // to text (e.g. "nearby" counts) rather than a standalone icon slot.
  pin: (
    <path d="M 9 2 C 11.8 2 14 4.2 14 7 C 14 10.5 9 15.5 9 15.5 C 9 15.5 4 10.5 4 7 C 4 4.2 6.2 2 9 2 Z M 9 9 A 2 2 0 1 0 9 5 A 2 2 0 0 0 9 9 Z" fillRule="evenodd" />
  ),
  // A laundry basket — chores.
  basket: (
    <>
      <path d="M 3 7 L 15 7 L 13.5 15.5 L 4.5 15.5 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <g stroke="currentColor" strokeWidth="1" opacity="0.75">
        <line x1="5" y1="7" x2="5.6" y2="15" />
        <line x1="9" y1="7" x2="9" y2="15" />
        <line x1="13" y1="7" x2="12.4" y2="15" />
      </g>
      <path d="M 6 7 C 6 4.5 7.3 3 9 3 C 10.7 3 12 4.5 12 7" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </>
  ),
}

export default function Icon({ name, size = 18, style }: { name: IconName; size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="currentColor" aria-hidden style={style}>
      {PATHS[name]}
    </svg>
  )
}
