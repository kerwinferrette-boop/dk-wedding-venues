import Anthropic from '@anthropic-ai/sdk'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let date, venueUrl, quotes
  try {
    ;({ date, venueUrl, quotes = [] } = JSON.parse(event.body))
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid request body' }) }
  }

  if (!date) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'date is required' }) }
  }

  // Format the date for the prompt
  const dateObj = new Date(date + 'T12:00:00')
  const DAY_NAMES  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const MON_NAMES  = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const formattedDate = `${DAY_NAMES[dateObj.getDay()]}, ${MON_NAMES[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`

  // Fetch venue website
  let venueContent = ''
  if (venueUrl) {
    try {
      const res = await fetch(venueUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WeddingOS/1.0)' },
        signal: AbortSignal.timeout(8000),
      })
      const html = await res.text()
      venueContent = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000)
    } catch {
      venueContent = ''
    }
  }

  // Build quotes section from stored form data
  let quotesSection = ''
  if (quotes.length > 0) {
    quotesSection = quotes.map(q => {
      const text = typeof q.text === 'object' ? JSON.stringify(q.text, null, 2) : String(q.text)
      return `[${(q.type || 'vendor').toUpperCase()}]\n${text}`
    }).join('\n\n')
  }

  // Nothing to read — return neutral defaults
  if (!venueContent && !quotesSection) {
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        venue: 0, catering: 0, bar: 0, photography: 0, florals: 0, music: 0, other: 0,
        multiplier: 1.25,
        notes: 'No venue website or vendor quotes on file yet. Scan a quote or add a venue URL to enable auto-pricing.',
      }),
    }
  }

  const client = new Anthropic()

  const prompt = [
    `Wedding date: ${formattedDate}\n`,
    venueContent ? `VENUE WEBSITE CONTENT:\n${venueContent}\n` : '',
    quotesSection ? `VENDOR QUOTES ON FILE:\n${quotesSection}\n` : '',
    `Based on the above, extract all pricing applicable to this specific wedding date.
Consider:
- Day-of-week premiums (Saturday/Friday minimums vs Sunday/weekday discounts)
- Seasonal pricing (spring/fall peaks, winter off-season)
- Per-person costs at 150 guests (use as default headcount)
- Any minimum spends, flat fees, or surcharges mentioned

Return ONLY valid JSON, no markdown, no explanation:
{
  "venue": <total venue fee as a number, or 0>,
  "catering": <total catering cost as a number, or 0>,
  "bar": <total bar cost as a number, or 0>,
  "photography": <photography/video cost as a number, or 0>,
  "florals": <florals cost as a number, or 0>,
  "music": <music/entertainment cost as a number, or 0>,
  "other": <other costs as a number, or 0>,
  "multiplier": <a number between 1.15 and 1.40 based on day and season>,
  "notes": "<1-2 sentences describing what pricing was applied and why>"
}
Use 0 for any category where no relevant data exists.`,
  ].join('\n')

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: 'You are a wedding budget assistant. Extract date-specific pricing from venue and vendor data. Respond ONLY with valid JSON.',
      messages: [{ role: 'user', content: prompt }],
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
      body: JSON.stringify({ error: err.message || 'Pricing extraction failed' }),
    }
  }
}
