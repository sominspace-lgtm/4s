// Refill Intelligence — AI-assisted setup extraction.
//
// Real extraction runs server-side in /api/ai (Claude with an image content
// block for label scans; fetched page text for link pastes). If the AI route
// is unavailable — no ANTHROPIC_API_KEY configured, rate limit, network —
// these fall back to the old lightweight guesses so the flow still works.
// Nothing is trusted blindly either way: RefillIntelligence always shows a
// confirmation screen (Confirm / Edit / Try again) before anything is saved.

export interface ExtractedProductInfo {
  name: string
  category: string
  quantity: number | null
  servingCount: number | null
  servingSize: string | null
  usagePerDay: number | null
  estimatedDaysSupply: number | null
  price: number | null
  imageUrl: string | null
  confidence: 'high' | 'medium' | 'low'
}

async function callAI(payload: Record<string, unknown>): Promise<ExtractedProductInfo | null> {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.result?.name) return null
    return { imageUrl: null, ...data.result } as ExtractedProductInfo
  } catch {
    return null
  }
}

export async function extractFromLabel(imageDataUrl: string): Promise<ExtractedProductInfo> {
  const ai = await callAI({ task: 'extract-label', image: imageDataUrl })
  if (ai) return ai
  // Fallback: no AI available — hand back an empty-ish draft the user edits.
  return {
    name: '', category: 'supplements', quantity: null, servingCount: null,
    servingSize: null, usagePerDay: null, estimatedDaysSupply: 30, price: null,
    imageUrl: null, confidence: 'low',
  }
}

export async function extractFromLink(url: string): Promise<ExtractedProductInfo> {
  const ai = await callAI({ task: 'extract-link', url })
  if (ai) return ai
  // Fallback: guess a name from the URL slug, same as the old mock.
  const guessedName = url.split('/').filter(Boolean).pop()?.replace(/[-_]/g, ' ') || 'Product'
  return {
    name: guessedName.length > 3 ? guessedName : 'Household item',
    category: 'other', quantity: null, servingCount: null, servingSize: null,
    usagePerDay: null, estimatedDaysSupply: 30, price: null,
    imageUrl: null, confidence: 'low',
  }
}
