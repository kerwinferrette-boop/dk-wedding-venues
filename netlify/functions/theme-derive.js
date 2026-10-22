import Anthropic from '@anthropic-ai/sdk'
import {
  FONT_WHITELIST, DISPLAY_FONT_IDS, BODY_FONT_IDS,
  MOTIF_KINDS, MOTIF_PLACEMENTS, FRAME_STYLES, TEXTURES, TRACKINGS, CASES,
  validateRecipe,
} from '../../src/lib/themeRecipe.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

const MAX_IMAGES = 6

// The whitelists are rendered into the prompt rather than described, so the
// model is choosing from the same list validateRecipe() enforces. Anything it
// invents anyway gets clamped on the way out (and again on the client).
const fontMenu = (ids) =>
  FONT_WHITELIST.filter(f => ids.includes(f.id))
    .map(f => `  ${f.id} — ${f.label} (${f.mood})`)
    .join('\n')

const SYSTEM = `You are an art director specifying wedding stationery. You translate a couple's theme — in their words, plus any inspiration photos — into a precise design recipe.

Return ONLY a JSON object, no prose, in exactly this shape:

{
  "palette":    { "ink": "#RRGGBB", "paper": "#RRGGBB", "accent": "#RRGGBB", "accentSoft": "#RRGGBB", "highlight": "#RRGGBB" },
  "colorNames": { "ink": "...", "paper": "...", "accent": "...", "accentSoft": "...", "highlight": "..." },
  "type":       { "display": "<id>", "body": "<id>", "scale": 0.75-1.4, "tracking": "...", "case": "..." },
  "motif":      { "kind": "...", "density": 0.0-1.0, "placement": "..." },
  "frame":      { "style": "...", "radius": 0-240, "inset": 0-48 },
  "texture":    "...",
  "mood":       "one short sentence, under 140 characters"
}

ROLES
- ink        the main text colour. Must be clearly readable on paper (contrast ratio 4.5:1 or better).
- paper      the card background.
- accent     rules, small caps, ornament.
- accentSoft secondary text and hairlines; sits between ink and paper.
- highlight  one punch colour used sparingly.

When swatches extracted from the couple's photos are supplied, build the palette from THOSE colours — adjust them for contrast and role, but keep the photographs' character. Invent colours only when no swatches are given.

colorNames are evocative two-or-three-word names for each colour, the way a paint range names them ("Smoked Oyster", "Bitter Orange"). Never just "Dark Blue".

DISPLAY FONTS (pick one id for "display"):
${fontMenu(DISPLAY_FONT_IDS)}

BODY FONTS (pick one id for "body"):
${fontMenu(BODY_FONT_IDS)}

ENUMS — use these exact strings and nothing else:
  tracking:  ${TRACKINGS.join(' | ')}
  case:      ${CASES.join(' | ')}
  motif.kind:      ${MOTIF_KINDS.join(' | ')}
  motif.placement: ${MOTIF_PLACEMENTS.join(' | ')}
  frame.style:     ${FRAME_STYLES.join(' | ')}
  texture:         ${TEXTURES.join(' | ')}

GUIDANCE ON FORM — this is what makes the suite feel designed rather than boxed:
- frame.radius above ~80 with style "arch" gives a soft arched card; "rounded" with 20-60 softens the corners; "brush" is an irregular inked edge; "none" and "hairline" are for severe, modern or minimal themes.
- Match motif.kind to the theme's actual content: botanical for gardens and florals, wave for coastal, deco for jazz-age and geometric, arch for mediterranean and architectural, scatter for celestial, whimsical or night themes, linear for restrained modern, none when ornament would cheapen it.
- texture "paper" and "linen" suit warm, handmade, rustic or vintage themes; "wash" suits watercolour and romantic themes; "none" suits crisp modern ones.
- Do not default to the safe middle. A bold theme should produce a bold recipe, and two different themes must produce visibly different recipes.`

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let theme, swatches, imageUrls
  try {
    ;({ theme, swatches, imageUrls } = JSON.parse(event.body || '{}'))
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid request body' }) }
  }

  const themeText = (theme || '').toString().trim()
  if (!themeText && !(Array.isArray(imageUrls) && imageUrls.length) && !(Array.isArray(swatches) && swatches.length)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'Describe a theme, or add at least one inspiration photo.' }),
    }
  }

  const client = new Anthropic() // reads ANTHROPIC_API_KEY from env

  const content = []

  // Only http(s) URLs go to the vision API. Data URLs and blob: object URLs
  // can't be fetched by Anthropic, and the client already turned those into
  // swatches locally, so the colour information is not lost.
  const usableImages = (Array.isArray(imageUrls) ? imageUrls : [])
    .filter(u => typeof u === 'string' && /^https?:\/\//i.test(u))
    .slice(0, MAX_IMAGES)

  for (const url of usableImages) {
    content.push({ type: 'image', source: { type: 'url', url } })
  }

  const lines = []
  lines.push(themeText ? `Theme, in the couple's words: "${themeText}"` : 'The couple did not describe a theme in words — work entirely from the inspiration supplied.')

  if (Array.isArray(swatches) && swatches.length) {
    const list = swatches
      .filter(s => s && typeof s.hex === 'string')
      .slice(0, 10)
      .map(s => `  ${s.hex}${typeof s.population === 'number' ? ` (${Math.round(s.population * 100)}% of pixels)` : ''}`)
      .join('\n')
    if (list) {
      lines.push(`\nColours extracted from their inspiration photos, most dominant first:\n${list}\n\nBuild the palette from these.`)
    }
  }
  if (usableImages.length) {
    lines.push(`\n${usableImages.length} inspiration photo(s) are attached above — read their mood, materials and styling, not just their colour.`)
  }
  lines.push('\nReturn the JSON recipe.')

  content.push({ type: 'text', text: lines.join('\n') })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: SYSTEM,
      messages: [{ role: 'user', content }],
    })

    const raw = (response.content.find(b => b.type === 'text')?.text || '').trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch && !raw) throw new Error('Empty response from the model')

    const parsed = JSON.parse(jsonMatch?.[0] ?? raw)

    // Clamp server-side as well as on the client, so a bad field can never be
    // persisted to the database by a caller that forgot to validate.
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ recipe: validateRecipe(parsed), imagesRead: usableImages.length }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message || 'Derivation failed' }),
    }
  }
}
