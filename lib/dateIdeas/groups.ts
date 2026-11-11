// Date idea sections (2026-11-10). A date idea's section lives in its `area`
// field, which was free text and empty for every idea. These five are the
// starting sections; any other area someone types still shows as its own
// section, so nothing is lost.

export const DATE_GROUPS = ['At home', 'Make something', 'Outdoors', 'Out and about', 'Special'] as const
export type DateGroup = typeof DATE_GROUPS[number]

const RULES: [DateGroup, RegExp][] = [
  ['Make something', /pottery|candle|tie.?dye|scrapbook|vision board|paint|craft|photograph|knit|diy|build|terrarium|clay/i],
  ['Special', /vacation|trip|anniversar|sunrise|getaway|surprise|fancy|dream|weekend away|hot air|concert/i],
  ['Outdoors', /hik|bike|picnic|stargaz|sunset|beach|garden|camp|kayak|walk|park|skat|fish|lake|trail/i],
  ['Out and about', /museum|zoo|aquarium|escape room|arcade|mini golf|bowling|karaoke|trivia|thrift|shopping|movie theater|cinema|market|restaurant|cafe|show|class|dance/i],
  ['At home', /bake|cook|recipe|pizza|board game|co-?op|puzzle|powerpoint|quiz|taste test|movie night|game night|spa|at home|night in/i],
]

/** Best guess for an idea's section from its title, used when adding without picking one. */
export function guessGroup(title: string): DateGroup {
  for (const [g, re] of RULES) if (re.test(title)) return g
  return 'Out and about'
}

/** The sections to show, in order: the five starters, then any custom ones in use. */
export function sectionsFor(areas: (string | null)[]): string[] {
  const extra = [...new Set(areas.filter((a): a is string => !!a && !(DATE_GROUPS as readonly string[]).includes(a)))].sort()
  return [...DATE_GROUPS, ...extra]
}
