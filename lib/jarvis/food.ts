// Food facts for Jarvis (2026-10-18): USDA FoodData Central, free. With no
// USDA_API_KEY it falls back to the shared DEMO_KEY, which allows only a few
// lookups an hour; a personal key (free, instant) allows 1,000.

export class FoodError extends Error {}

const WANT: [RegExp, string][] = [
  [/^energy$/i, 'calories'], [/^protein$/i, 'protein'], [/^total lipid/i, 'fat'],
  [/^carbohydrate, by difference/i, 'carbs'], [/^fiber, total dietary/i, 'fiber'],
  [/^(total sugars|sugars, total)/i, 'sugar'], [/^sodium/i, 'sodium'], [/^fatty acids, total saturated/i, 'saturated fat'],
]

interface FdcFood {
  description: string; dataType?: string; brandOwner?: string
  servingSize?: number; servingSizeUnit?: string; householdServingFullText?: string
  foodNutrients?: { nutrientName: string; value: number; unitName: string }[]
}

export interface FoodFacts {
  name: string; source: string; per: string
  nutrients: Record<string, string>
}

export function pickNutrients(list: FdcFood['foodNutrients']): Record<string, string> {
  const out: Record<string, string> = {}
  for (const n of list ?? []) {
    const hit = WANT.find(([re]) => re.test(n.nutrientName))
    if (!hit) continue
    const [, key] = hit
    if (key === 'calories') { if (n.unitName.toUpperCase() !== 'KCAL') continue; out.calories = `${Math.round(n.value)} kcal` }
    else if (!out[key]) out[key] = `${Math.round(n.value * 10) / 10} ${n.unitName.toLowerCase()}`
  }
  return out
}

export async function lookupFood(query: string, limit = 3): Promise<FoodFacts[]> {
  const q = new URLSearchParams({
    api_key: process.env.USDA_API_KEY || 'DEMO_KEY',
    query: query.slice(0, 120), pageSize: String(Math.min(5, Math.max(1, limit))),
    dataType: 'Foundation,SR Legacy,Survey (FNDDS),Branded',
  })
  let res: Response
  try { res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${q}`, { signal: AbortSignal.timeout(9000) }) }
  catch { throw new FoodError('The USDA food service did not answer. Try again in a bit.') }
  if (res.status === 429) throw new FoodError('The USDA food service has hit its hourly limit. Try again later, or add a free USDA key.')
  if (!res.ok) throw new FoodError('The USDA food service had a problem.')
  const j = await res.json() as { foods?: FdcFood[] }
  const foods = j.foods ?? []
  if (!foods.length) throw new FoodError(`USDA has nothing for "${query}". Try a simpler name.`)
  return foods.slice(0, limit).map(f => ({
    name: f.brandOwner ? `${f.description} (${f.brandOwner})` : f.description,
    source: f.dataType ?? 'USDA',
    // Branded foods report per serving size given; the rest are per 100 g.
    per: f.dataType === 'Branded' && f.servingSize ? `100 ${f.servingSizeUnit?.toLowerCase() ?? 'g'} (label serving is ${f.servingSize} ${f.servingSizeUnit?.toLowerCase() ?? ''}${f.householdServingFullText ? `, ${f.householdServingFullText}` : ''})` : '100 g',
    nutrients: pickNutrients(f.foodNutrients),
  }))
}
