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
  // Mirrors mapRef, purely so MapControls (rendered from JSX) can react to
  // the map becoming available — reading mapRef.current directly in render
  // is a ref-during-render violation, since a ref update never re-triggers
  // a render on its own.
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)

  // Mount once.
  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

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
      map.on('error', () => setUnavailable(true))
      map.on('load', () => {
        if (bounds) map.fitBounds([[bounds.west, bounds.south], [bounds.east, bounds.north]], { padding: 40, duration: 0 })
        setReady(true)
        setMapInstance(map)
      })
      mapRef.current = map
    })()

    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; setMapInstance(null) }
    // Intentionally mount-once: theme changes re-style below rather than
    // remounting the whole map (that would reset the user's pan/zoom).
  }, [])

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

    map.addSource(sourceId, { type: 'geojson', data: geojson, cluster: true, clusterRadius: 50 })

    map.addLayer({
      id: 'places-clusters', type: 'circle', source: sourceId, filter: ['has', 'point_count'],
      paint: {
        'circle-color': readCssColor('--surface2'),
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 25, 26],
        'circle-stroke-width': 1.5, 'circle-stroke-color': readCssColor('--border'),
      },
    })
    map.addLayer({
      id: 'places-cluster-count', type: 'symbol', source: sourceId, filter: ['has', 'point_count'],
      layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 11 },
      paint: { 'text-color': readCssColor('--text') },
    })

    const kindColors = Object.entries(placeKindColorPairs()).flat()
    map.addLayer({
      id: 'places-points', type: 'circle', source: sourceId, filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': kindColors.length
          ? (['match', ['get', 'kind'], ...kindColors, readCssColor('--gold')] as maplibregl.ExpressionSpecification)
          : readCssColor('--gold'),
        'circle-radius': 6, 'circle-stroke-width': 1.5, 'circle-stroke-color': readCssColor('--bg'),
      },
    })

    map.on('click', 'places-points', e => {
      const id = e.features?.[0]?.properties?.id as string | undefined
      const place = placesRef.current.find(p => p.id === id)
      if (place) onSelect(place)
    })
    map.on('click', 'places-clusters', e => {
      const feature = e.features?.[0]
      const clusterId = feature?.properties?.cluster_id
      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource
      if (clusterId == null) return
      source.getClusterExpansionZoom(clusterId).then(zoom => {
        const coords = (feature!.geometry as GeoJSON.Point).coordinates as [number, number]
        map.easeTo({ center: coords, zoom })
      })
    })
    map.on('mouseenter', 'places-points', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'places-points', () => { map.getCanvas().style.cursor = '' })
    map.on('mouseenter', 'places-clusters', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'places-clusters', () => { map.getCanvas().style.cursor = '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, ready])

  if (unavailable) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', minHeight: '260px', background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        color: 'var(--muted)', fontSize: '0.78rem', textAlign: 'center', padding: '1.5rem',
      }}>
        Map unavailable right now — your pins are still here, see them in the list below.
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

function readCssColor(varName: string): string {
  if (typeof document === 'undefined') return '#888'
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#888'
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
