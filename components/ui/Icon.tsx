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
  // Added 2026-08-26 for the app-wide emoji sweep — one glyph per concept
  // an emoji used to stand in for, same flat single-color language as the
  // set above.
  | 'gear' | 'lock' | 'unlock' | 'bell' | 'bellOff' | 'thumbsUp' | 'thumbsDown'
  | 'shrug' | 'search' | 'scale' | 'mic' | 'sprout' | 'leaf' | 'tree' | 'crane'
  | 'moon' | 'cloud' | 'cloudSun' | 'rain' | 'snow' | 'storm' | 'fog' | 'fire'
  | 'lightbulb' | 'brain' | 'check' | 'plane' | 'bed' | 'camera' | 'link'
  | 'walk' | 'bag' | 'sparkle' | 'thumbtack' | 'eye' | 'eyeOff' | 'handshake'
  | 'party' | 'clipboard' | 'cake' | 'gamepad' | 'tv' | 'sunrise'

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
  // A gear — settings/customize buttons.
  gear: (
    <path d="M 9 6.2 A 2.8 2.8 0 1 0 9 11.8 A 2.8 2.8 0 0 0 9 6.2 Z M 9 1.5 L 9.9 3.4 L 8.1 3.4 Z M 9 16.5 L 8.1 14.6 L 9.9 14.6 Z M 1.5 9 L 3.4 8.1 L 3.4 9.9 Z M 16.5 9 L 14.6 9.9 L 14.6 8.1 Z M 3.4 3.4 L 5 4.4 L 4.4 5 Z M 14.6 14.6 L 13 13.6 L 13.6 13 Z M 14.6 3.4 L 13.6 5 L 13 4.4 Z M 3.4 14.6 L 4.4 13 L 5 13.6 Z" fillRule="evenodd" />
  ),
  // A padlock, shackle closed.
  lock: (
    <>
      <rect x="4" y="8" width="10" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M 6 8 L 6 5.5 Q 6 2.5 9 2.5 Q 12 2.5 12 5.5 L 12 8" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="9" cy="11.6" r="1.2" />
    </>
  ),
  // Same padlock, shackle open — unlocked.
  unlock: (
    <>
      <rect x="4" y="8" width="10" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M 6 8 L 6 5.5 Q 6 2.5 9 2.5 Q 12 2.5 12 5.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="9" cy="11.6" r="1.2" />
    </>
  ),
  // A bell.
  bell: (
    <path d="M 9 2.2 C 6.8 2.2 5.5 4 5.5 6.3 C 5.5 10 4 11 4 11.8 L 14 11.8 C 14 11 12.5 10 12.5 6.3 C 12.5 4 11.2 2.2 9 2.2 Z M 7.4 13.5 A 1.6 1.6 0 0 0 10.6 13.5 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  ),
  // Bell with a slash through it — muted/off.
  bellOff: (
    <>
      <path d="M 9 2.2 C 6.8 2.2 5.5 4 5.5 6.3 C 5.5 10 4 11 4 11.8 L 14 11.8 C 14 11 12.5 10 12.5 6.3 C 12.5 4 11.2 2.2 9 2.2 Z M 7.4 13.5 A 1.6 1.6 0 0 0 10.6 13.5 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" opacity="0.55" />
      <line x1="3" y1="15.5" x2="15" y2="2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  // Thumb, pointing up — approve.
  thumbsUp: (
    <path d="M 4 8 L 6.5 8 L 6.5 15.5 L 4 15.5 Z M 7.5 8 L 10.5 3 C 11.3 3 12 3.7 12 4.6 L 11.3 8 L 14.3 8 C 15 8 15.5 8.7 15.3 9.4 L 13.9 14.4 C 13.7 15.1 13.1 15.5 12.4 15.5 L 7.5 15.5 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  ),
  // Same shape, flipped — disapprove.
  thumbsDown: (
    <path d="M 4 10 L 6.5 10 L 6.5 2.5 L 4 2.5 Z M 7.5 10 L 10.5 15 C 11.3 15 12 14.3 12 13.4 L 11.3 10 L 14.3 10 C 15 10 15.5 9.3 15.3 8.6 L 13.9 3.6 C 13.7 2.9 13.1 2.5 12.4 2.5 L 7.5 2.5 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  ),
  // A shrug — small person with raised arms, "not sure either way".
  shrug: (
    <>
      <circle cx="9" cy="4.4" r="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M 5 15.5 C 5 15.5 4.5 9.5 6.5 8.5 C 7.3 8.1 8.2 8 9 8 C 9.8 8 10.7 8.1 11.5 8.5 C 13.5 9.5 13 15.5 13 15.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 6.5 8.5 L 3 11 M 11.5 8.5 L 15 11" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  // A magnifying glass.
  search: (
    <>
      <circle cx="7.8" cy="7.8" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="11.2" y1="11.2" x2="15.5" y2="15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  // A balance scale.
  scale: (
    <>
      <line x1="9" y1="2.5" x2="9" y2="14.5" stroke="currentColor" strokeWidth="1.3" />
      <line x1="3" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M 3 5 L 1.2 9 A 2.2 2.2 0 0 0 4.8 9 Z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M 15 5 L 13.2 9 A 2.2 2.2 0 0 0 16.8 9 Z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <rect x="6" y="14.5" width="6" height="1.6" rx="0.5" />
    </>
  ),
  // A microphone.
  mic: (
    <>
      <rect x="7" y="2.2" width="4" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M 4.5 8.5 C 4.5 11.5 6.5 13.3 9 13.3 C 11.5 13.3 13.5 11.5 13.5 8.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="9" y1="13.3" x2="9" y2="16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  // A single sprout — the earliest growth stage.
  sprout: (
    <>
      <path d="M 9 16 L 9 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 9 11 C 9 8 6.5 7 4.5 7 C 4.5 9.5 6.5 11 9 11 Z" />
      <path d="M 9 9.5 C 9 6.8 11 5.8 12.8 5.8 C 12.8 8.2 11 9.5 9 9.5 Z" opacity="0.75" />
    </>
  ),
  // Two leaves — a step further along than sprout.
  leaf: (
    <>
      <path d="M 9 16 L 9 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 9 10.5 C 9 6.8 5.8 5.5 3.2 5.5 C 3.2 9 6 10.5 9 10.5 Z" />
      <path d="M 9 8.5 C 9 5.2 12 4 14.5 4 C 14.5 7.2 12 8.5 9 8.5 Z" opacity="0.75" />
    </>
  ),
  // A small canopy tree — full growth.
  tree: (
    <>
      <rect x="8" y="11" width="2" height="5.5" opacity="0.8" />
      <circle cx="9" cy="7.5" r="5.3" />
    </>
  ),
  // A construction crane.
  crane: (
    <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <line x1="4" y1="16" x2="4" y2="2.5" />
      <line x1="2.5" y1="2.5" x2="13" y2="2.5" />
      <line x1="2.5" y1="4.5" x2="6" y2="2.5" />
      <line x1="11" y1="2.5" x2="11" y2="7" />
      <line x1="1.5" y1="16" x2="6.5" y2="16" />
    </g>
  ),
  // A crescent moon.
  moon: (
    <path d="M 12.5 2.5 C 8.5 2.5 5.3 5.7 5.3 9.7 C 5.3 13.7 8.5 16.5 12.2 15.9 C 9.5 14.7 7.7 12.4 7.7 9.5 C 7.7 6.5 9.7 4 12.5 2.5 Z" />
  ),
  // A single cloud.
  cloud: (
    <path d="M 5.5 13 C 3.6 13 2.2 11.6 2.2 9.8 C 2.2 8.1 3.5 6.7 5.2 6.6 C 5.7 4.6 7.5 3.2 9.6 3.2 C 12.1 3.2 14.1 5.2 14.1 7.7 C 14.1 7.8 14.1 7.9 14.1 8 C 15.3 8.4 16.1 9.5 16.1 10.8 C 16.1 12.1 15 13 13.7 13 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  ),
  // Sun peeking behind a cloud — partly cloudy.
  cloudSun: (
    <>
      <g strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.85">
        <circle cx="12" cy="5.5" r="2.4" fill="none" />
        <line x1="12" y1="1" x2="12" y2="2.1" />
        <line x1="15.7" y1="5.5" x2="16.8" y2="5.5" />
        <line x1="14.6" y1="3.1" x2="15.3" y2="2.4" />
      </g>
      <path d="M 5 14.5 C 3.1 14.5 1.7 13.1 1.7 11.3 C 1.7 9.6 3 8.2 4.7 8.1 C 5.2 6.1 7 4.7 9.1 4.7 C 11.6 4.7 13.6 6.7 13.6 9.2 C 13.6 9.3 13.6 9.4 13.6 9.5 C 14.8 9.9 15.6 11 15.6 12.3 C 15.6 13.6 14.5 14.5 13.2 14.5 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </>
  ),
  // A cloud with rain drops.
  rain: (
    <>
      <path d="M 5.5 10.5 C 3.6 10.5 2.2 9.1 2.2 7.3 C 2.2 5.6 3.5 4.2 5.2 4.1 C 5.7 2.1 7.5 0.7 9.6 0.7 C 12.1 0.7 14.1 2.7 14.1 5.2 C 14.1 5.3 14.1 5.4 14.1 5.5 C 15.3 5.9 16.1 7 16.1 8.3 C 16.1 9.6 15 10.5 13.7 10.5 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        <line x1="5.5" y1="13" x2="4.7" y2="15.5" />
        <line x1="9.2" y1="13" x2="8.4" y2="15.5" />
        <line x1="12.9" y1="13" x2="12.1" y2="15.5" />
      </g>
    </>
  ),
  // A cloud with a snowflake.
  snow: (
    <>
      <path d="M 5.5 9.5 C 3.6 9.5 2.2 8.1 2.2 6.3 C 2.2 4.6 3.5 3.2 5.2 3.1 C 5.7 1.1 7.5 -0.3 9.6 -0.3 C 12.1 -0.3 14.1 1.7 14.1 4.2 C 14.1 4.3 14.1 4.4 14.1 4.5 C 15.3 4.9 16.1 6 16.1 7.3 C 16.1 8.6 15 9.5 13.7 9.5 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" transform="translate(0 3)" />
      <g stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
        <line x1="9" y1="12.5" x2="9" y2="16.5" />
        <line x1="7.1" y1="13.5" x2="10.9" y2="15.5" />
        <line x1="10.9" y1="13.5" x2="7.1" y2="15.5" />
      </g>
    </>
  ),
  // A cloud with a lightning bolt — storm.
  storm: (
    <>
      <path d="M 5.5 9.5 C 3.6 9.5 2.2 8.1 2.2 6.3 C 2.2 4.6 3.5 3.2 5.2 3.1 C 5.7 1.1 7.5 -0.3 9.6 -0.3 C 12.1 -0.3 14.1 1.7 14.1 4.2 C 14.1 4.3 14.1 4.4 14.1 4.5 C 15.3 4.9 16.1 6 16.1 7.3 C 16.1 8.6 15 9.5 13.7 9.5 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" transform="translate(0 3)" />
      <path d="M 10.5 12.5 L 7.5 16.5 L 9.3 16.5 L 8.2 19 L 11.5 14.5 L 9.6 14.5 Z" transform="translate(0 -3.5)" />
    </>
  ),
  // A cloud with horizontal fog lines beneath it.
  fog: (
    <>
      <path d="M 5.5 8 C 3.6 8 2.2 6.6 2.2 4.8 C 2.2 3.1 3.5 1.7 5.2 1.6 C 5.7 -0.4 7.5 -1.8 9.6 -1.8 C 12.1 -1.8 14.1 0.2 14.1 2.7 C 14.1 2.8 14.1 2.9 14.1 3 C 15.3 3.4 16.1 4.5 16.1 5.8 C 16.1 7.1 15 8 13.7 8 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" transform="translate(0 3.8)" />
      <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.8">
        <line x1="2.5" y1="13" x2="15.5" y2="13" />
        <line x1="4" y1="16" x2="14" y2="16" />
      </g>
    </>
  ),
  // A flame.
  fire: (
    <path d="M 9 1.5 C 9 4 6.5 5 6.5 8 C 6.5 9 7 9.8 7.7 10.3 C 7.3 9.6 7.3 8.7 7.8 8 C 8 9.5 9.5 9.8 9.5 11.3 C 9.5 10.9 9.7 10.5 10 10.2 C 10.2 11 11 11.2 11 12.5 C 11 14.4 9.5 16.5 7 16.5 C 4.2 16.5 2.5 14.2 2.5 11.5 C 2.5 7.5 6 6.5 9 1.5 Z" opacity="0.9" />
  ),
  // A lightbulb.
  lightbulb: (
    <>
      <path d="M 9 2.5 C 6.2 2.5 4 4.7 4 7.5 C 4 9.4 5 10.7 6 11.7 C 6.5 12.2 6.8 12.8 6.8 13.4 L 11.2 13.4 C 11.2 12.8 11.5 12.2 12 11.7 C 13 10.7 14 9.4 14 7.5 C 14 4.7 11.8 2.5 9 2.5 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <line x1="7" y1="15.5" x2="11" y2="15.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  // A brain, simplified to two lobes.
  brain: (
    <path d="M 6.8 3 C 4.8 3 3.2 4.6 3.2 6.5 C 2.4 6.9 1.8 7.7 1.8 8.7 C 1.8 9.7 2.4 10.5 3.2 10.9 C 3.2 12.8 4.8 14.3 6.7 14.3 C 7.5 14.3 8.2 14 8.7 13.5 L 8.7 4 C 8.2 3.4 7.5 3 6.8 3 Z M 11.2 3 C 13.2 3 14.8 4.6 14.8 6.5 C 15.6 6.9 16.2 7.7 16.2 8.7 C 16.2 9.7 15.6 10.5 14.8 10.9 C 14.8 12.8 13.2 14.3 11.3 14.3 C 10.5 14.3 9.8 14 9.3 13.5 L 9.3 4 C 9.8 3.4 10.5 3 11.2 3 Z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
  ),
  // A checkmark, for standalone "done" use outside a text run.
  check: (
    <path d="M 3 9.5 L 7 13.5 L 15 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  // A small airplane.
  plane: (
    <path d="M 9 1.5 L 10.3 6.5 L 16 8.8 L 16 10.3 L 10.3 9.3 L 9.6 13.5 L 11.5 15 L 11.5 16.2 L 9 15.4 L 6.5 16.2 L 6.5 15 L 8.4 13.5 L 7.7 9.3 L 2 10.3 L 2 8.8 L 7.7 6.5 Z" />
  ),
  // A simple bed — lodging/nights.
  bed: (
    <>
      <path d="M 2 15.5 L 2 8 C 2 7.4 2.4 7 3 7 L 15 7 C 15.6 7 16 7.4 16 8 L 16 15.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <line x1="2" y1="12.5" x2="16" y2="12.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="3.2" y="8.3" width="4.2" height="2.6" rx="0.8" opacity="0.75" />
      <line x1="2" y1="15.5" x2="2" y2="17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="16" y1="15.5" x2="16" y2="17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  // A camera.
  camera: (
    <>
      <path d="M 2.5 6.5 C 2.5 5.9 3 5.5 3.5 5.5 L 6 5.5 L 6.8 4 L 11.2 4 L 12 5.5 L 14.5 5.5 C 15 5.5 15.5 5.9 15.5 6.5 L 15.5 13.5 C 15.5 14.1 15 14.5 14.5 14.5 L 3.5 14.5 C 3 14.5 2.5 14.1 2.5 13.5 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="9" cy="10" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </>
  ),
  // A chain link.
  link: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M 7.5 10.5 L 10.5 7.5" />
      <path d="M 8.5 5.5 L 10 4 C 11.4 2.6 13.6 2.6 15 4 C 16.4 5.4 16.4 7.6 15 9 L 13.5 10.5" />
      <path d="M 9.5 12.5 L 8 14 C 6.6 15.4 4.4 15.4 3 14 C 1.6 12.6 1.6 10.4 3 9 L 4.5 7.5" />
    </g>
  ),
  // A walking figure.
  walk: (
    <>
      <circle cx="10" cy="3" r="1.6" />
      <path d="M 8 5 L 11.5 6 L 10.5 9.5 L 12.5 12 L 12 15.5 L 10.3 15.5 L 10.5 12.3 L 8.3 10 L 6 12.5 L 4.7 15.2 L 3.2 14.5 L 5 10.5 L 8.3 7.3 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.4" strokeLinejoin="round" />
    </>
  ),
  // A shopping bag.
  bag: (
    <>
      <path d="M 3.5 6.5 L 14.5 6.5 L 13.6 15.5 L 4.4 15.5 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M 6 6.5 C 6 4.3 7.3 3 9 3 C 10.7 3 12 4.3 12 6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </>
  ),
  // A four-point sparkle.
  sparkle: (
    <path d="M 9 1.5 C 9.3 5.2 9.8 6.7 12.5 7.5 C 9.8 8.3 9.3 9.8 9 13.5 C 8.7 9.8 8.2 8.3 5.5 7.5 C 8.2 6.7 8.7 5.2 9 1.5 Z M 14.2 10.5 C 14.4 12.2 14.6 12.9 15.8 13.2 C 14.6 13.5 14.4 14.2 14.2 15.9 C 14 14.2 13.8 13.5 12.6 13.2 C 13.8 12.9 14 12.2 14.2 10.5 Z" />
  ),
  // A pushpin — "pinned" as in stuck to a board, distinct from `pin`'s map marker.
  thumbtack: (
    <path d="M 11 2 L 15 6 L 12.2 8.8 L 12.2 11.5 L 9.5 14.2 L 7 11.7 L 3 15.7 L 2.3 15 L 6.3 11 L 3.8 8.5 L 6.5 5.8 L 9.2 5.8 Z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
  ),
  // An open eye — visible/shown.
  eye: (
    <>
      <path d="M 1.5 9 C 1.5 9 4.5 4 9 4 C 13.5 4 16.5 9 16.5 9 C 16.5 9 13.5 14 9 14 C 4.5 14 1.5 9 1.5 9 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="9" cy="9" r="2.3" />
    </>
  ),
  // Same eye with a slash — hidden.
  eyeOff: (
    <>
      <path d="M 1.5 9 C 1.5 9 4.5 4 9 4 C 13.5 4 16.5 9 16.5 9 C 16.5 9 13.5 14 9 14 C 4.5 14 1.5 9 1.5 9 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" opacity="0.55" />
      <circle cx="9" cy="9" r="2.3" opacity="0.55" />
      <line x1="2.5" y1="15" x2="15.5" y2="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  // Two clasped hands.
  handshake: (
    <path d="M 1.5 8 L 4.5 5.5 L 7.5 8 L 9 6.5 L 10.5 8 L 13.5 5.5 L 16.5 8 L 13.5 11 L 12 9.6 L 10.5 11 L 7.5 11 L 6 9.6 L 4.5 11 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  ),
  // Confetti/celebration.
  party: (
    <g>
      <path d="M 3 15.5 L 6 8.5 L 9.5 12 Z" />
      <circle cx="12.5" cy="4" r="1.1" opacity="0.8" />
      <circle cx="15.5" cy="8" r="0.9" opacity="0.8" />
      <circle cx="10.5" cy="2.5" r="0.8" opacity="0.8" />
      <rect x="13.5" y="11.5" width="1.8" height="1.8" transform="rotate(20 14.4 12.4)" opacity="0.8" />
    </g>
  ),
  // A clipboard.
  clipboard: (
    <>
      <rect x="3.5" y="3.5" width="11" height="12.5" rx="1.3" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <rect x="6.5" y="2" width="5" height="2.6" rx="0.8" />
      <line x1="6" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="6" y1="11" x2="12" y2="11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </>
  ),
  // A slice of cake with a candle — birthday.
  cake: (
    <>
      <path d="M 3 16 L 3 10.5 L 15 10.5 L 15 16 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M 3 13 C 4.5 12 5.5 14 7 13 C 8.5 12 9.5 14 11 13 C 12.5 12 13.5 14 15 13" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <line x1="9" y1="10.5" x2="9" y2="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M 9 3.5 C 10 4.5 10 5.5 9 6.5 C 8 5.5 8 4.5 9 3.5 Z" />
    </>
  ),
  // A game controller.
  gamepad: (
    <path d="M 5 6.5 L 13 6.5 C 15 6.5 16.2 8.6 15.6 10.5 L 15 12.5 C 14.6 13.8 13 14.1 12.1 13.1 L 10.8 11.5 L 7.2 11.5 L 5.9 13.1 C 5 14.1 3.4 13.8 3 12.5 L 2.4 10.5 C 1.8 8.6 3 6.5 5 6.5 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  ),
  // A sun rising over the horizon — breakfast/morning.
  sunrise: (
    <>
      <line x1="2" y1="12.5" x2="16" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 4.5 12.5 A 4.5 4.5 0 0 1 13.5 12.5 Z" />
      <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        <line x1="9" y1="2" x2="9" y2="3.6" />
        <line x1="3.5" y1="5" x2="4.6" y2="6.1" />
        <line x1="14.5" y1="5" x2="13.4" y2="6.1" />
      </g>
    </>
  ),
  // A TV.
  tv: (
    <>
      <rect x="2" y="4" width="14" height="9.5" rx="1.3" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <line x1="6" y1="16" x2="12" y2="16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
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
