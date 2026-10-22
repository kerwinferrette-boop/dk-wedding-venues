/**
 * Theme recipe — the single contract that describes a stationery look.
 *
 * There are deliberately NO presets in this file. A recipe is always derived
 * from what the user typed and the photos they supplied (see theme-derive.js),
 * or nudged by hand in the sidebar. Nothing here is specific to one wedding,
 * which is the point: drop in a different theme sentence and the whole suite
 * re-skins.
 *
 * Everything the renderers read lives on this object. If a renderer needs a new
 * knob, it gets added here with a default and a whitelist entry — never
 * hardcoded into a card.
 */

// ─── Whitelists ──────────────────────────────────────────────────────────────
// The model may only choose from these. Anything else gets clamped away by
// validateRecipe(), so a hallucinated font can never reach the DOM (and, more
// practically, can never 404 the Google Fonts request).

export const FONT_WHITELIST = [
  // Serif — the workhorses for formal stationery
  { id: 'cormorant',  label: 'Cormorant Garamond', google: 'Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400', stack: '"Cormorant Garamond", Georgia, serif',  role: 'both',    mood: 'airy, classical, high-contrast' },
  { id: 'eb-garamond',label: 'EB Garamond',        google: 'EB+Garamond:ital,wght@0,400;0,500;1,400',              stack: '"EB Garamond", Georgia, serif',          role: 'both',    mood: 'warm, bookish, old-world' },
  { id: 'playfair',   label: 'Playfair Display',   google: 'Playfair+Display:ital,wght@0,400;0,700;1,400',         stack: '"Playfair Display", Georgia, serif',     role: 'display', mood: 'dramatic, fashion, high-contrast' },
  { id: 'bodoni',     label: 'Bodoni Moda',        google: 'Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,700;1,6..96,400', stack: '"Bodoni Moda", Didot, serif',  role: 'display', mood: 'editorial, sharp, couture' },
  { id: 'dm-serif',   label: 'DM Serif Display',   google: 'DM+Serif+Display:ital@0;1',                            stack: '"DM Serif Display", Georgia, serif',     role: 'display', mood: 'confident, modern, weighty' },
  { id: 'spectral',   label: 'Spectral',           google: 'Spectral:ital,wght@0,300;0,400;1,300',                 stack: 'Spectral, Georgia, serif',               role: 'both',    mood: 'calm, literary, even' },
  { id: 'lora',       label: 'Lora',               google: 'Lora:ital,wght@0,400;0,600;1,400',                     stack: 'Lora, Georgia, serif',                   role: 'both',    mood: 'soft, contemporary, gentle' },
  { id: 'baskerville',label: 'Libre Baskerville',  google: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400',         stack: '"Libre Baskerville", Georgia, serif',    role: 'both',    mood: 'traditional, sturdy, printed' },

  // Display — distinctive voices
  { id: 'cinzel',     label: 'Cinzel',             google: 'Cinzel:wght@400;600;700',                              stack: 'Cinzel, "Times New Roman", serif',       role: 'display', mood: 'engraved, roman, ceremonial' },
  { id: 'italiana',   label: 'Italiana',           google: 'Italiana',                                             stack: 'Italiana, Didot, serif',                 role: 'display', mood: 'slender, deco, elegant' },
  { id: 'marcellus',  label: 'Marcellus',          google: 'Marcellus',                                            stack: 'Marcellus, Georgia, serif',              role: 'display', mood: 'carved, quiet, timeless' },
  { id: 'abril',      label: 'Abril Fatface',      google: 'Abril+Fatface',                                        stack: '"Abril Fatface", Georgia, serif',        role: 'display', mood: 'bold, vintage poster, loud' },

  // Script — for the couple's names
  { id: 'great-vibes',label: 'Great Vibes',        google: 'Great+Vibes',                                          stack: '"Great Vibes", cursive',                 role: 'display', mood: 'flowing, romantic, formal script' },
  { id: 'parisienne', label: 'Parisienne',         google: 'Parisienne',                                           stack: 'Parisienne, cursive',                    role: 'display', mood: 'casual script, playful, inked' },
  { id: 'pinyon',     label: 'Pinyon Script',      google: 'Pinyon+Script',                                        stack: '"Pinyon Script", cursive',               role: 'display', mood: 'copperplate, delicate, antique' },

  // Sans — modern counterweights
  { id: 'jost',       label: 'Jost',               google: 'Jost:ital,wght@0,300;0,400;0,500;1,300',               stack: 'Jost, Futura, sans-serif',               role: 'both',    mood: 'geometric, bauhaus, clean' },
  { id: 'karla',      label: 'Karla',              google: 'Karla:ital,wght@0,300;0,400;0,600;1,400',              stack: 'Karla, Helvetica, sans-serif',           role: 'body',    mood: 'grotesque, friendly, neutral' },
  { id: 'raleway',    label: 'Raleway',            google: 'Raleway:ital,wght@0,200;0,300;0,400;0,600;1,300',      stack: 'Raleway, Helvetica, sans-serif',         role: 'body',    mood: 'thin, airy, contemporary' },
]

export const FONT_IDS = FONT_WHITELIST.map(f => f.id)
export const DISPLAY_FONT_IDS = FONT_WHITELIST.filter(f => f.role !== 'body').map(f => f.id)
export const BODY_FONT_IDS = FONT_WHITELIST.filter(f => f.role !== 'display').map(f => f.id)

/** Resolve a whitelisted font id to a CSS font-family stack. */
export function fontStack(id, fallback = 'cormorant') {
  const hit = FONT_WHITELIST.find(f => f.id === id) || FONT_WHITELIST.find(f => f.id === fallback)
  return hit ? hit.stack : 'Georgia, serif'
}

/** One <link> href covering every whitelisted family — built, never hand-written. */
export function googleFontsHref() {
  const families = FONT_WHITELIST.map(f => `family=${f.google}`).join('&')
  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}

// Ornament vocabulary. These map to SVG components in src/components/motifs/.
export const MOTIF_KINDS = ['none', 'botanical', 'wave', 'arch', 'deco', 'linear', 'scatter']
export const MOTIF_PLACEMENTS = ['corners', 'header', 'frame', 'spine', 'footer']

// Frame styles. `arch` and `brush` are the main antidotes to the old look,
// which could only ever draw a hard inset rectangle.
export const FRAME_STYLES = ['none', 'hairline', 'double', 'arch', 'rounded', 'brush', 'bracket']
export const TEXTURES = ['none', 'paper', 'linen', 'wash']
export const TRACKINGS = ['tight', 'normal', 'wide', 'airy']
export const CASES = ['title', 'upper']

export const PALETTE_ROLES = ['ink', 'paper', 'accent', 'accentSoft', 'highlight']

/**
 * Neutral starting point. Intentionally plain — it is a blank sheet to derive
 * from, not a "look". If this ever starts resembling a particular wedding,
 * something has gone wrong.
 */
export const DEFAULT_RECIPE = {
  palette: {
    ink:        '#2B2824',
    paper:      '#FBF8F3',
    accent:     '#8C7A5E',
    accentSoft: '#B9AC97',
    highlight:  '#6E4B3A',
  },
  colorNames: {
    ink: 'Ink', paper: 'Paper', accent: 'Accent',
    accentSoft: 'Soft Accent', highlight: 'Highlight',
  },
  type: {
    display: 'cormorant',
    body: 'karla',
    scale: 1,
    tracking: 'wide',
    case: 'title',
  },
  motif:   { kind: 'none', density: 0.4, placement: 'corners' },
  frame:   { style: 'hairline', radius: 0, inset: 16 },
  texture: 'none',
  mood:    'Undecided — describe a theme to derive one.',
}

// ─── Validation ──────────────────────────────────────────────────────────────

const HEX = /^#[0-9a-fA-F]{6}$/

function clampNum(v, lo, hi, dflt) {
  const n = Number(v)
  if (!Number.isFinite(n)) return dflt
  return Math.min(hi, Math.max(lo, n))
}

function pick(v, allowed, dflt) {
  return allowed.includes(v) ? v : dflt
}

function hex(v, dflt) {
  if (typeof v !== 'string') return dflt
  let s = v.trim()
  if (/^[0-9a-fA-F]{6}$/.test(s)) s = `#${s}`
  // Expand #abc shorthand, which the model does occasionally emit.
  if (/^#[0-9a-fA-F]{3}$/.test(s)) s = '#' + s.slice(1).split('').map(c => c + c).join('')
  return HEX.test(s) ? s.toUpperCase() : dflt
}

/**
 * Coerce anything — a model response, a stale localStorage blob, a hand-edited
 * row from the database — into a recipe the renderers can trust. Never throws
 * and never returns a partial object; every field is present and in range.
 */
export function validateRecipe(raw) {
  const r = (raw && typeof raw === 'object') ? raw : {}
  const d = DEFAULT_RECIPE

  const palRaw = r.palette && typeof r.palette === 'object' ? r.palette : {}
  const palette = {}
  for (const role of PALETTE_ROLES) palette[role] = hex(palRaw[role], d.palette[role])

  const nameRaw = r.colorNames && typeof r.colorNames === 'object' ? r.colorNames : {}
  const colorNames = {}
  for (const role of PALETTE_ROLES) {
    const n = nameRaw[role]
    colorNames[role] = (typeof n === 'string' && n.trim()) ? n.trim().slice(0, 32) : d.colorNames[role]
  }

  const tRaw = r.type && typeof r.type === 'object' ? r.type : {}
  const type = {
    display:  pick(tRaw.display, DISPLAY_FONT_IDS, d.type.display),
    body:     pick(tRaw.body, BODY_FONT_IDS, d.type.body),
    scale:    clampNum(tRaw.scale, 0.75, 1.4, d.type.scale),
    tracking: pick(tRaw.tracking, TRACKINGS, d.type.tracking),
    case:     pick(tRaw.case, CASES, d.type.case),
  }

  const mRaw = r.motif && typeof r.motif === 'object' ? r.motif : {}
  const motif = {
    kind:      pick(mRaw.kind, MOTIF_KINDS, d.motif.kind),
    density:   clampNum(mRaw.density, 0, 1, d.motif.density),
    placement: pick(mRaw.placement, MOTIF_PLACEMENTS, d.motif.placement),
  }

  const fRaw = r.frame && typeof r.frame === 'object' ? r.frame : {}
  const frame = {
    style:  pick(fRaw.style, FRAME_STYLES, d.frame.style),
    radius: clampNum(fRaw.radius, 0, 240, d.frame.radius),
    inset:  clampNum(fRaw.inset, 0, 48, d.frame.inset),
  }

  const mood = (typeof r.mood === 'string' && r.mood.trim())
    ? r.mood.trim().slice(0, 160)
    : d.mood

  return { palette, colorNames, type, motif, frame, texture: pick(r.texture, TEXTURES, d.texture), mood }
}

// ─── Derived style helpers ───────────────────────────────────────────────────

const TRACKING_EM = { tight: '0.01em', normal: '0.06em', wide: '0.14em', airy: '0.26em' }

/** Letter-spacing for a recipe, optionally loosened for small caps runs. */
export function tracking(recipe, variant = 'base') {
  const base = TRACKING_EM[recipe.type.tracking] ?? TRACKING_EM.wide
  if (variant !== 'caps') return base
  // Small uppercase text needs more air than body copy at the same setting.
  const bump = { tight: '0.12em', normal: '0.18em', wide: '0.24em', airy: '0.34em' }
  return bump[recipe.type.tracking] ?? '0.24em'
}

/** Type scale in px. Keeps every card on one rhythm instead of ad-hoc sizes. */
export function size(recipe, step) {
  const steps = { micro: 8, tiny: 9.5, small: 11, body: 13, lead: 16, sub: 22, title: 34, hero: 46 }
  return Math.round((steps[step] ?? 13) * recipe.type.scale * 10) / 10
}

/** rgba() from a #RRGGBB hex plus alpha — safe for inline styles. */
export function alpha(hexColor, a) {
  const h = HEX.test(hexColor || '') ? hexColor : '#000000'
  const n = parseInt(h.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

/** Relative luminance (WCAG) — used to keep text legible on derived papers. */
export function luminance(hexColor) {
  const h = HEX.test(hexColor || '') ? hexColor : '#000000'
  const n = parseInt(h.slice(1), 16)
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

export function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * Guard against a derived palette that puts near-invisible ink on its paper.
 * Extraction from a photo can legitimately return two mid-tones, so rather
 * than refuse the palette we fall back to a near-black or near-white ink.
 */
export function readableInk(recipe) {
  const { ink, paper } = recipe.palette
  if (contrastRatio(ink, paper) >= 3.5) return ink
  return luminance(paper) > 0.5 ? '#1F1C19' : '#F7F3EC'
}
