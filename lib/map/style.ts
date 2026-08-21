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

// A CSS custom property is never resolved by getComputedStyle() the way a
// real property is — it hands back the literal token string that was
// stored, not what the browser would actually paint. Every preset theme's
// vars are plain hex/rgba, which happen to already BE valid color syntax, so
// this bug was invisible until the 2026-08-21 custom-theme work started
// setting --surface2/--border/etc. to color-mix(...) expressions. MapLibre
// validates paint colors against its own style spec, which has no idea what
// color-mix() is — so a custom theme silently produced an invalid style,
// and the map fell straight to its "Map unavailable" state on every load.
//
// Fixed via a 1×1 canvas rather than assigning to a real DOM property:
// tried that first, but a browser resolving color-mix() through
// getComputedStyle() doesn't necessarily hand back classic rgb()/rgba()
// either — Chromium's own resolution came back as the newer CSS Color 4
// color(srgb ...) function, which MapLibre almost certainly can't parse any
// better than color-mix() itself. Canvas's 2D context always rasterizes to
// literal 0-255 RGBA channels regardless of input syntax, so reading them
// back via getImageData and building the string by hand is the only
// version-proof way to get a color MapLibre is guaranteed to accept.
function resolveColor(raw: string): string {
  if (!raw || typeof document === 'undefined') return raw
  const canvas = document.createElement('canvas')
  canvas.width = 1; canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return raw
  ctx.fillStyle = raw
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
}

/** Reads the six CSS custom properties this needs straight from the
 *  document, so the map re-tints on every theme switch without a second
 *  source of truth for what each theme's colors are. */
export function readThemeMapColors(): ThemeMapColors {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => resolveColor(css.getPropertyValue(name).trim()) || fallback
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

// Matched by substring against layer.id AND layer.type, most specific
// first where it matters. The type check is load-bearing, not decoration:
// Liberty has layers whose id matches a rule's substring but whose type
// takes a different paint property — road_one_way_arrow and road_shield_us
// are 'symbol' layers (not 'line'), building-3d is 'fill-extrusion' (not
// 'fill'), and label layers like water_name_point_label are 'symbol' but
// contain "water". Setting line-color on a symbol layer or fill-color on a
// fill-extrusion layer is an invalid paint property for that layer type —
// MapLibre rejects the whole style as invalid when that happens, which is
// what was producing "Map unavailable" (confirmed against Liberty's actual
// 111 layers: 7 of them hit exactly this mismatch). Anything a rule's type
// check doesn't cover — those arrow/shield icons — just keeps Liberty's
// own default styling rather than getting force-patched incorrectly.
const LAYER_RULES: { test: (id: string, type: string) => boolean; paint: (c: ThemeMapColors) => Record<string, unknown> }[] = [
  { test: (id, type) => id === 'background' && type === 'background', paint: c => ({ 'background-color': c.bg }) },
  { test: (id, type) => id.includes('water') && type === 'fill', paint: c => ({ 'fill-color': c.water }) },
  { test: (id, type) => (id.includes('landuse') || id.includes('landcover') || id.includes('park')) && type === 'fill', paint: c => ({ 'fill-color': c.land }) },
  { test: (id, type) => id.includes('building') && type === 'fill', paint: c => ({ 'fill-color': c.building }) },
  { test: (id, type) => id.includes('building') && type === 'fill-extrusion', paint: c => ({ 'fill-extrusion-color': c.building }) },
  { test: (id, type) => id.includes('boundary') && type === 'line', paint: c => ({ 'line-color': c.boundary }) },
  { test: (id, type) => (id.includes('road') || id.includes('bridge') || id.includes('tunnel') || id.includes('street')) && !id.includes('label') && type === 'line', paint: c => ({ 'line-color': c.road }) },
  { test: (id, type) => (id.includes('label') || id.includes('poi') || id.includes('place')) && type === 'symbol', paint: c => ({ 'text-color': c.text, 'text-halo-color': c.textHalo, 'text-halo-width': 1 }) },
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
    const rule = LAYER_RULES.find(r => r.test(layer.id, layer.type))
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
