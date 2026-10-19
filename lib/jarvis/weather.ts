import { HOME_COORD } from '@/lib/constants/home'
import { HOME_TZ } from './time'

// Weather for Jarvis (2026-10-18): Open-Meteo, free with no key. Home by
// default (the same point the village weather uses); any other place is
// looked up with Open-Meteo's own free geocoder.

const WORDS: [number[], string][] = [
  [[0], 'clear'], [[1], 'mostly clear'], [[2], 'partly cloudy'], [[3], 'cloudy'],
  [[45, 48], 'fog'], [[51, 53, 55, 56, 57], 'drizzle'], [[61, 63, 65, 66, 67], 'rain'],
  [[71, 73, 75, 77], 'snow'], [[80, 81, 82], 'showers'], [[85, 86], 'snow showers'], [[95, 96, 99], 'thunderstorms'],
]
export function weatherWords(code: number): string {
  return WORDS.find(([codes]) => codes.includes(code))?.[1] ?? 'mixed'
}

export class WeatherError extends Error {}

async function getJson(url: string): Promise<unknown> {
  let res: Response
  try { res = await fetch(url, { signal: AbortSignal.timeout(8000) }) } catch { throw new WeatherError('The weather service did not answer. Try again in a bit.') }
  if (res.status === 429) throw new WeatherError('The weather service is busy. Try again in a minute.')
  if (!res.ok) throw new WeatherError('The weather service had a problem.')
  return res.json()
}

export async function placeCoord(name: string): Promise<{ lat: number; lng: number; label: string }> {
  const j = await getJson(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=${encodeURIComponent(name.slice(0, 100))}`) as {
    results?: { latitude: number; longitude: number; name: string; admin1?: string; country?: string }[]
  }
  const r = j.results?.[0]
  if (!r) throw new WeatherError(`I could not find a place called ${name}.`)
  return { lat: r.latitude, lng: r.longitude, label: [r.name, r.admin1, r.country].filter(Boolean).join(', ') }
}

export interface DayForecast {
  date: string; summary: string; highF: number; lowF: number
  rainChance: number | null; windMph: number | null; sunrise: string | null; sunset: string | null
}

export async function forecast(days: number, place?: string | null): Promise<{ place: string; days: DayForecast[] }> {
  const where = place ? await placeCoord(place) : { ...HOME_COORD, label: 'Home (Redwood City)' }
  const q = new URLSearchParams({
    latitude: String(where.lat), longitude: String(where.lng),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset',
    timezone: place ? 'auto' : HOME_TZ, temperature_unit: 'fahrenheit', wind_speed_unit: 'mph',
    forecast_days: String(Math.min(16, Math.max(1, days))),
  })
  const j = await getJson(`https://api.open-meteo.com/v1/forecast?${q}`) as {
    daily?: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]
      precipitation_probability_max?: (number | null)[]; wind_speed_10m_max?: (number | null)[]; sunrise?: string[]; sunset?: string[] }
  }
  const d = j.daily
  if (!d?.time?.length) throw new WeatherError('The weather service sent nothing back.')
  const clock = (iso?: string) => (iso ? iso.slice(11, 16) : null)
  return {
    place: where.label,
    days: d.time.map((date, i) => ({
      date, summary: weatherWords(d.weather_code[i]),
      highF: Math.round(d.temperature_2m_max[i]), lowF: Math.round(d.temperature_2m_min[i]),
      rainChance: d.precipitation_probability_max?.[i] ?? null,
      windMph: d.wind_speed_10m_max?.[i] != null ? Math.round(d.wind_speed_10m_max![i]!) : null,
      sunrise: clock(d.sunrise?.[i]), sunset: clock(d.sunset?.[i]),
    })),
  }
}
