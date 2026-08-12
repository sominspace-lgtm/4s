// Theme-matched MapLibre style (2026-08-12).
//
// This does NOT hand-author a vector-tile style from scratch — that means
// authoring paint for every OpenMapTiles layer (water, landcover, buildings,
// a dozen road classes, boundaries, labels...), which is a project of its own
// and would drift out of sync with the tile schema over time. Instead: fetch
// OpenFreeMap's hosted "Liberty" style JSON (free, no key, kept in sync with
// their tiles by them) once, cache it, and PATCH the handful of layers that
// carry the app's six themes — background, water, landcover/landuse,
// buildings, roads, boundaries, and label text/halo colors — by matching on
// layer id substrings that are stable across OpenMapTiles-derived styles.
// Everything else (fine road hierarchy, icons, zoom-dependent layout) stays
// exactly as OpenFreeMap ships it.
//
// If the fetch fails (no network, OpenFreeMap down), buildStyle() returns
// null and PlaceMap falls back to its "map unavailable" state rather than
// throwing — see the risk note in the implementation plan: OpenFreeMap has
// no SLA.

const BASE_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

let cachedBase: unknown | null = null
let cachedBasePromise: Promise<unknown | null> | null = null

async function loadBaseStyle(): Promise<unknown | null> {
  if (cachedBase) return cachedBase
  if (cachedBasePromise) return cachedBasePromise
  cachedBasePromise = fetch(BASE_STYLE_URL, { signal: AbortSignal.timeout(8000) })
    .then(r => (r.ok ? r.json() : null))
    .then(json => { cachedBase = json; return json })
    .catch(() => null)
  return cachedBasePromise
}

interface ThemeMapColors {
  bg: string
  water: string
  land: string
  building: string
  road: string
  boundary: string
  text: string
  textHalo: string
}

/** Reads the six CSS custom properties this needs straight from the
 *  document, so the map re-tints on every theme switch without a second
 *  source of truth for what each theme's colors are. */
export function readThemeMapColors(): ThemeMapColors {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return {
    bg: v('--bg', '#101010'),
    water: v('--surface2', '#1a1a1a'),
    land: v('--surface', '#161616'),
    building: v('--faint', 'rgba(255,255,255,0.06)'),
    road: v('--border', 'rgba(255,255,255,0.15)'),
    boundary: v('--border', 'rgba(255,255,255,0.15)'),
    text: v('--muted', 'rgba(255,255,255,0.7)'),
    textHalo: v('--bg', '#101010'),
  }
}

// Matched by substring against layer.id, most specific first where it
// matters. OpenMapTiles-derived styles (which Liberty is) are consistent
// about naming — "water", "landuse", "landcover", "building", "road",
// "bridge", "tunnel", "boundary", label layers containing "label" or "poi".
const LAYER_RULES: { test: (id: string) => boolean; paint: (c: ThemeMapColors) => Record<string, unknown> }[] = [
  { test: id => id === 'background', paint: c => ({ 'background-color': c.bg }) },
  { test: id => id.includes('water'), paint: c => ({ 'fill-color': c.water }) },
  { test: id => id.includes('landuse') || id.includes('landcover') || id.includes('park'), paint: c => ({ 'fill-color': c.land }) },
  { test: id => id.includes('building'), paint: c => ({ 'fill-color': c.building }) },
  { test: id => id.includes('boundary'), paint: c => ({ 'line-color': c.boundary }) },
  { test: id => (id.includes('road') || id.includes('bridge') || id.includes('tunnel') || id.includes('street')) && !id.includes('label'), paint: c => ({ 'line-color': c.road }) },
  { test: id => id.includes('label') || id.includes('poi') || id.includes('place'), paint: c => ({ 'text-color': c.text, 'text-halo-color': c.textHalo, 'text-halo-width': 1 }) },
]

interface MapLibreLayer {
  id: string
  type: string
  paint?: Record<string, unknown>
}

interface MapLibreStyle {
  layers: MapLibreLayer[]
  [key: string]: unknown
}

function patchStyle(base: MapLibreStyle, colors: ThemeMapColors): MapLibreStyle {
  const layers = base.layers.map(layer => {
    const rule = LAYER_RULES.find(r => r.test(layer.id))
    if (!rule) return layer
    return { ...layer, paint: { ...layer.paint, ...rule.paint(colors) } }
  })
  return { ...base, layers }
}

/** Returns a themed style JSON, or null if the base style couldn't be
 *  fetched. Call again on theme change — cheap after the first call, since
 *  the base style is cached and only the color patch is redone. */
export async function buildStyle(): Promise<MapLibreStyle | null> {
  const base = await loadBaseStyle()
  if (!base) return null
  return patchStyle(base as MapLibreStyle, readThemeMapColors())
}
