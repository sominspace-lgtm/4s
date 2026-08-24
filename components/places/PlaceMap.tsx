'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { buildStyle } from '@/lib/map/style'
import { kindSpec } from '@/lib/constants/placeKinds'
import { boundsOf } from '@/lib/utils/geo'
import MapControls from '@/components/places/MapControls'
import type { Place } from '@/lib/hooks/usePlaces'

// Imported only through next/dynamic({ ssr: false }) from PlacesHub —
// maplibre-gl touches `window` at module scope and hard-fails SSR, and the
// dynamic boundary keeps its ~230KB gzipped out of the dashboard's shared
// chunk (see the implementation plan, §5.3).
//
// Clustering is MapLibre's built-in GeoJSON source clustering — no extra
// dependency. Points are colored by kind via a MapLibre `match` expression
// fed straight from lib/constants/placeKinds.ts, so adding a kind there is
// the only thing a new marker color needs.
export default function PlaceMap({ places, theme, onSelect }: {
  places: Place[] // must all have lat/lng — filter before passing in
  theme: string
  onSelect: (place: Place) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const placesRef = useRef(places)
  useEffect(() => { placesRef.current = places })
  const [ready, setReady] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  // Bumped by the "Try again" button on the unavailable fallback — remounts
  // the map from scratch, giving a fresh loadBaseStyle() attempt a real
  // chance instead of replaying whatever the first attempt returned.
  const [retryTick, setRetryTick] = useState(0)
  // Mirrors mapRef, purely so MapControls (rendered from JSX) can react to
  // the map becoming available — reading mapRef.current directly in render
  // is a ref-during-render violation, since a ref update never re-triggers
  // a render on its own.
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)

  // Mount once.
  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false
    setUnavailable(false)
    setReady(false)

    ;(async () => {
      const style = await buildStyle()
      if (cancelled) return
      if (!style) { setUnavailable(true); return }

      const bounds = boundsOf(placesRef.current.map(p => ({ lat: p.lat!, lng: p.lng! })))
      const map = new maplibregl.Map({
        container: containerRef.current!,
        style: style as unknown as maplibregl.StyleSpecification,
        center: bounds ? [(bounds.west + bounds.east) / 2, (bounds.south + bounds.north) / 2] : [0, 20],
        zoom: bounds ? 11 : 1.5,
      })
      // Belt and suspenders: if the style never finishes loading (OpenFreeMap
      // hangs instead of erroring, a style/sprite request stalls, whatever)
      // the map was previously stuck showing a blank box forever with no
      // explanation. 12s is generous; past that, fail honest instead of
      // failing silent.
      const loadTimeout = setTimeout(() => { if (!cancelled) setUnavailable(true) }, 12_000)
      map.on('error', () => { clearTimeout(loadTimeout); setUnavailable(true) })
      // Ready when the STYLE itself is parsed and applied — not 'load',
      // which waits for the FULL map (every tile the current viewport
      // touches) and can hang indefinitely on one stalled/rate-limited tile
      // request even though the map is already visually usable and the
      // style has long since been ready to accept our own source/layers.
      // That hang was the actual cause of "map shows but pins don't" — the
      // base map paints from tiles that did arrive, while our own
      // addSource/addLayer code sat forever behind a 'load' that never came.
      //
      // Checking isStyleLoaded() first (2026-08-24, second fix) rather than
      // only listening for 'style.load' — the style here is a pre-built
      // object, not a URL, so MapLibre can finish applying it synchronously
      // inside the Map constructor itself. If that happens, 'style.load'
      // fires and is gone before this next line even runs, and a bare
      // `.on('style.load', ...)` would then wait forever for an event that
      // already happened — the same class of "waiting on something already
      // missed" bug as the 'load' hang, just at construction time instead
      // of tile-load time.
      function onStyleReady() {
        clearTimeout(loadTimeout)
        if (bounds) map.fitBounds([[bounds.west, bounds.south], [bounds.east, bounds.north]], { padding: 40, duration: 0 })
        setReady(true)
        setMapInstance(map)
      }
      if (map.isStyleLoaded()) onStyleReady()
      else map.once('style.load', onStyleReady)
      mapRef.current = map
    })()

    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; setMapInstance(null) }
    // Re-runs only on retryTick (manual "Try again" after a failure) — theme
    // changes re-style below rather than remounting the whole map (that
    // would reset the user's pan/zoom).
  }, [retryTick])

  // Re-tint on theme change without remounting or losing camera position.
  useEffect(() => {
    if (!mapRef.current) return
    let cancelled = false
    buildStyle().then(style => {
      if (cancelled || !style || !mapRef.current) return
      mapRef.current.setStyle(style as unknown as maplibregl.StyleSpecification)
    })
    return () => { cancelled = true }
  }, [theme])

  // Data + click handling — set up once the map has loaded, refreshed
  // whenever the place list changes.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: places.map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng!, p.lat!] },
        properties: { id: p.id, kind: p.kind },
      })),
    }

    const sourceId = 'places'
    const existing = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined
    if (existing) {
      existing.setData(geojson)
      return
    }

    // No clustering (2026-08-24 fix) — this is a personal pin collection,
    // not a dataset with thousands of points; clustering a handful of pins
    // just hides most of them behind an unlabeled circle the moment two are
    // near each other, which read as "pins are missing" (only a
    // geographically isolated pin ever showed as itself). Every pin now
    // renders as its own visible, colored, clickable point.
    map.addSource(sourceId, { type: 'geojson', data: geojson })

    const kindColors = Object.entries(placeKindColorPairs()).flat()
    map.addLayer({
      id: 'places-points', type: 'circle', source: sourceId,
      paint: {
        // The spread of a variable-length kindColors array produces a tuple
        // TS can't line up against maplibre's `match` overloads directly
        // (its arity is fixed per overload, ours is dynamic) — going through
        // `unknown` first is what the compiler itself suggests for this case.
        'circle-color': kindColors.length
          ? (['match', ['get', 'kind'], ...kindColors, readCssColor('--gold')] as unknown as maplibregl.ExpressionSpecification)
          : readCssColor('--gold'),
        'circle-radius': 6, 'circle-stroke-width': 1.5, 'circle-stroke-color': readCssColor('--bg'),
      },
    })

    map.on('click', 'places-points', e => {
      const id = e.features?.[0]?.properties?.id as string | undefined
      const place = placesRef.current.find(p => p.id === id)
      if (place) onSelect(place)
    })
    map.on('mouseenter', 'places-points', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'places-points', () => { map.getCanvas().style.cursor = '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, ready])

  if (unavailable) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
        height: '100%', minHeight: '260px', background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        color: 'var(--muted)', fontSize: '0.78rem', textAlign: 'center', padding: '1.5rem',
      }}>
        <span>Map unavailable right now — your pins are still here, see them in the list below.</span>
        <button onClick={() => setRetryTick(t => t + 1)} className="btn btn-ghost press" style={{ fontSize: '0.72rem' }}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="places-map" style={{ position: 'relative', height: '100%', minHeight: '260px', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {mapInstance && <MapControls map={mapInstance} places={places} />}
    </div>
  )
}

// Same bug and same fix as lib/map/style.ts's resolveColor(): a CSS custom
// property never resolves through getComputedStyle() the way a real
// property does, so a custom theme's color-mix(...) vars reached MapLibre
// as a literal string it can't parse. A canvas 2D context always
// rasterizes to literal 0-255 RGBA regardless of input syntax — the only
// version-proof way to turn ANY valid CSS color into one MapLibre accepts.
function readCssColor(varName: string): string {
  if (typeof document === 'undefined') return '#888'
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  if (!raw) return '#888'
  const canvas = document.createElement('canvas')
  canvas.width = 1; canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return raw
  ctx.fillStyle = raw
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
}

function placeKindColorPairs(): Record<string, string> {
  // A cheap subset: only kinds that appear get resolved, MapLibre's `match`
  // just needs valid pairs. Reading from PLACE_KINDS keeps one source of
  // truth between the sheet icon color and the map marker color.
  const out: Record<string, string> = {}
  for (const kind of ['place', 'restaurant', 'cafe', 'bar', 'court', 'park', 'beach', 'trail', 'hotel', 'shop', 'activity']) {
    out[kind] = readCssColor(kindSpec(kind).color)
  }
  return out
}
