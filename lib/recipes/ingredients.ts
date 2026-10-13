// Ingredient lines, as numbers (2026-10-13): "1 1/2 cups flour" becomes
// 1.5 cup flour so a recipe can be scaled, several recipes can be merged into
// one grocery list, and the list can be sorted into aisles. Plain functions,
// no I/O, so the odd cases are covered by tests.

export interface Ingredient {
  id: string
  /** The line as written (or rebuilt after scaling). Always shown to the person. */
  text: string
  qty: number | null
  unit: string | null
  /** What it is, with any prep note: "onion, diced". */
  name: string
}

const FRACTIONS: Record<string, string> = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5',
  '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
}

// Canonical unit -> the spellings people write.
const UNIT_ALIASES: Record<string, string[]> = {
  tsp: ['tsp', 'tsps', 'teaspoon', 'teaspoons'],
  tbsp: ['tbsp', 'tbsps', 'tbs', 'tablespoon', 'tablespoons'],
  cup: ['cup', 'cups'],
  oz: ['oz', 'ounce', 'ounces'],
  lb: ['lb', 'lbs', 'pound', 'pounds'],
  g: ['g', 'gram', 'grams'],
  kg: ['kg', 'kilogram', 'kilograms'],
  ml: ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'],
  l: ['l', 'liter', 'liters', 'litre', 'litres'],
  clove: ['clove', 'cloves'],
  can: ['can', 'cans'],
  pinch: ['pinch', 'pinches'],
  dash: ['dash', 'dashes'],
  slice: ['slice', 'slices'],
  bunch: ['bunch', 'bunches'],
  stick: ['stick', 'sticks'],
  sprig: ['sprig', 'sprigs'],
  package: ['package', 'packages', 'pkg', 'packet', 'packets'],
}
const UNIT_LOOKUP = new Map<string, string>()
for (const [canon, list] of Object.entries(UNIT_ALIASES)) for (const a of list) UNIT_LOOKUP.set(a, canon)

const NUM = String.raw`\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?`
const QTY_RE = new RegExp(String.raw`^\s*(${NUM})(?:\s*(?:-|–|to)\s*(${NUM}))?`, 'i')

function toNumber(s: string): number {
  const t = s.trim()
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const frac = t.match(/^(\d+)\/(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  return Number(t)
}

function normalizeFractions(text: string): string {
  let out = text
  for (const [ch, rep] of Object.entries(FRACTIONS)) out = out.split(ch).join(` ${rep}`)
  return out.replace(/(\d)\s{2,}(\d+\/\d+)/g, '$1 $2').replace(/\s{2,}/g, ' ').trim()
}

let counter = 0
const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : `i${Date.now().toString(36)}${counter++}`)

export function parseIngredient(raw: string, id: string = newId()): Ingredient {
  const text = raw.trim().replace(/\s+/g, ' ')
  const t = normalizeFractions(text)
  const m = t.match(QTY_RE)
  if (!m) return { id, text, qty: null, unit: null, name: text }
  // A range ("2-3 cloves") shops for the larger number.
  const qty = toNumber(m[2] ?? m[1])
  let rest = t.slice(m[0].length).trim()
  // "1 (14 oz) can tomatoes": drop the parenthetical size, keep it in the line text.
  rest = rest.replace(/^\([^)]*\)\s*/, '')
  const unitMatch = rest.match(/^([A-Za-z]+)\.?(\s+|$)/)
  let unit: string | null = null
  if (unitMatch) {
    const canon = UNIT_LOOKUP.get(unitMatch[1].toLowerCase())
    if (canon) { unit = canon; rest = rest.slice(unitMatch[0].length).trim() }
  }
  rest = rest.replace(/^of\s+/i, '')
  return { id, text, qty, unit, name: rest || text }
}

const EIGHTHS: [number, string][] = [[0, ''], [1, '1/8'], [2, '1/4'], [3, '3/8'], [4, '1/2'], [5, '5/8'], [6, '3/4'], [7, '7/8']]

/** 1.5 -> "1 1/2", 0.25 -> "1/4", 2 -> "2". Rounds to the nearest eighth. */
export function formatQty(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0'
  const whole = Math.floor(n)
  const eighths = Math.round((n - whole) * 8)
  if (eighths === 8) return String(whole + 1)
  const frac = EIGHTHS[eighths][1]
  if (!frac) return String(whole)
  return whole ? `${whole} ${frac}` : frac
}

const PLURAL_UNITS = new Set(['cup', 'clove', 'can', 'slice', 'bunch', 'stick', 'sprig', 'package', 'pinch', 'dash'])
function unitLabel(unit: string, qty: number): string {
  if (qty > 1 && PLURAL_UNITS.has(unit)) return unit === 'pinch' ? 'pinches' : unit === 'bunch' ? 'bunches' : `${unit}s`
  return unit
}

export function lineText(qty: number | null, unit: string | null, name: string): string {
  if (qty == null) return name
  return [formatQty(qty), unit ? unitLabel(unit, qty) : null, name].filter(Boolean).join(' ')
}

export function scaleIngredient(ing: Ingredient, factor: number): Ingredient {
  if (ing.qty == null || factor === 1) return ing
  const qty = ing.qty * factor
  return { ...ing, qty, text: lineText(qty, ing.unit, ing.name) }
}

// --- merging for a grocery list -------------------------------------------------

const VOLUME_TSP: Record<string, number> = { tsp: 1, tbsp: 3, cup: 48 }
const WEIGHT_G: Record<string, number> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 }

/** A lowercase, singular, prep-free key so "Onions, diced" and "onion" merge. */
export function ingredientKey(name: string): string {
  let n = name.toLowerCase().split(/,| \(| - /)[0].trim()
  n = n.replace(/\b(fresh|large|small|medium|chopped|diced|minced|sliced|ground|whole|boneless|skinless|ripe|optional|to taste)\b/g, ' ').replace(/\s+/g, ' ').trim()
  if (n.endsWith('ies')) n = `${n.slice(0, -3)}y`
  else if (/(ches|shes|oes)$/.test(n)) n = n.slice(0, -2)
  else if (n.endsWith('s') && !n.endsWith('ss') && !n.endsWith('us')) n = n.slice(0, -1)
  return n
}

const AISLES: [string, RegExp][] = [
  ['Produce', /\b(lettuce|spinach|kale|arugula|tomato|onion|garlic|ginger|potato|carrot|celery|pepper|cucumber|zucchini|squash|broccoli|cauliflower|mushroom|avocado|lemon|lime|orange|apple|banana|berry|berries|herb|basil|cilantro|parsley|mint|thyme|rosemary|scallion|shallot|cabbage|corn|bean sprout|eggplant|asparagus|pea|jalapeno|chile|grape|mango|pineapple|peach|pear)/],
  ['Meat and seafood', /\b(chicken|beef|pork|turkey|bacon|sausage|ham|steak|lamb|salmon|shrimp|fish|tuna|cod|tilapia|ground meat|meatball|prosciutto|chorizo)/],
  ['Dairy and eggs', /\b(milk|cream|butter|cheese|yogurt|yoghurt|egg|sour cream|parmesan|mozzarella|cheddar|feta|ricotta|half and half)/],
  ['Bakery', /\b(bread|bun|roll|tortilla|pita|bagel|baguette|naan|croissant|wrap)/],
  ['Frozen', /\b(frozen|ice cream)/],
  ['Spices', /\b(salt|pepper flakes|paprika|cumin|cinnamon|nutmeg|oregano|turmeric|chili powder|curry|cayenne|coriander|vanilla|allspice|seasoning|spice|bay leaf|black pepper)/],
  ['Pantry', /\b(flour|sugar|rice|pasta|noodle|oil|vinegar|sauce|broth|stock|bean|lentil|chickpea|oat|honey|syrup|soy|mustard|ketchup|mayo|mayonnaise|baking|yeast|cornstarch|nut|almond|walnut|peanut|seed|can|coconut milk|tomato paste|cereal|cracker|chocolate|cocoa|jam|tahini|miso|stock)/],
  ['Drinks', /\b(wine|beer|juice|soda|water|coffee|tea|sparkling)/],
]

export function aisleOf(name: string): string {
  const n = name.toLowerCase()
  for (const [aisle, re] of AISLES) if (re.test(n)) return aisle
  return 'Other'
}

export interface GroceryLine { key: string; text: string; name: string; qty: number | null; unit: string | null; aisle: string; from: string[] }

interface Acc { key: string; name: string; qty: number | null; unit: string | null; family: 'volume' | 'weight' | 'count' | 'other'; base: number; metric: boolean; from: Set<string> }

function nice(base: number, family: 'volume' | 'weight', metric: boolean): { qty: number; unit: string } {
  if (family === 'volume') {
    // A quarter cup and up reads better as cups than as a pile of tablespoons.
    if (base >= 12) return { qty: base / 48, unit: 'cup' }
    if (base >= 3) return { qty: base / 3, unit: 'tbsp' }
    return { qty: base, unit: 'tsp' }
  }
  if (metric) return base >= 1000 ? { qty: base / 1000, unit: 'kg' } : { qty: base, unit: 'g' }
  // Written in ounces or pounds: shown back that way.
  return base >= WEIGHT_G.lb * 0.95 ? { qty: base / WEIGHT_G.lb, unit: 'lb' } : { qty: base / WEIGHT_G.oz, unit: 'oz' }
}

/** Merge ingredient lines (each with how much of the recipe is being made) into one list. */
export function mergeIngredients(items: { ing: Ingredient; factor: number; from?: string }[]): GroceryLine[] {
  const acc = new Map<string, Acc>()
  for (const { ing, factor, from } of items) {
    const key = ingredientKey(ing.name)
    if (!key) continue
    const qty = ing.qty == null ? null : ing.qty * factor
    const unit = ing.unit
    const family: Acc['family'] = unit && unit in VOLUME_TSP ? 'volume' : unit && unit in WEIGHT_G ? 'weight' : qty != null && !unit ? 'count' : 'other'
    const slot = `${key}|${family === 'other' ? `other:${unit ?? ''}` : family}`
    let a = acc.get(slot)
    if (!a) { a = { key, name: ing.name, qty: null, unit: family === 'count' ? null : unit, family, base: 0, metric: false, from: new Set() }; acc.set(slot, a) }
    if (from) a.from.add(from)
    if (qty == null) continue
    if (family === 'volume') a.base += qty * VOLUME_TSP[unit!]
    else if (family === 'weight') { a.base += qty * WEIGHT_G[unit!]; if (unit === 'g' || unit === 'kg') a.metric = true }
    else a.qty = (a.qty ?? 0) + qty
  }
  const out: GroceryLine[] = []
  for (const a of acc.values()) {
    let qty = a.qty, unit = a.unit
    if (a.family === 'volume' || a.family === 'weight') {
      const n = nice(a.base, a.family, a.metric)
      qty = n.qty; unit = n.unit
    }
    // Strip prep words from the name shown on a list: "onion, diced" -> "onion".
    const shown = a.name.split(',')[0].trim()
    out.push({ key: a.key, name: shown, qty, unit, text: lineText(qty, unit, shown), aisle: aisleOf(shown), from: [...a.from] })
  }
  const order = ['Produce', 'Meat and seafood', 'Dairy and eggs', 'Bakery', 'Pantry', 'Spices', 'Frozen', 'Drinks', 'Other']
  return out.sort((x, y) => order.indexOf(x.aisle) - order.indexOf(y.aisle) || x.name.localeCompare(y.name))
}

/** Is something like this already on the list? Matches on the ingredient key. */
export function alreadyListed(name: string, existing: string[]): boolean {
  const k = ingredientKey(parseIngredient(name).name)
  return !!k && existing.some(e => ingredientKey(parseIngredient(e).name) === k)
}

/** The amount alone, for a shopping-list "qty" column: "2 cups", "1 1/2 lb", or "" if unmeasured. */
export function qtyText(qty: number | null, unit: string | null): string {
  if (qty == null) return ''
  return [formatQty(qty), unit ? unitLabel(unit, qty) : null].filter(Boolean).join(' ')
}
