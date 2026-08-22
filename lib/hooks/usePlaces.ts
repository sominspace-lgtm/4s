'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadPlacePhoto, deletePlacePhoto } from '@/lib/storage/placePhotos'

export type PlaceStatus = 'idea' | 'hmm' | 'good' | 'bad' | 'archived'
export type PlaceProvenanceSource = 'user' | 'lookup' | 'ai'

export interface Place {
  id: string
  user_id: string
  space_id: string | null
  name: string
  kind: string
  note: string | null
  address: string | null
  city: string | null
  country: string | null
  lat: number | null
  lng: number | null
  provider: 'osm' | 'google' | null
  provider_place_id: string | null
  verified_at: string | null
  maps_url: string | null
  status: PlaceStatus
  tags: string[]
  details: Record<string, unknown>
  provenance: Record<string, PlaceProvenanceSource>
  photo_paths: string[]
  first_visited_on: string | null
  created_at: string
  updated_at: string
}

export interface NewPlaceInput {
  name: string
  kind?: string
  note?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  lat?: number | null
  lng?: number | null
  status?: PlaceStatus
  tags?: string[]
  shared?: boolean
}

// Same pattern as useGoals: not scoped to one space at load time. RLS already
// limits reads to "mine or a space I'm in", and a person wants their personal
// pins and shared ones on one map, not filtered by which tab they opened.
export function usePlaces() {
  const supabase = createClient()
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: e } = await supabase
      .from('places')
      .select('*')
      .order('created_at', { ascending: false })
    setError(e ? e.message : null)
    setPlaces((data as Place[] | null) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onChanged() { load() }
    window.addEventListener('4s:places-changed', onChanged)
    return () => window.removeEventListener('4s:places-changed', onChanged)
  }, [load])

  function notify() { window.dispatchEvent(new CustomEvent('4s:places-changed')) }

  async function addPlace(input: NewPlaceInput, spaceId: string | null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in', place: null }
    const { data, error: e } = await supabase.from('places').insert({
      user_id: user.id,
      space_id: input.shared ? spaceId : null,
      name: input.name,
      kind: input.kind ?? 'place',
      note: input.note ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      country: input.country ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      status: input.status ?? 'idea',
      tags: input.tags ?? [],
    }).select().single()
    if (e) { setError(e.message); return { error: e.message, place: null } }
    await load(); notify()
    return { error: null, place: data as Place }
  }

  async function updatePlace(id: string, fields: Partial<Pick<Place,
    'name' | 'kind' | 'note' | 'status' | 'tags' | 'address' | 'city' | 'country' | 'lat' | 'lng' | 'details' | 'photo_paths' | 'first_visited_on' | 'space_id'
  >>) {
    // First time a place is marked good/hmm/bad, stamp today as the visit
    // date automatically — but never overwrite one already set (manual edits
    // to first_visited_on stay authoritative).
    const patch: typeof fields = { ...fields }
    if (fields.status && ['good', 'hmm', 'bad'].includes(fields.status) && patch.first_visited_on === undefined) {
      const current = places.find(p => p.id === id)
      if (current && !current.first_visited_on) patch.first_visited_on = new Date().toISOString().slice(0, 10)
    }
    const { error: e } = await supabase.from('places')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (e) { setError(e.message); return { error: e.message } }
    await load(); notify(); return { error: null }
  }

  async function removePlace(id: string) {
    const { error: e } = await supabase.from('places').delete().eq('id', id)
    if (e) { setError(e.message); return { error: e.message } }
    await load(); notify(); return { error: null }
  }

  // Uploads to Storage then appends the resulting path to the place's
  // photo_paths — two steps, but the place row is the source of truth for
  // "what photos does this pin have" so a failed upload never leaves a
  // dangling reference.
  async function addPhoto(place: Place, file: File) {
    try {
      const path = await uploadPlacePhoto(place.id, file)
      return await updatePlace(place.id, { photo_paths: [...place.photo_paths, path] })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      return { error: message }
    }
  }

  async function removePhoto(place: Place, path: string) {
    await deletePlacePhoto(path)
    return await updatePlace(place.id, { photo_paths: place.photo_paths.filter(p => p !== path) })
  }

  const withLocation = places.filter(p => p.lat != null && p.lng != null)
  const withoutLocation = places.filter(p => p.lat == null || p.lng == null)

  return {
    places, withLocation, withoutLocation, loading, error,
    addPlace, updatePlace, removePlace, addPhoto, removePhoto,
  }
}
