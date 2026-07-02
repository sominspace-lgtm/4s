// Refill Intelligence — AI-assisted setup extraction.
//
// TODO(real AI): replace these two functions with a real call to a vision-
// capable model (e.g. Claude with an image content block for the label scan,
// or a fetch + HTML/OG-tag parse for the link paste). Both should keep the
// same ExtractedProductInfo return shape so RefillIntelligence's confirmation
// screen doesn't need to change. Suggested spots to wire this in:
//   - extractFromLabel: send the image as a base64 data URL to the model with
//     a prompt asking for the fields below as JSON.
//   - extractFromLink: fetch the URL server-side (new API route, since this
//     runs client-side today and most product pages block CORS), parse
//     title/price/image meta tags, then optionally pass the text through the
//     same model prompt as the label path for quantity/serving extraction.
// Neither function is trusted blindly — RefillIntelligence always shows a
// confirmation screen (Confirm / Edit / Try again / Use simple interval
// instead) before anything is saved.

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

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Mock label-scan extraction — pretends to read text like "120 capsules",
// "serving size 2 capsules", "servings per container 60", "take once daily".
export async function extractFromLabel(_imageDataUrl: string): Promise<ExtractedProductInfo> {
  await delay(900)
  return {
    name: 'Vitamin D3 2000 IU',
    category: 'supplements',
    quantity: 120,
    servingCount: 60,
    servingSize: '2 capsules',
    usagePerDay: 2,
    estimatedDaysSupply: 60,
    price: 14.99,
    imageUrl: null,
    confidence: 'medium',
  }
}

// Mock link-paste extraction — pretends to parse a product page.
export async function extractFromLink(url: string): Promise<ExtractedProductInfo> {
  await delay(700)
  const guessedName = url.split('/').filter(Boolean).pop()?.replace(/[-_]/g, ' ') || 'Product'
  return {
    name: guessedName.length > 3 ? guessedName : 'Household item',
    category: 'household',
    quantity: 1,
    servingCount: null,
    servingSize: null,
    usagePerDay: null,
    estimatedDaysSupply: 30,
    price: null,
    imageUrl: null,
    confidence: 'low',
  }
}
