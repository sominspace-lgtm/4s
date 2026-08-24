// Real weather for the Village (2026-08-24) — Open-Meteo: free, no API key,
// no account, just lat/lon. Anchored to the household's actual home address
// (900 Chestnut St, Redwood City, CA 94063 — the same one already used for
// Household's "Near Our New Home" section) rather than requesting the
// visitor's live location: one fixed, known point, no geolocation prompt, no
// per-person location data stored anywhere.
//
// Cache only a SUCCESSFUL fetch (2026-08-24) — same fix as
// lib/map/style.ts's loadBaseStyle(): caching an in-flight promise
// unconditionally, including one that resolves to null on failure, meant one
// bad fetch anywhere in the browser session permanently wedged the feature
// for the rest of it. Clearing the promise on failure means the next call
// actually retries.

const HOME_LAT = 37.485938
const HOME_LON = -122.218869

export type WeatherCondition = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm'

export interface WeatherNow {
  tempF: number
  condition: WeatherCondition
}

const CONDITION_META: Record<WeatherCondition, { emoji: string; label: string }> = {
  clear: { emoji: '☀️', label: 'Clear' },
  cloudy: { emoji: '☁️', label: 'Cloudy' },
  fog: { emoji: '🌫️', label: 'Foggy' },
  rain: { emoji: '🌧️', label: 'Rain' },
  snow: { emoji: '❄️', label: 'Snow' },
  storm: { emoji: '⛈️', label: 'Storms' },
}

export function weatherMeta(c: WeatherCondition): { emoji: string; label: string } {
  return CONDITION_META[c]
}

// WMO weather codes (what Open-Meteo's `current.weather_code` returns),
// collapsed to the handful of conditions the scene actually treats
// differently — see the rain-overlay note in Ambient.tsx.
function conditionFromCode(code: number): WeatherCondition {
  if (code === 0 || code === 1) return 'clear'
  if (code === 2 || code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code === 95 || code === 96 || code === 99) return 'storm'
  return 'clear'
}

let cached: WeatherNow | null = null
let cachedPromise: Promise<WeatherNow | null> | null = null

export async function loadWeather(): Promise<WeatherNow | null> {
  if (cached) return cached
  if (cachedPromise) return cachedPromise
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${HOME_LAT}&longitude=${HOME_LON}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
  cachedPromise = fetch(url, { signal: AbortSignal.timeout(8000) })
    .then(r => (r.ok ? r.json() : null))
    .then(json => {
      const temp = json?.current?.temperature_2m
      const code = json?.current?.weather_code
      if (typeof temp !== 'number' || typeof code !== 'number') { cachedPromise = null; return null }
      const result: WeatherNow = { tempF: Math.round(temp), condition: conditionFromCode(code) }
      cached = result
      return result
    })
    .catch(() => { cachedPromise = null; return null })
  return cachedPromise
}
