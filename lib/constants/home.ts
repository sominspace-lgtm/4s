// Where "home" is, for distance sorting and the auto-"nearby" tag on pins
// (2026-09-09). One hardcoded couple, one address — this is the same coord
// lib/village/weather.ts uses for the weather widget, lifted here so both
// read one value. A user-editable home would live in the travel_prefs
// table (home_lat/home_lng columns exist), but nothing wires that yet.
export const HOME_COORD = { lat: 37.485938, lng: -122.218869 }

/** A pin within this many km of home counts as "nearby". ~5 miles. */
export const NEARBY_KM = 8
