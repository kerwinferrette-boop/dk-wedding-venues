import Anthropic from '@anthropic-ai/sdk'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

const AXES_DESC = `
- EXP: 1=visually focused/cold, 10=deeply emotional/soulful/intimate feel
- AES: 1=minimal visual curation, 10=every visual detail exquisite
- CONV: 1=raw canvas/bring your own vendors, 10=fully turnkey/all-inclusive
- CUST: 1=take it as-is, 10=infinitely customizable
- INT: 1=intimate/micro scale, 10=grand/large-scale/inclusive
- SCL: 1=serene/contemplative, 10=high-energy/party/dance
- STR: 1=relaxed/flowing, 10=formal/structured/orchestrated
- FLX: 1=rigid single aesthetic, 10=flexible/adaptable/versatile
- BUD: 1=ultra-premium/no ceiling, 10=value-conscious/practical
- VIS: 1=neutral/could be anything, 10=strong specific visual identity
`.trim()

function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function isImageUrl(url) {
  return /\.(jpg|jpeg|png|webp|gif|bmp|avif)(\?.*)?$/i.test(url)
}

function extractMeta(html) {
  const get = (pattern) => {
    const m = html.match(pattern)
    return m ? m[1]?.trim() || null : null
  }
  const title =
    get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
    get(/<title[^>]*>([^<]+)<\/title>/i)

  const description =
    get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i) ||
    get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)

  const image =
    get(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)

  const bodyText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 600)

  return { title, description, image, bodyText }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let url
  try {
    ;({ url } = JSON.parse(event.body))
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid request body' }) }
  }
  if (!url) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'url is required' }) }
  }

  const client = new Anthropic() // reads ANTHROPIC_API_KEY from env

  const messageContent = []
  let pageTitle = extractDomain(url)
  let ogImageUrl = null

  if (isImageUrl(url)) {
    messageContent.push({ type: 'image', source: { type: 'url', url } })
    messageContent.push({ type: 'text', text: 'Analyze this wedding inspiration image.' })
  } else {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(8000),
        redirect: 'follow',
      })
      const html = await res.text()
      const meta = extractMeta(html)

      pageTitle = meta.title || extractDomain(url)
      ogImageUrl = meta.image || null

      const context = [
        `URL: ${url}`,
        meta.title && `Title: ${meta.title}`,
        meta.description && `Description: ${meta.description}`,
        meta.bodyText && `Page text excerpt: ${meta.bodyText}`,
      ].filter(Boolean).join('\n\n')

      if (ogImageUrl) {
        try {
          messageContent.push({ type: 'image', source: { type: 'url', url: ogImageUrl } })
        } catch { /* ignore if image fails */ }
      }
      messageContent.push({
        type: 'text',
        text: `Analyze this wedding venue/inspiration source:\n\n${context}`,
      })
    } catch {
      // Fetch failed — fall back to domain knowledge
      pageTitle = extractDomain(url)
      messageContent.push({
        type: 'text',
        text: `Analyze this wedding venue/inspiration source based on its URL and domain:\n\nURL: ${url}\nDomain: ${pageTitle}`,
      })
    }
  }

  const systemPrompt = `You are a wedding aesthetic analyst. Given any venue, inspiration image, or wedding-related source, decode its aesthetic DNA and map it to wedding planning dimensions.

Score on these 10 dimensions (1–10):
${AXES_DESC}

Respond ONLY with valid JSON — no markdown, no explanation outside the JSON.`

  const userPrompt = `Score this source's wedding aesthetic DNA and return ONLY this JSON:
{
  "axes": {"EXP":5,"AES":5,"CONV":5,"CUST":5,"INT":5,"SCL":5,"STR":5,"FLX":5,"BUD":5,"VIS":5},
  "archetype": "pragmatist",
  "vibe": "2-3 sentence read of the overall aesthetic and emotional tone.",
  "title": "Short evocative label (e.g. 'Romantic Garden Estate')"
}

archetype must be one of: romantic, aesthete, pragmatist, celebrant, director, visionary, collaborator, minimalist, host, curator`

  // Replace text blocks with the final prompt
  const finalContent = messageContent.map((m) =>
    m.type === 'text' ? { type: 'text', text: userPrompt } : m
  )
  if (!finalContent.some((m) => m.type === 'text')) {
    finalContent.push({ type: 'text', text: userPrompt })
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: finalContent }],
    })

    const raw = response.content[0].text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const result = JSON.parse(jsonMatch?.[0] ?? raw)

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        axes: result.axes,
        archetype: result.archetype,
        vibe: result.vibe,
        title: result.title || pageTitle,
        imageUrl: isImageUrl(url) ? url : (ogImageUrl || null),
      }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message || 'Analysis failed' }),
    }
  }
}
