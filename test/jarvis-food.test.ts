import { describe, it, expect } from 'vitest'
import { pickNutrients } from '@/lib/jarvis/food'
import { weatherWords } from '@/lib/jarvis/weather'

describe('pickNutrients', () => {
  it('keeps the useful ones, calories in kcal only', () => {
    const out = pickNutrients([
      { nutrientName: 'Energy', value: 1620, unitName: 'kJ' },
      { nutrientName: 'Energy', value: 387, unitName: 'KCAL' },
      { nutrientName: 'Protein', value: 22.39, unitName: 'G' },
      { nutrientName: 'Total lipid (fat)', value: 6.69, unitName: 'G' },
      { nutrientName: 'Carbohydrate, by difference', value: 57.82, unitName: 'G' },
      { nutrientName: 'Sodium, Na', value: 64, unitName: 'MG' },
      { nutrientName: 'Retinol', value: 0, unitName: 'UG' },
    ])
    expect(out).toEqual({ calories: '387 kcal', protein: '22.4 g', fat: '6.7 g', carbs: '57.8 g', sodium: '64 mg' })
  })
})

describe('weatherWords', () => {
  it('reads WMO codes', () => {
    expect(weatherWords(0)).toBe('clear')
    expect(weatherWords(63)).toBe('rain')
    expect(weatherWords(95)).toBe('thunderstorms')
  })
})
