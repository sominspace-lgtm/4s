import { describe, it, expect } from 'vitest'
import {
  parseIngredient, formatQty, scaleIngredient, mergeIngredients, ingredientKey, aisleOf, alreadyListed,
} from '@/lib/recipes/ingredients'

describe('parseIngredient', () => {
  it('reads a whole number, a unit and a name', () => {
    expect(parseIngredient('2 cups flour')).toMatchObject({ qty: 2, unit: 'cup', name: 'flour' })
  })
  it('reads mixed numbers and fractions', () => {
    expect(parseIngredient('1 1/2 tablespoons olive oil')).toMatchObject({ qty: 1.5, unit: 'tbsp', name: 'olive oil' })
    expect(parseIngredient('3/4 tsp salt')).toMatchObject({ qty: 0.75, unit: 'tsp', name: 'salt' })
  })
  it('reads unicode fractions', () => {
    expect(parseIngredient('½ cup sugar')).toMatchObject({ qty: 0.5, unit: 'cup', name: 'sugar' })
    expect(parseIngredient('1½ cups milk')).toMatchObject({ qty: 1.5, unit: 'cup', name: 'milk' })
  })
  it('takes the larger end of a range', () => {
    expect(parseIngredient('2-3 cloves garlic, minced')).toMatchObject({ qty: 3, unit: 'clove', name: 'garlic, minced' })
  })
  it('skips a parenthetical size but keeps the line as written', () => {
    const i = parseIngredient('1 (14 oz) can diced tomatoes')
    expect(i).toMatchObject({ qty: 1, unit: 'can', name: 'diced tomatoes' })
    expect(i.text).toBe('1 (14 oz) can diced tomatoes')
  })
  it('handles lines with no amount', () => {
    expect(parseIngredient('Salt and pepper, to taste')).toMatchObject({ qty: null, unit: null })
    expect(parseIngredient('2 eggs')).toMatchObject({ qty: 2, unit: null, name: 'eggs' })
  })
})

describe('formatQty and scaling', () => {
  it('rounds to eighths', () => {
    expect(formatQty(1.5)).toBe('1 1/2')
    expect(formatQty(0.25)).toBe('1/4')
    expect(formatQty(2)).toBe('2')
    expect(formatQty(0.99)).toBe('1')
    expect(formatQty(2.33)).toBe('2 3/8')
  })
  it('scales a line and rebuilds its text', () => {
    expect(scaleIngredient(parseIngredient('1 cup rice'), 2).text).toBe('2 cups rice')
    expect(scaleIngredient(parseIngredient('1 1/2 tsp salt'), 0.5).text).toBe('3/4 tsp salt')
  })
  it('leaves an unmeasured line alone', () => {
    const i = parseIngredient('Salt to taste')
    expect(scaleIngredient(i, 3)).toBe(i)
  })
})

describe('mergeIngredients', () => {
  const a = parseIngredient('2 tbsp olive oil')
  const b = parseIngredient('1/4 cup olive oil')
  it('adds compatible volume units together', () => {
    const [line] = mergeIngredients([{ ing: a, factor: 1 }, { ing: b, factor: 1 }])
    expect(line.text).toBe('3/8 cup olive oil') // 2 tbsp + 1/4 cup
  })
  it('merges names that differ by plural, case or prep', () => {
    const out = mergeIngredients([
      { ing: parseIngredient('1 onion, diced'), factor: 1 },
      { ing: parseIngredient('2 Onions'), factor: 1 },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].qty).toBe(3)
  })
  it('keeps different units of different families apart', () => {
    const out = mergeIngredients([
      { ing: parseIngredient('1 cup milk'), factor: 1 },
      { ing: parseIngredient('1 can milk'), factor: 1 },
    ])
    expect(out).toHaveLength(2)
  })
  it('applies each recipe factor and remembers where it came from', () => {
    const out = mergeIngredients([
      { ing: parseIngredient('1 cup rice'), factor: 2, from: 'Fried rice' },
      { ing: parseIngredient('1 cup rice'), factor: 1, from: 'Burrito bowls' },
    ])
    expect(out[0].text).toBe('3 cups rice')
    expect(out[0].from).toEqual(['Fried rice', 'Burrito bowls'])
  })
  it('keeps weights in the units they were written in', () => {
    expect(mergeIngredients([{ ing: parseIngredient('1 lb spaghetti'), factor: 1 }])[0].text).toBe('1 lb spaghetti')
    expect(mergeIngredients([{ ing: parseIngredient('8 oz cheddar'), factor: 1 }, { ing: parseIngredient('8 oz cheddar'), factor: 1 }])[0].text).toBe('1 lb cheddar')
    expect(mergeIngredients([{ ing: parseIngredient('4 oz butter'), factor: 1 }])[0].text).toBe('4 oz butter')
    expect(mergeIngredients([{ ing: parseIngredient('500 g flour'), factor: 1 }])[0].text).toBe('500 g flour')
    expect(mergeIngredients([{ ing: parseIngredient('600 g flour'), factor: 1 }, { ing: parseIngredient('600 g flour'), factor: 1 }])[0].text).toBe('1 1/4 kg flour')
  })
  it('sorts by aisle', () => {
    const out = mergeIngredients(['1 lb chicken thighs', '2 tomatoes', '1 cup rice', '1 tsp cumin'].map(t => ({ ing: parseIngredient(t), factor: 1 })))
    expect(out.map(l => l.aisle)).toEqual(['Produce', 'Meat and seafood', 'Pantry', 'Spices'])
  })
})

describe('helpers', () => {
  it('builds stable keys', () => {
    expect(ingredientKey('Tomatoes, diced')).toBe(ingredientKey('tomato'))
    expect(ingredientKey('fresh Basil leaves')).toBe('basil leave')
  })
  it('sorts common foods into aisles', () => {
    expect(aisleOf('salmon fillets')).toBe('Meat and seafood')
    expect(aisleOf('whole milk')).toBe('Dairy and eggs')
    expect(aisleOf('mystery item')).toBe('Other')
  })
  it('spots what is already on the list', () => {
    expect(alreadyListed('Eggs', ['2 eggs', 'milk'])).toBe(true)
    expect(alreadyListed('butter', ['milk'])).toBe(false)
  })
})
