/**
 * Dominant-colour extraction from inspiration photos.
 *
 * Runs entirely in the browser on a <canvas> — no API call, no cost, instant.
 * This is stage 1 of deriving a theme: we pull the actual colours out of the
 * photos, then (stage 2) hand those swatches to Claude to assign roles and
 * name them. Doing the pixel work here means the model never has to guess a
 * hex from a description of an image.
 *
 * Algorithm is median cut: repeatedly split the colour box with the widest
 * channel at that channel's median, until we have the requested number of
 * buckets, then average each bucket. Cheap, deterministic, and it keeps
 * saturated minority colours that a simple average would wash out to mud.
 */

/** Pixels are sampled, not read wholesale — 160px on the long edge is plenty. */
const SAMPLE_EDGE = 160

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Needed to read pixels back out of the canvas for remote URLs; a host
    // without permissive CORS will reject here and we surface that to the user.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load that image (the host may block cross-origin reads).'))
    img.src = src
  })
}

function toHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()
}

function channelRange(pixels, ch) {
  let lo = 255, hi = 0
  for (const p of pixels) {
    if (p[ch] < lo) lo = p[ch]
    if (p[ch] > hi) hi = p[ch]
  }
  return hi - lo
}

function medianCut(pixels, depth) {
  if (depth === 0 || pixels.length === 0) return [pixels]
  // Split on whichever channel varies most across this bucket.
  const ranges = [channelRange(pixels, 0), channelRange(pixels, 1), channelRange(pixels, 2)]
  const ch = ranges.indexOf(Math.max(...ranges))
  const sorted = [...pixels].sort((a, b) => a[ch] - b[ch])
  const mid = Math.floor(sorted.length / 2)
  return [
    ...medianCut(sorted.slice(0, mid), depth - 1),
    ...medianCut(sorted.slice(mid), depth - 1),
  ]
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

/**
 * Read one image and return its dominant swatches, most-populous first.
 * @param {string} src - object URL, data URL, or a CORS-readable remote URL.
 * @param {number} count - swatches to return (rounded up to a power of two internally).
 * @returns {Promise<Array<{hex, population, saturation, lightness}>>}
 */
export async function extractFromImage(src, count = 6) {
  const img = await loadImage(src)

  const scale = Math.min(1, SAMPLE_EDGE / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
  const w = Math.max(1, Math.round((img.naturalWidth || SAMPLE_EDGE) * scale))
  const h = Math.max(1, Math.round((img.naturalHeight || SAMPLE_EDGE) * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, w, h)

  let data
  try {
    data = ctx.getImageData(0, 0, w, h).data
  } catch {
    throw new Error('That image is cross-origin protected, so its colours can’t be read. Upload the file instead.')
  }

  const pixels = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 125) continue                      // skip transparency
    const r = data[i], g = data[i + 1], b = data[i + 2]
    // Drop near-white and near-black: they are almost always paper, blown
    // highlights or shadow, and they crowd out the colours worth having.
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    if (mx > 247 && mn > 247) continue
    if (mx < 12) continue
    pixels.push([r, g, b])
  }
  if (!pixels.length) throw new Error('No usable colour in that image.')

  const depth = Math.ceil(Math.log2(Math.max(2, count)))
  const buckets = medianCut(pixels, depth).filter(b => b.length)

  const swatches = buckets.map(bucket => {
    let r = 0, g = 0, b = 0
    for (const p of bucket) { r += p[0]; g += p[1]; b += p[2] }
    const n = bucket.length
    const [, s, l] = rgbToHsl(r / n, g / n, b / n)
    return {
      hex: toHex(r / n, g / n, b / n),
      population: n / pixels.length,
      saturation: s,
      lightness: l,
    }
  })

  return swatches.sort((a, b) => b.population - a.population).slice(0, count)
}

/**
 * Extract across several images and merge. Near-duplicate swatches are folded
 * together (summing their weight) so three photos of the same room don't
 * return the same beige six times.
 */
export async function extractFromImages(sources, perImage = 6, total = 8) {
  const results = await Promise.allSettled(sources.map(s => extractFromImage(s, perImage)))
  const all = []
  const errors = []
  results.forEach((res, i) => {
    if (res.status === 'fulfilled') all.push(...res.value)
    else errors.push({ source: sources[i], message: res.reason?.message || 'failed' })
  })
  if (!all.length) return { swatches: [], errors }

  const merged = []
  for (const sw of all.sort((a, b) => b.population - a.population)) {
    const near = merged.find(m => colourDistance(m.hex, sw.hex) < 34)
    if (near) near.population += sw.population
    else merged.push({ ...sw })
  }

  const totalPop = merged.reduce((s, m) => s + m.population, 0) || 1
  const swatches = merged
    .sort((a, b) => b.population - a.population)
    .slice(0, total)
    .map(m => ({ ...m, population: Math.round((m.population / totalPop) * 1000) / 1000 }))

  return { swatches, errors }
}

/** Plain euclidean RGB distance — good enough for de-duplicating swatches. */
export function colourDistance(a, b) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const dr = ((pa >> 16) & 255) - ((pb >> 16) & 255)
  const dg = ((pa >> 8) & 255) - ((pb >> 8) & 255)
  const db = (pa & 255) - (pb & 255)
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

/**
 * Role assignment without the model — the offline fallback used when the
 * derive call fails, and the starting point the model is asked to improve on.
 * Darkest readable swatch becomes ink, lightest becomes paper, the most
 * saturated becomes the highlight.
 */
export function swatchesToPalette(swatches) {
  if (!swatches?.length) return null
  const byLight = [...swatches].sort((a, b) => a.lightness - b.lightness)
  const bySat = [...swatches].sort((a, b) => b.saturation - a.saturation)

  const ink = byLight[0].hex
  const paper = byLight[byLight.length - 1].hex
  const highlight = bySat[0].hex
  const mid = byLight[Math.floor(byLight.length / 2)]
  const accent = (mid.hex === ink || mid.hex === paper) ? highlight : mid.hex
  const softIdx = Math.max(0, Math.floor(byLight.length * 0.7) - 1)

  return {
    ink,
    paper,
    accent,
    accentSoft: byLight[softIdx]?.hex ?? accent,
    highlight,
  }
}
