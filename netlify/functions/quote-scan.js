import Anthropic from '@anthropic-ai/sdk'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

const VENDOR_PROMPTS = {
  music: `Extract from this vendor quote: vendor/artist name, category (DJ/Band/Solo Artist), price estimate (total number), whether they do hip-hop sets.
Return JSON: { "name": "", "category": "", "price_estimate": null, "hip_hop": false }`,

  catering: `Extract from this catering quote: company name, cuisine type, price per person (number only), status (use "considering" unless it says booked/confirmed).
Return JSON: { "name": "", "cuisine": "", "price_pp": null, "status": "considering" }`,

  bar: `Extract from this bar/beverage quote: provider/company name, price per person (number only), whether it's an open bar package.
Return JSON: { "provider": "", "price_pp": null, "open_bar": false }`,

  cinema: `Extract from this videography/cinematography quote: company or videographer name, total price (number only), and which add-ons are included: drone footage, highlight reel, confessional cam.
Return JSON: { "name": "", "price": null, "drone": false, "highlight_reel": false, "confessional": false }`,

  florals: `Extract from this florals/floral design quote: florist or company name, price estimate (total number), style description (as comma-separated tags), and which items are included: arch/ceremony backdrop, bridal bouquet, centerpieces, aisle florals.
Return JSON: { "name": "", "price_estimate": null, "style_tags": "", "includes_arch": false, "includes_bouquet": false, "includes_centerpieces": false, "includes_aisle": false }`,

  extras: `Extract from this vendor quote: service/product name, category (e.g. Photo Booth, Lighting, Transportation), price estimate (number), pricing type (flat / per person / per hour).
Return JSON: { "name": "", "category": "", "price_estimate": null, "pricing_type": "" }`,

  rehearsal: `Extract from this rehearsal dinner venue quote: venue or restaurant name, price estimate (total number), whether a private room is included or available.
Return JSON: { "name": "", "price_estimate": null, "private_room": false }`,
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let imageBase64, mimeType, vendorType
  try {
    ;({ imageBase64, mimeType, vendorType } = JSON.parse(event.body))
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid request body' }) }
  }

  if (!imageBase64 || !mimeType || !vendorType) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'imageBase64, mimeType, and vendorType are required' }) }
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(mimeType)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unsupported image type' }) }
  }

  const prompt = VENDOR_PROMPTS[vendorType] || VENDOR_PROMPTS.extras

  const client = new Anthropic()

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: 'You are a wedding planning assistant that reads vendor quotes and extracts structured data. Respond ONLY with valid JSON — no markdown, no explanation.',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      }],
    })

    const raw = response.content[0].text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const result = JSON.parse(jsonMatch?.[0] ?? raw)

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(result),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message || 'Quote extraction failed' }),
    }
  }
}
