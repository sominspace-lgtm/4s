import { describe, it, expect } from 'vitest'
import {
  parseDuration, parseServings, parseNumber, parseRecipeJsonLd, htmlToText, youtubeDescription, isSocialUrl, draftFromLoose,
} from '@/lib/recipes/import'
import { isPrivateAddress } from '@/lib/recipes/safeFetch'

describe('durations, servings, numbers', () => {
  it('reads ISO durations', () => {
    expect(parseDuration('PT20M')).toBe(20)
    expect(parseDuration('PT1H20M')).toBe(80)
    expect(parseDuration('PT2H')).toBe(120)
    expect(parseDuration('P0DT0H45M')).toBe(45)
  })
  it('reads loose ones', () => {
    expect(parseDuration('1 hour 15 minutes')).toBe(75)
    expect(parseDuration(30)).toBe(30)
    expect(parseDuration(null)).toBeNull()
  })
  it('reads yields', () => {
    expect(parseServings('4 servings')).toBe(4)
    expect(parseServings(['6', '6 servings'])).toBe(6)
    expect(parseServings('Makes 12 cookies')).toBe(12)
    expect(parseServings(undefined)).toBeNull()
  })
  it('reads nutrition numbers', () => {
    expect(parseNumber('320 calories')).toBe(320)
    expect(parseNumber('1,250 kcal')).toBe(1250)
    expect(parseNumber('12.5 g')).toBe(12.5)
  })
})

const page = (ld: unknown) => `<html><head><script type="application/ld+json">${JSON.stringify(ld)}</script></head><body>hi</body></html>`

describe('parseRecipeJsonLd', () => {
  const recipe = {
    '@type': 'Recipe', name: 'Weeknight &amp; Easy Pasta', image: ['https://x.test/a.jpg'], recipeYield: '4 servings',
    prepTime: 'PT10M', cookTime: 'PT20M', keywords: 'pasta, Italian, quick',
    recipeIngredient: ['1 lb spaghetti', '2 cloves garlic, minced', '1/2 cup grated parmesan'],
    recipeInstructions: [{ '@type': 'HowToStep', text: 'Boil the pasta.' }, { '@type': 'HowToStep', text: 'Toss with garlic.' }],
    nutrition: { calories: '480 calories', proteinContent: '18 g' },
    author: { name: 'Sam Cook' },
  }
  it('reads a plain Recipe block', () => {
    const d = parseRecipeJsonLd(page(recipe), 'https://www.food.test/pasta')!
    expect(d.title).toBe('Weeknight & Easy Pasta')
    expect(d.servings).toBe(4)
    expect(d.prep_minutes).toBe(10)
    expect(d.cook_minutes).toBe(20)
    expect(d.ingredients.map(i => i.qty)).toEqual([1, 2, 0.5])
    expect(d.steps).toEqual(['Boil the pasta.', 'Toss with garlic.'])
    expect(d.calories).toBe(480)
    expect(d.protein).toBe(18)
    expect(d.source_name).toBe('Sam Cook')
    expect(d.image_url).toBe('https://x.test/a.jpg')
    expect(d.tags).toContain('italian')
  })
  it('finds it inside @graph', () => {
    const d = parseRecipeJsonLd(page({ '@context': 'https://schema.org', '@graph': [{ '@type': 'WebSite' }, recipe] }), 'https://food.test/x')
    expect(d?.title).toContain('Pasta')
  })
  it('flattens HowToSection steps and string instructions', () => {
    const sections = { ...recipe, recipeInstructions: [{ '@type': 'HowToSection', itemListElement: [{ text: 'A.' }, { text: 'B.' }] }] }
    expect(parseRecipeJsonLd(page(sections))!.steps).toEqual(['A.', 'B.'])
    const text = { ...recipe, recipeInstructions: 'Mix it.\nBake it.' }
    expect(parseRecipeJsonLd(page(text))!.steps).toEqual(['Mix it.', 'Bake it.'])
  })
  it('falls back to the site name when there is no author', () => {
    const d = parseRecipeJsonLd(page({ ...recipe, author: undefined }), 'https://www.food.test/pasta')!
    expect(d.source_name).toBe('food.test')
  })
  it('returns null when there is no recipe, or only a name', () => {
    expect(parseRecipeJsonLd('<html>nothing</html>')).toBeNull()
    expect(parseRecipeJsonLd(page({ '@type': 'Article', name: 'x' }))).toBeNull()
    expect(parseRecipeJsonLd(page({ '@type': 'Recipe', name: 'Empty' }))).toBeNull()
  })
  it('survives broken JSON-LD blocks', () => {
    const html = `<script type="application/ld+json">{ not json</script>` + page(recipe)
    expect(parseRecipeJsonLd(html)?.title).toContain('Pasta')
  })
})

describe('text helpers', () => {
  it('strips markup for the AI', () => {
    const t = htmlToText('<style>x{}</style><nav>menu</nav><h1>Soup</h1><p>Boil &amp; stir</p><script>evil()</script>')
    expect(t).toContain('Soup')
    expect(t).toContain('Boil & stir')
    expect(t).not.toContain('evil')
    expect(t).not.toContain('menu')
  })
  it('pulls a YouTube description out of the player data', () => {
    const html = '..."shortDescription":"Ingredients:\\n2 eggs\\n1 cup flour","isCrawlable":true...'
    expect(youtubeDescription(html)).toBe('Ingredients:\n2 eggs\n1 cup flour')
    expect(youtubeDescription('nothing')).toBeNull()
  })
  it('knows social links', () => {
    expect(isSocialUrl('https://www.instagram.com/reel/abc/')).toBe(true)
    expect(isSocialUrl('https://vm.tiktok.com/xyz')).toBe(true)
    expect(isSocialUrl('https://youtu.be/abc')).toBe(true)
    expect(isSocialUrl('https://www.seriouseats.com/x')).toBe(false)
  })
  it('shapes a loose AI result', () => {
    const d = draftFromLoose({ title: ' Tacos ', servings: 0, ingredients: ['2 tortillas', '', 7], steps: ['Fry.'], tags: ['Mexican'], calories: 300 }, 'https://www.tiktok.com/@a/video/1')
    expect(d.title).toBe('Tacos')
    expect(d.servings).toBe(2)
    expect(d.ingredients).toHaveLength(1)
    expect(d.tags).toEqual(['mexican'])
    expect(d.source_name).toBe('tiktok.com')
  })
})

describe('private address guard', () => {
  it('refuses the addresses a server must not be pointed at', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.9', '172.16.5.5', '169.254.169.254', '0.0.0.0', '100.64.0.1', '::1', 'fd12::1', 'fe80::1', '::ffff:10.0.0.1']) {
      expect(isPrivateAddress(ip)).toBe(true)
    }
  })
  it('allows ordinary public ones', () => {
    for (const ip of ['8.8.8.8', '151.101.1.69', '2606:4700:4700::1111']) expect(isPrivateAddress(ip)).toBe(false)
  })
})
