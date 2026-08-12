// Small geo helpers — no dependency pulled in for a handful of formulas.

const EARTH_RADIUS_KM = 6371

/** Great-circle distance in kilometers. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** "2.3 km away" / "450 m away" — always relative to the point given. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`
  return `${km.toFixed(km < 10 ? 1 : 0)} km away`
}

export interface LngLatBounds {
  west: number
  south: number
  east: number
  north: number
}

/** Bounding box for a set of points, with a small padding factor so markers
 *  at the edge aren't flush against the viewport. Returns null for an empty
 *  or single-point set — callers fall back to a default center/zoom. */
export function boundsOf(points: { lat: number; lng: number }[], padding = 0.15): LngLatBounds | null {
  if (points.length === 0) return null
  let west = points[0].lng, east = points[0].lng
  let south = points[0].lat, north = points[0].lat
  for (const p of points) {
    if (p.lng < west) west = p.lng
    if (p.lng > east) east = p.lng
    if (p.lat < south) south = p.lat
    if (p.lat > north) north = p.lat
  }
  const lngPad = Math.max((east - west) * padding, 0.01)
  const latPad = Math.max((north - south) * padding, 0.01)
  return { west: west - lngPad, south: south - latPad, east: east + lngPad, north: north + latPad }
}
