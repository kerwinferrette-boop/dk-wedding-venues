/**
 * Theme & Design Studio — stationery generator.
 *
 * There are no presets here, by design. The entire look of every piece comes
 * from one `recipe` object (see src/lib/themeRecipe.js) which is derived from
 * what the couple types and the photos they supply. Swap the theme sentence
 * and the whole suite re-skins; nothing about any particular wedding is baked
 * into this file.
 *
 * Pipeline:
 *   1. paletteExtract.js pulls dominant colours out of the photos, in-browser.
 *   2. netlify/functions/theme-derive.js hands those swatches + the theme text
 *      to Claude, which assigns roles, names the colours and picks the form.
 *   3. validateRecipe() clamps the result; the renderers below read it.
 *
 * Renderers are parameterised, not hand-drawn per look — which is what makes
 * an arched, textured, ornamented card possible at all.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Motif from '../components/motifs'
import {
  DEFAULT_RECIPE, validateRecipe, fontStack, googleFontsHref,
  FONT_WHITELIST, DISPLAY_FONT_IDS, BODY_FONT_IDS,
  MOTIF_KINDS, MOTIF_PLACEMENTS, FRAME_STYLES, TEXTURES, TRACKINGS, CASES,
  PALETTE_ROLES, tracking, size, alpha, readableInk, contrastRatio,
} from '../lib/themeRecipe'
import { extractFromImages, swatchesToPalette } from '../lib/paletteExtract'

// ─── Content ─────────────────────────────────────────────────────────────────
// Wording only. Nothing here affects the look.

const DEFAULT_TEXT = {
  p1: 'Kerwin',
  p2: 'Danielle',
  lastName: 'Ferrette & Gaumer',
  date: 'March 27, 2027',
  shortDate: '3 · 27 · 27',
  day: 'Saturday',
  ceremony: 'Four o\'clock in the afternoon',
  cocktails: 'Five o\'clock · Ocean View Terrace',
  reception: 'Six o\'clock · La Sala Ballroom',
  venue: 'La Valencia Hotel',
  street: '1132 Prospect Street',
  city: 'La Jolla, California',
  rsvpDate: 'February 1, 2027',
  dress: 'Black Tie Optional',
  site: 'DKWedding2027.com',
  menuFirst: 'Garden Salad\nmixed greens, shaved parmesan\nchampagne vinaigrette',
  menuMain1: 'Filet Mignon\ntruffle butter, roasted fingerlings\nharicots verts',
  menuMain2: 'Pan Seared Halibut\ncitrus beurre blanc\nseasonal vegetables',
  menuDessert: 'Wedding Cake\nchampagne & vanilla',
}

// Each piece carries its own trim size, so the suite doesn't read as five
// copies of one box.
const PIECES = [
  { id: 'std',     label: 'Save the Date', w: 420, h: 588 },
  { id: 'invite',  label: 'Invitation',    w: 420, h: 588 },
  { id: 'rsvp',    label: 'RSVP Card',     w: 420, h: 300 },
  { id: 'menu',    label: 'Dinner Menu',   w: 340, h: 620 },
  { id: 'welcome', label: 'Welcome Sign',  w: 450, h: 640 },
]

const STORAGE_KEY = 'dk_theme_recipe'
const PIN_KEY = 'dk_theme_pinned'
const INSPO_BUCKET = 'inspo'

// ─── Card primitives ─────────────────────────────────────────────────────────

/** Border-radius for the paper itself. This is the main anti-rectangle lever. */
function shellRadius(recipe) {
  const { style, radius: r } = recipe.frame
  if (style === 'arch') {
    // An arch with no radius is just a rectangle, so enforce a real curve.
    const a = Math.max(r, 70)
    return `${a}px ${a}px ${Math.min(Math.round(a * 0.12), 14)}px ${Math.min(Math.round(a * 0.12), 14)}px`
  }
  if (style === 'rounded') return `${r}px`
  if (style === 'brush') {
    // Asymmetric radii read as a torn / inked edge rather than a machined one.
    const b = Math.max(r, 24)
    return `${b * 0.9}px ${b * 0.5}px ${b * 0.8}px ${b * 0.6}px / ${b * 0.6}px ${b * 0.9}px ${b * 0.5}px ${b * 0.8}px`
  }
  return '0px'
}

/** Subtle surface treatment over the paper. Pure CSS/SVG, no image assets. */
function Texture({ recipe }) {
  const { texture, palette } = recipe
  if (texture === 'none') return null

  const base = { position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit' }

  if (texture === 'paper') {
    const noise = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="140" height="140" filter="url(#n)" opacity="0.5"/></svg>`
    )
    return <div style={{ ...base, backgroundImage: `url("data:image/svg+xml,${noise}")`, opacity: 0.11, mixBlendMode: 'multiply' }} />
  }

  if (texture === 'linen') {
    const c = alpha(palette.ink, 0.045)
    return (
      <div style={{
        ...base,
        backgroundImage: `repeating-linear-gradient(90deg, ${c} 0 1px, transparent 1px 4px), repeating-linear-gradient(0deg, ${c} 0 1px, transparent 1px 4px)`,
      }} />
    )
  }

  // wash — soft pooled colour, like watercolour settling on the sheet
  return (
    <div style={{
      ...base,
      backgroundImage:
        `radial-gradient(60% 45% at 18% 12%, ${alpha(palette.highlight, 0.16)} 0%, transparent 70%),` +
        `radial-gradient(55% 40% at 85% 80%, ${alpha(palette.accent, 0.18)} 0%, transparent 72%),` +
        `radial-gradient(45% 35% at 70% 20%, ${alpha(palette.accentSoft, 0.14)} 0%, transparent 70%)`,
    }} />
  )
}

/** The decorative line(s) sitting inside the trim. */
function FrameLines({ recipe }) {
  const { frame, palette } = recipe
  const { style, inset } = frame
  if (style === 'none' || style === 'brush') return null

  const line = alpha(palette.accent, 0.55)
  const inner = { position: 'absolute', inset, pointerEvents: 'none' }
  // Inner lines follow the shell's curve, scaled down so they stay concentric.
  const r = style === 'arch'
    ? `${Math.max(frame.radius, 70) - inset}px ${Math.max(frame.radius, 70) - inset}px 4px 4px`
    : style === 'rounded'
      ? `${Math.max(0, frame.radius - inset)}px`
      : '0px'

  if (style === 'bracket') {
    const arm = 26
    const corners = [
      { top: inset, left: inset, borderTop: `1px solid ${line}`, borderLeft: `1px solid ${line}` },
      { top: inset, right: inset, borderTop: `1px solid ${line}`, borderRight: `1px solid ${line}` },
      { bottom: inset, left: inset, borderBottom: `1px solid ${line}`, borderLeft: `1px solid ${line}` },
      { bottom: inset, right: inset, borderBottom: `1px solid ${line}`, borderRight: `1px solid ${line}` },
    ]
    return <>{corners.map((s, i) => <div key={i} style={{ position: 'absolute', width: arm, height: arm, pointerEvents: 'none', ...s }} />)}</>
  }

  return (
    <>
      <div style={{ ...inner, border: `1px solid ${line}`, borderRadius: r }} />
      {style === 'double' && (
        <div style={{ position: 'absolute', inset: inset + 5, border: `0.5px solid ${alpha(palette.accent, 0.3)}`, borderRadius: r, pointerEvents: 'none' }} />
      )}
    </>
  )
}

/** Ornament, positioned per the recipe. Density drives size and opacity. */
function MotifLayer({ recipe, w, h }) {
  const { motif, palette } = recipe
  if (motif.kind === 'none') return null

  const d = motif.density
  const op = 0.3 + d * 0.6
  // Keep ornament proportional to the piece — a motif sized for a welcome
  // sign swamps an RSVP card.
  const s = Math.round(Math.min(48 + d * 60, w * 0.26))
  const color = palette.accent
  const wrap = (style, key, extra = {}) => (
    <div key={key} style={{ position: 'absolute', pointerEvents: 'none', ...style }}>
      <Motif kind={motif.kind} color={color} opacity={op} size={s} {...extra} />
    </div>
  )

  // The sheet clips to its own border-radius, so corner ornament has to clear
  // the curve or it gets sliced in half. An arched top is the extreme case.
  const { style: fStyle, radius, inset } = recipe.frame
  const topCurve = fStyle === 'arch' ? Math.max(radius, 70) : fStyle === 'rounded' ? radius : 0
  const pad = inset + 8
  const topClear = Math.round(Math.max(pad, topCurve * 0.42))
  const botClear = fStyle === 'arch' ? pad : Math.round(Math.max(pad, topCurve * 0.42))

  switch (motif.placement) {
    case 'header':
      return wrap({ top: Math.round(Math.max(h * 0.07, topCurve * 0.3)), left: '50%', transform: 'translateX(-50%)' }, 'h')
    case 'footer':
      return wrap({ bottom: Math.round(h * 0.05), left: '50%', transform: 'translateX(-50%)' }, 'f')
    case 'spine':
      return wrap({ top: '50%', left: pad, transform: 'translateY(-50%)' }, 's')
    case 'frame':
      return (
        <>
          {wrap({ top: topClear, left: '50%', transform: 'translateX(-50%)' }, 'ft')}
          {wrap({ bottom: botClear, left: '50%', transform: 'translateX(-50%) rotate(180deg)' }, 'fb')}
        </>
      )
    case 'corners':
    default:
      // Mirrored rather than rotated: a 180-degree arch or sprig reads as a
      // mistake, a mirrored one reads as a matched pair.
      return (
        <>
          {wrap({ top: topClear, left: pad }, 'tl')}
          {wrap({ bottom: botClear, right: pad, transform: 'scaleX(-1)' }, 'br')}
        </>
      )
  }
}

/** The paper. Every piece renders inside one of these. */
function Sheet({ recipe, w, h, children }) {
  const ink = readableInk(recipe)
  return (
    <div
      style={{
        width: w, minHeight: h, position: 'relative', overflow: 'hidden',
        background: recipe.palette.paper,
        color: ink,
        borderRadius: shellRadius(recipe),
        fontFamily: fontStack(recipe.type.body, 'karla'),
        boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: `${Math.round(h * 0.09)}px ${Math.round(w * 0.11)}px`,
        boxShadow: '0 24px 60px rgba(32, 24, 14, 0.26), 0 2px 6px rgba(32, 24, 14, 0.10)',
        transition: 'border-radius 220ms ease, background 220ms ease',
      }}
    >
      <Texture recipe={recipe} />
      <MotifLayer recipe={recipe} w={w} h={h} />
      <FrameLines recipe={recipe} />
      <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {children}
      </div>
    </div>
  )
}

/** Small letterspaced caps — labels, dates, directions. */
function Caps({ recipe, step = 'tiny', color, children, style }) {
  return (
    <div style={{
      fontSize: size(recipe, step),
      letterSpacing: tracking(recipe, 'caps'),
      textTransform: 'uppercase',
      color: color || alpha(readableInk(recipe), 0.72),
      fontFamily: fontStack(recipe.type.body, 'karla'),
      textAlign: 'center',
      ...style,
    }}>
      {children}
    </div>
  )
}

/** Display type — names, headlines. */
function Display({ recipe, step = 'title', color, children, style }) {
  return (
    <div style={{
      fontSize: size(recipe, step),
      fontFamily: fontStack(recipe.type.display, 'cormorant'),
      letterSpacing: tracking(recipe),
      lineHeight: 1.08,
      color: color || readableInk(recipe),
      textAlign: 'center',
      // CSS, not a JS string transform: children are often an array of nodes
      // ("{a} & {b}"), and stringifying those inserts stray commas.
      textTransform: recipe.type.case === 'upper' ? 'uppercase' : 'none',
      ...style,
    }}>
      {children}
    </div>
  )
}

/** Body copy. */
function Body({ recipe, step = 'body', color, children, style }) {
  return (
    <div style={{
      fontSize: size(recipe, step),
      fontFamily: fontStack(recipe.type.body, 'karla'),
      letterSpacing: tracking(recipe),
      lineHeight: 1.55,
      color: color || alpha(readableInk(recipe), 0.82),
      textAlign: 'center',
      whiteSpace: 'pre-line',
      ...style,
    }}>
      {children}
    </div>
  )
}

/** Divider. Picks up the motif when one is set, otherwise a plain hairline. */
function Rule({ recipe, width = 84, ornament = false, margin = 18 }) {
  const c = recipe.palette.accent
  if (ornament && recipe.motif.kind !== 'none') {
    return (
      <div style={{ margin: `${margin}px auto`, display: 'flex', justifyContent: 'center' }}>
        <Motif kind="linear" color={c} opacity={0.8} size={width * 1.6} />
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: `${margin}px auto`, width }}>
      <div style={{ flex: 1, height: 1, background: alpha(c, 0.5) }} />
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: alpha(c, 0.8) }} />
      <div style={{ flex: 1, height: 1, background: alpha(c, 0.5) }} />
    </div>
  )
}

// ─── The five pieces ─────────────────────────────────────────────────────────
// Each one is layout only. All colour, type, ornament and form decisions come
// from the recipe, which is why a new theme restyles every piece at once.

function CoupleNames({ recipe, t, step = 'title' }) {
  const script = ['great-vibes', 'parisienne', 'pinyon'].includes(recipe.type.display)
  return (
    <>
      <Display recipe={recipe} step={step}>{t.p1}</Display>
      <Display
        recipe={recipe}
        step="sub"
        color={recipe.palette.accent}
        style={{ margin: script ? '-2px 0' : '4px 0', fontStyle: script ? 'normal' : 'italic' }}
      >
        &amp;
      </Display>
      <Display recipe={recipe} step={step}>{t.p2}</Display>
    </>
  )
}

function StdCard({ t, recipe, w, h }) {
  return (
    <Sheet recipe={recipe} w={w} h={h}>
      <Caps recipe={recipe} step="micro" color={recipe.palette.accent}>Save the Date</Caps>
      <div style={{ height: 20 }} />
      <CoupleNames recipe={recipe} t={t} />
      <Rule recipe={recipe} ornament margin={20} />
      <Caps recipe={recipe} step="small">{t.day} · {t.date}</Caps>
      <Rule recipe={recipe} width={64} margin={16} />
      <Caps recipe={recipe} step="tiny" color={recipe.palette.accent}>{t.venue}</Caps>
      <Caps recipe={recipe} step="micro" style={{ marginTop: 3 }}>{t.city}</Caps>
      <div style={{ height: 22 }} />
      <Caps recipe={recipe} step="micro" color={alpha(recipe.palette.accentSoft, 0.95)}>Formal Invitation to Follow</Caps>
      <Caps recipe={recipe} step="micro" style={{ marginTop: 6, color: alpha(readableInk(recipe), 0.45) }}>{t.site}</Caps>
    </Sheet>
  )
}

function InviteCard({ t, recipe, w, h }) {
  return (
    <Sheet recipe={recipe} w={w} h={h}>
      <Caps recipe={recipe} step="micro" color={recipe.palette.accent}>Together with their families</Caps>
      <div style={{ height: 16 }} />
      <CoupleNames recipe={recipe} t={t} />
      <div style={{ height: 10 }} />
      <Caps recipe={recipe} step="micro">request the pleasure of your company</Caps>
      <Rule recipe={recipe} ornament margin={18} />
      <Caps recipe={recipe} step="small" color={recipe.palette.highlight}>{t.day}, {t.date}</Caps>
      <Body recipe={recipe} step="small" style={{ marginTop: 8 }}>{t.ceremony}</Body>
      <Rule recipe={recipe} width={58} margin={16} />
      <Display recipe={recipe} step="lead" style={{ letterSpacing: tracking(recipe, 'caps') }}>{t.venue}</Display>
      <Body recipe={recipe} step="small" style={{ marginTop: 4 }}>{t.street}{'\n'}{t.city}</Body>
      <div style={{ height: 18 }} />
      <Caps recipe={recipe} step="micro" color={recipe.palette.accent}>{t.dress}</Caps>
    </Sheet>
  )
}

function RsvpCard({ t, recipe, w, h }) {
  const line = alpha(readableInk(recipe), 0.28)
  const blank = (label) => (
    <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 8, width: '100%', marginTop: 11 }}>
      <span style={{
        fontSize: size(recipe, 'micro'), letterSpacing: tracking(recipe, 'caps'),
        textTransform: 'uppercase', color: alpha(readableInk(recipe), 0.6), whiteSpace: 'nowrap',
        fontFamily: fontStack(recipe.type.body, 'karla'),
      }}>{label}</span>
      <span style={{ flex: 1, borderBottom: `1px solid ${line}`, height: 1 }} />
    </div>
  )
  return (
    <Sheet recipe={recipe} w={w} h={h}>
      <Caps recipe={recipe} step="micro" color={recipe.palette.accent}>Kindly Reply By</Caps>
      <Display recipe={recipe} step="sub" style={{ marginTop: 5 }}>{t.rsvpDate}</Display>
      <Rule recipe={recipe} width={54} margin={13} />
      <div style={{ width: '100%' }}>
        {blank('Name')}
        {blank('Accepts')}
        {blank('Regrets')}
      </div>
      <Caps recipe={recipe} step="micro" style={{ marginTop: 16, color: alpha(readableInk(recipe), 0.45) }}>{t.site}</Caps>
    </Sheet>
  )
}

function MenuCard({ t, recipe, w, h }) {
  const course = (label, body, i) => {
    const [dish, ...rest] = String(body || '').split('\n')
    return (
      <div key={i} style={{ marginTop: i === 0 ? 0 : 16, width: '100%' }}>
        <Caps recipe={recipe} step="micro" color={recipe.palette.accent}>{label}</Caps>
        <Display recipe={recipe} step="lead" style={{ marginTop: 4 }}>{dish}</Display>
        {rest.length > 0 && (
          <Body recipe={recipe} step="tiny" style={{ marginTop: 3, fontStyle: 'italic' }}>{rest.join('\n')}</Body>
        )}
      </div>
    )
  }
  return (
    <Sheet recipe={recipe} w={w} h={h}>
      <Display recipe={recipe} step="sub">{t.p1} &amp; {t.p2}</Display>
      <Caps recipe={recipe} step="micro" style={{ marginTop: 5 }}>{t.shortDate}</Caps>
      <Rule recipe={recipe} ornament margin={16} />
      <Caps recipe={recipe} step="small" color={recipe.palette.highlight}>Dinner</Caps>
      <div style={{ height: 12 }} />
      {course('First', t.menuFirst, 0)}
      {course('Main', t.menuMain1, 1)}
      {course('Main', t.menuMain2, 2)}
      {course('Dessert', t.menuDessert, 3)}
    </Sheet>
  )
}

function WelcomeCard({ t, recipe, w, h }) {
  return (
    <Sheet recipe={recipe} w={w} h={h}>
      <Caps recipe={recipe} step="small" color={recipe.palette.accent}>Welcome to the wedding of</Caps>
      <div style={{ height: 22 }} />
      <CoupleNames recipe={recipe} t={t} step="hero" />
      <Rule recipe={recipe} ornament width={110} margin={24} />
      <Caps recipe={recipe} step="small">{t.day} · {t.date}</Caps>
      <div style={{ height: 24 }} />
      {[['Ceremony', t.ceremony], ['Cocktails', t.cocktails], ['Reception', t.reception]].map(([k, v]) => (
        <div key={k} style={{ marginTop: 11, textAlign: 'center' }}>
          <Caps recipe={recipe} step="micro" color={recipe.palette.accent}>{k}</Caps>
          <Body recipe={recipe} step="small" style={{ marginTop: 2 }}>{v}</Body>
        </div>
      ))}
      <div style={{ height: 20 }} />
      <Caps recipe={recipe} step="micro" style={{ color: alpha(readableInk(recipe), 0.5) }}>{t.venue} · {t.city}</Caps>
    </Sheet>
  )
}

const PIECE_MAP = { std: StdCard, invite: InviteCard, rsvp: RsvpCard, menu: MenuCard, welcome: WelcomeCard }

// ─── Sidebar controls ────────────────────────────────────────────────────────
// Styled with the app's own tokens rather than a bespoke dark panel, so the
// studio reads as part of the site instead of a tool bolted onto it.

const UI = {
  input: {
    width: '100%', boxSizing: 'border-box', background: 'var(--card)',
    border: '1px solid var(--gold-border)', borderRadius: 7, padding: '7px 9px',
    fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text)', outline: 'none',
  },
  label: {
    fontSize: 9, letterSpacing: '0.16em', color: 'var(--text-muted)',
    textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: 4, display: 'block',
  },
  section: {
    fontSize: 9, letterSpacing: '0.24em', color: 'var(--gold)', textTransform: 'uppercase',
    fontFamily: 'DM Sans', borderBottom: '1px solid var(--gold-border)',
    paddingBottom: 6, marginBottom: 11, marginTop: 16,
  },
  solid: {
    background: 'var(--gold)', border: 'none', color: 'var(--card)', borderRadius: 7,
    padding: '9px 12px', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  ghost: {
    background: 'transparent', border: '1px solid var(--gold-border)', color: 'var(--gold)',
    borderRadius: 7, padding: '7px 10px', fontFamily: 'DM Sans', fontSize: 11, cursor: 'pointer',
  },
}

function Field({ label, children }) {
  return <div style={{ marginBottom: 10 }}><label style={UI.label}>{label}</label>{children}</div>
}

function Select({ label, value, options, onChange, format = (x) => x }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...UI.input, cursor: 'pointer' }}>
        {options.map(o => <option key={o} value={o}>{format(o)}</option>)}
      </select>
    </Field>
  )
}

function Slider({ label, value, min, max, step, onChange, display }) {
  return (
    <Field label={`${label} · ${display ?? value}`}>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--gold)' }}
      />
    </Field>
  )
}

/** Theme tab — the prompt, the photos, and the Derive button. */
function ThemePanel({
  themeText, setThemeText, photos, addPhotoUrl, addPhotoFiles, removePhoto,
  swatches, deriving, onDerive, error, mood, uploading,
}) {
  const [urlInput, setUrlInput] = useState('')
  const fileRef = useRef(null)

  return (
    <>
      <div style={UI.section}>Describe the theme</div>
      <textarea
        value={themeText}
        onChange={(e) => setThemeText(e.target.value)}
        rows={4}
        placeholder={'In your own words — e.g. "1970s desert sunset, terracotta and dusty rose, lots of candlelight"'}
        style={{ ...UI.input, resize: 'vertical', minHeight: 74, lineHeight: 1.45 }}
      />

      <div style={UI.section}>Inspiration photos</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button style={{ ...UI.ghost, flex: 1 }} onClick={() => fileRef.current?.click()}>
          {uploading ? 'Uploading…' : '↑ Upload'}
        </button>
        <input
          ref={fileRef} type="file" accept="image/*" multiple hidden
          onChange={(e) => { addPhotoFiles([...e.target.files]); e.target.value = '' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && urlInput.trim()) { addPhotoUrl(urlInput.trim()); setUrlInput('') } }}
          placeholder="…or paste an image URL"
          style={{ ...UI.input, flex: 1 }}
        />
        <button
          style={UI.ghost}
          onClick={() => { if (urlInput.trim()) { addPhotoUrl(urlInput.trim()); setUrlInput('') } }}
        >Add</button>
      </div>

      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
          {photos.map(p => (
            <div key={p.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--gold-border)' }}>
              <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button
                onClick={() => removePhoto(p.id)}
                title="Remove"
                style={{
                  position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%',
                  border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12,
                  cursor: 'pointer', lineHeight: 1, padding: 0,
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {swatches.length > 0 && (
        <>
          <label style={UI.label}>Extracted from your photos</label>
          <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', marginBottom: 10, height: 26, border: '1px solid var(--gold-border)' }}>
            {swatches.map((s, i) => (
              <div key={i} title={`${s.hex} · ${Math.round(s.population * 100)}%`}
                style={{ flex: Math.max(0.4, s.population * 6), background: s.hex }} />
            ))}
          </div>
        </>
      )}

      <button
        style={{ ...UI.solid, width: '100%', opacity: deriving ? 0.6 : 1, cursor: deriving ? 'wait' : 'pointer' }}
        disabled={deriving}
        onClick={onDerive}
      >
        {deriving ? 'Deriving…' : '✦ Derive the look'}
      </button>
      <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'DM Sans', marginTop: 6, lineHeight: 1.5 }}>
        Reads your words and photos, then sets the palette, type, ornament and card shape. Runs only when you press it.
      </div>

      {error && (
        <div style={{ marginTop: 10, padding: 9, borderRadius: 7, background: 'rgba(224,112,112,0.12)', color: 'var(--red)', fontFamily: 'DM Sans', fontSize: 11, lineHeight: 1.45 }}>
          {error}
        </div>
      )}
      {mood && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 7, background: 'var(--card)', border: '1px solid var(--gold-border)', fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
          “{mood}”
        </div>
      )}
    </>
  )
}

/** Palette tab — five pickers, each labelled with the derived colour name. */
function PalettePanel({ recipe, patch }) {
  const warn = contrastRatio(recipe.palette.ink, recipe.palette.paper) < 4.5
  return (
    <>
      <div style={UI.section}>Palette</div>
      {PALETTE_ROLES.map(role => (
        <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
          <input
            type="color"
            value={recipe.palette[role]}
            onChange={(e) => patch({ palette: { ...recipe.palette, [role]: e.target.value.toUpperCase() } })}
            style={{ width: 32, height: 32, border: '1px solid var(--gold-border)', background: 'none', cursor: 'pointer', padding: 2, borderRadius: 6, flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text)', fontFamily: 'DM Sans', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {recipe.colorNames[role]}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'DM Sans', letterSpacing: '0.06em' }}>
              {role} · {recipe.palette[role]}
            </div>
          </div>
        </div>
      ))}
      {warn && (
        <div style={{ marginTop: 4, fontSize: 10, color: 'var(--yellow)', fontFamily: 'DM Sans', lineHeight: 1.45 }}>
          Ink on paper is below 4.5:1 — the preview substitutes a readable ink so text stays legible.
        </div>
      )}
    </>
  )
}

/** Type & Form tab — everything about shape and lettering. */
function FormPanel({ recipe, patch }) {
  const fontLabel = (id) => FONT_WHITELIST.find(f => f.id === id)?.label ?? id
  const t = recipe.type

  return (
    <>
      <div style={UI.section}>Type</div>
      <Select label="Display font" value={t.display} options={DISPLAY_FONT_IDS} format={fontLabel}
        onChange={(v) => patch({ type: { ...t, display: v } })} />
      <Select label="Body font" value={t.body} options={BODY_FONT_IDS} format={fontLabel}
        onChange={(v) => patch({ type: { ...t, body: v } })} />
      <Slider label="Scale" value={t.scale} min={0.75} max={1.4} step={0.05} display={`${t.scale.toFixed(2)}×`}
        onChange={(v) => patch({ type: { ...t, scale: v } })} />
      <Select label="Letter spacing" value={t.tracking} options={TRACKINGS}
        onChange={(v) => patch({ type: { ...t, tracking: v } })} />
      <Select label="Headline case" value={t.case} options={CASES}
        format={(c) => (c === 'upper' ? 'Uppercase' : 'Title case')}
        onChange={(v) => patch({ type: { ...t, case: v } })} />

      <div style={UI.section}>Card shape</div>
      <Select label="Edge" value={recipe.frame.style} options={FRAME_STYLES}
        onChange={(v) => patch({ frame: { ...recipe.frame, style: v } })} />
      <Slider label="Corner radius" value={recipe.frame.radius} min={0} max={240} step={2} display={`${recipe.frame.radius}px`}
        onChange={(v) => patch({ frame: { ...recipe.frame, radius: v } })} />
      <Slider label="Border inset" value={recipe.frame.inset} min={0} max={48} step={1} display={`${recipe.frame.inset}px`}
        onChange={(v) => patch({ frame: { ...recipe.frame, inset: v } })} />

      <div style={UI.section}>Ornament</div>
      <Select label="Motif" value={recipe.motif.kind} options={MOTIF_KINDS}
        onChange={(v) => patch({ motif: { ...recipe.motif, kind: v } })} />
      <Select label="Placement" value={recipe.motif.placement} options={MOTIF_PLACEMENTS}
        onChange={(v) => patch({ motif: { ...recipe.motif, placement: v } })} />
      <Slider label="Density" value={recipe.motif.density} min={0} max={1} step={0.05} display={recipe.motif.density.toFixed(2)}
        onChange={(v) => patch({ motif: { ...recipe.motif, density: v } })} />

      <div style={UI.section}>Surface</div>
      <Select label="Texture" value={recipe.texture} options={TEXTURES}
        onChange={(v) => patch({ texture: v })} />
    </>
  )
}

/** Text tab — wording only. */
function TextPanel({ text, setText }) {
  const F = ({ label, k, multiline }) => (
    <Field label={label}>
      {multiline
        ? <textarea value={text[k]} onChange={(e) => setText(p => ({ ...p, [k]: e.target.value }))} rows={3} style={{ ...UI.input, resize: 'vertical', fontSize: 11 }} />
        : <input value={text[k]} onChange={(e) => setText(p => ({ ...p, [k]: e.target.value }))} style={UI.input} />}
    </Field>
  )
  return (
    <>
      <div style={UI.section}>The couple</div>
      <F label="Partner 1" k="p1" /><F label="Partner 2" k="p2" /><F label="Last names" k="lastName" />
      <div style={UI.section}>Date &amp; time</div>
      <F label="Full date" k="date" /><F label="Short date" k="shortDate" /><F label="Day of week" k="day" />
      <F label="Ceremony" k="ceremony" /><F label="Cocktails" k="cocktails" /><F label="Reception" k="reception" />
      <F label="RSVP deadline" k="rsvpDate" />
      <div style={UI.section}>Venue</div>
      <F label="Venue name" k="venue" /><F label="Street" k="street" /><F label="City, state" k="city" />
      <div style={UI.section}>Details</div>
      <F label="Dress code" k="dress" /><F label="Website" k="site" />
      <div style={UI.section}>Menu (line 1 = dish)</div>
      <F label="First course" k="menuFirst" multiline /><F label="Main 1" k="menuMain1" multiline />
      <F label="Main 2" k="menuMain2" multiline /><F label="Dessert" k="menuDessert" multiline />
    </>
  )
}

/** Pinterest boards. Kept, minus the hardcoded style searches — those were
 *  presets wearing a different hat. */
function InspoPanel() {
  const [input, setInput] = useState('')
  const [boards, setBoards] = useState([])
  const [open, setOpen] = useState(null)

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem('dk_pin_boards') || '[]'); if (s.length) setBoards(s) } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('dk_pin_boards', JSON.stringify(boards)) } catch {}
  }, [boards])
  useEffect(() => {
    if (!open) return
    if (!document.querySelector('script[src*="pinit.js"]')) {
      const s = document.createElement('script')
      s.async = true; s.defer = true; s.src = 'https://assets.pinterest.com/js/pinit.js'
      document.head.appendChild(s)
    } else if (window.parsePins) window.parsePins()
  }, [open])

  const add = () => {
    const url = input.trim()
    if (!url.includes('pinterest')) return
    setBoards(p => [...p.filter(b => b !== url), url])
    setInput('')
  }

  return (
    <>
      <div style={UI.section}>Pinterest boards</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input style={{ ...UI.input, flex: 1 }} placeholder="Paste a board URL…" value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button style={UI.ghost} onClick={add}>Add</button>
      </div>
      {boards.map((url, i) => (
        <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 6 }}>
          <button style={{ ...UI.ghost, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10 }}
            onClick={() => setOpen(open === url ? null : url)}>
            {open === url ? '▼' : '▶'} {url.replace(/https?:\/\/(www\.)?pinterest\.com\//, '').replace(/\/$/, '') || url}
          </button>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14 }}
            onClick={() => setBoards(p => p.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      {open && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--gold-border)', paddingTop: 10 }}>
          <a data-pin-do="embedBoard" data-pin-board-width="235" data-pin-scale-height="180" data-pin-scale-width="60" href={open} />
        </div>
      )}
      {boards.length === 0 && (
        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Sans', lineHeight: 1.5 }}>
          Boards you save here stay on this device. To actually shape the design, add photos on the Theme tab.
        </div>
      )}
    </>
  )
}

// ─── Canvas ──────────────────────────────────────────────────────────────────

function Canvas({ piece, recipe, pinned, text, compare }) {
  const spec = PIECES.find(p => p.id === piece) || PIECES[0]
  const C = PIECE_MAP[piece] || StdCard
  const scale = compare && pinned ? 0.74 : 1

  const Slot = ({ r, caption }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexShrink: 0 }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center', transition: 'transform 200ms' }}>
        <C t={text} recipe={r} w={spec.w} h={spec.h} />
      </div>
      {caption && (
        <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'DM Sans' }}>
          {caption}
        </div>
      )}
    </div>
  )

  // Centring with `justify-content` clips the leading edge once the content
  // is wider than the scroll container, so the row is centred with auto
  // margins on an inner, fit-content track instead.
  return (
    <div style={{
      flex: 1, overflow: 'auto',
      background: 'var(--dark2, #EFE7D8)',
      backgroundImage: 'radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.5) 0%, transparent 60%)',
      display: 'flex', flexDirection: 'column',
      justifyContent: compare && pinned ? 'flex-start' : 'center',
      padding: compare && pinned ? '30px 20px 60px' : '44px 24px 64px',
    }}>
      <div style={{ display: 'flex', gap: 44, width: 'fit-content', margin: '0 auto', alignItems: 'flex-start' }}>
        {compare && pinned && <Slot r={pinned} caption="Pinned" />}
        <Slot r={recipe} caption={compare && pinned ? 'Current' : null} />
      </div>
    </div>
  )
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function Theme() {
  const [piece, setPiece] = useState('std')
  const [tab, setTab] = useState('theme')
  const [text, setText] = useState(DEFAULT_TEXT)

  const [recipe, setRecipe] = useState(DEFAULT_RECIPE)
  const [pinned, setPinned] = useState(null)
  const [compare, setCompare] = useState(false)

  const [themeText, setThemeText] = useState('')
  const [photos, setPhotos] = useState([])
  const [swatches, setSwatches] = useState([])
  const [deriving, setDeriving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [hydrated, setHydrated] = useState(false)

  // Fonts for every whitelisted family, in one request built from the list
  // itself — so adding a font to the whitelist can't desync from what loads.
  useEffect(() => {
    if (document.getElementById('dk-theme-fonts')) return
    const l = document.createElement('link')
    l.id = 'dk-theme-fonts'
    l.rel = 'stylesheet'
    l.href = googleFontsHref()
    document.head.appendChild(l)
  }, [])

  // Load the saved recipe: database first (so it follows you between devices),
  // falling back to this browser's copy.
  useEffect(() => {
    let cancelled = false
    async function load() {
      let found = null
      try {
        const { data } = await supabase.from('project_metadata').select('theme_recipe').limit(1).maybeSingle()
        if (data?.theme_recipe) found = data.theme_recipe
      } catch { /* column may not exist yet; fall through to localStorage */ }
      if (!found) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) found = JSON.parse(raw)
        } catch { /* ignore */ }
      }
      if (cancelled) return
      if (found) {
        setRecipe(validateRecipe(found.recipe ?? found))
        if (typeof found.themeText === 'string') setThemeText(found.themeText)
      }
      try {
        const p = localStorage.getItem(PIN_KEY)
        if (p) setPinned(validateRecipe(JSON.parse(p)))
      } catch { /* ignore */ }
      setHydrated(true)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Persist. Debounced so dragging a slider doesn't hammer the database.
  useEffect(() => {
    if (!hydrated) return
    const payload = { recipe, themeText }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)) } catch { /* quota */ }
    const id = setTimeout(() => {
      supabase.from('project_metadata').select('id').limit(1).maybeSingle()
        .then(({ data }) => {
          if (data?.id) supabase.from('project_metadata').update({ theme_recipe: payload }).eq('id', data.id).then(() => {}, () => {})
        }, () => {})
    }, 900)
    return () => clearTimeout(id)
  }, [recipe, themeText, hydrated])

  const patch = (partial) => setRecipe(r => validateRecipe({ ...r, ...partial }))

  // --- Photos -------------------------------------------------------------
  // Two sources, one list. `preview` is what the <img> shows and what the
  // local extractor reads; `remoteUrl` is the publicly fetchable address the
  // vision call needs, and is only set once an upload lands.

  const addPhotoUrl = (url) => {
    setError(null)
    setPhotos(p => [...p, { id: `u${Date.now()}${Math.random()}`, preview: url, remoteUrl: url, kind: 'url' }])
  }

  async function addPhotoFiles(files) {
    if (!files.length) return
    setError(null)
    const staged = files.map(f => ({
      id: `f${Date.now()}${Math.random()}`, preview: URL.createObjectURL(f), remoteUrl: null, kind: 'file', file: f,
    }))
    setPhotos(p => [...p, ...staged])

    setUploading(true)
    for (const s of staged) {
      try {
        const ext = (s.file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`
        const { error: upErr } = await supabase.storage.from(INSPO_BUCKET).upload(path, s.file, { upsert: false })
        if (upErr) throw upErr
        const { data } = supabase.storage.from(INSPO_BUCKET).getPublicUrl(path)
        if (data?.publicUrl) {
          setPhotos(p => p.map(x => (x.id === s.id ? { ...x, remoteUrl: data.publicUrl } : x)))
        }
      } catch {
        // Not fatal: the colours were still extracted locally, the model just
        // won't get to look at this particular photo.
        setError('A photo could not be uploaded, so its colours are used but the image itself won’t be analysed.')
      }
    }
    setUploading(false)
  }

  const removePhoto = (id) => setPhotos(p => p.filter(x => x.id !== id))

  // Re-extract whenever the photo set changes. Local, free, instant.
  useEffect(() => {
    let cancelled = false
    if (!photos.length) { setSwatches([]); return }
    extractFromImages(photos.map(p => p.preview))
      .then(({ swatches: sw, errors }) => {
        if (cancelled) return
        setSwatches(sw)
        if (!sw.length && errors.length) {
          setError('Could not read colours from those images. Uploading the file works even when a hotlinked URL doesn’t.')
        }
      })
      .catch(() => { if (!cancelled) setSwatches([]) })
    return () => { cancelled = true }
  }, [photos])

  // --- Derive -------------------------------------------------------------

  async function derive() {
    if (!themeText.trim() && !photos.length) {
      setError('Describe the theme, add a photo, or both.')
      return
    }
    setDeriving(true)
    setError(null)
    try {
      const res = await fetch('/.netlify/functions/theme-derive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: themeText,
          swatches,
          imageUrls: photos.map(p => p.remoteUrl).filter(Boolean),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Derive failed (${res.status})`)
      setRecipe(validateRecipe(json.recipe))
      setTab('palette')
    } catch (e) {
      // Offline fallback: at minimum honour the photos' own colours, so the
      // button still does something useful without the API.
      const pal = swatchesToPalette(swatches)
      if (pal) {
        setRecipe(r => validateRecipe({ ...r, palette: pal, mood: 'Colours taken straight from your photos (AI step unavailable).' }))
        setError(`${e.message}. Used the extracted colours instead.`)
      } else {
        setError(e.message)
      }
    } finally {
      setDeriving(false)
    }
  }

  // --- Chrome -------------------------------------------------------------

  const pieceTab = (active) => ({
    background: 'none', border: 'none',
    borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
    color: active ? 'var(--gold)' : 'var(--text-muted)',
    fontFamily: 'DM Sans', fontSize: 12, letterSpacing: '0.05em',
    padding: '0 13px', height: 44, cursor: 'pointer', whiteSpace: 'nowrap',
  })

  const sideTab = (active) => ({
    flex: 1, background: 'none', border: 'none',
    borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
    color: active ? 'var(--gold)' : 'var(--text-muted)',
    fontFamily: 'DM Sans', fontSize: 10, letterSpacing: '0.08em',
    padding: '9px 0', cursor: 'pointer', textTransform: 'uppercase',
  })

  const TABS = [['theme', 'Theme'], ['palette', 'Palette'], ['form', 'Form'], ['text', 'Text'], ['inspo', 'Inspo']]

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--dark)' }}>

      <div style={{
        display: 'flex', alignItems: 'center', padding: '0 16px', height: 44, flexShrink: 0,
        borderBottom: '1px solid var(--gold-border)', background: 'var(--card)',
      }}>
        <nav style={{ display: 'flex', height: '100%' }}>
          {PIECES.map(p => (
            <button key={p.id} style={pieceTab(piece === p.id)} onClick={() => setPiece(p.id)}>{p.label}</button>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <button
            style={{ ...UI.ghost, fontSize: 10, padding: '5px 9px' }}
            onClick={() => {
              setPinned(recipe)
              try { localStorage.setItem(PIN_KEY, JSON.stringify(recipe)) } catch { /* quota */ }
              setCompare(true)
            }}
            title="Keep this version side by side while you keep editing"
          >
            Pin current
          </button>
          <button
            style={{
              ...UI.ghost, fontSize: 10, padding: '5px 9px',
              opacity: pinned ? 1 : 0.4, cursor: pinned ? 'pointer' : 'not-allowed',
              background: compare && pinned ? 'var(--gold)' : 'transparent',
              color: compare && pinned ? 'var(--card)' : 'var(--gold)',
            }}
            disabled={!pinned}
            onClick={() => setCompare(c => !c)}
          >
            Compare
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Canvas piece={piece} recipe={recipe} pinned={pinned} text={text} compare={compare} />

        <div style={{
          width: 290, flexShrink: 0, background: 'var(--card)',
          borderLeft: '1px solid var(--gold-border)', display: 'flex', flexDirection: 'column', height: '100%',
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--gold-border)' }}>
            {TABS.map(([id, l]) => (
              <button key={id} style={sideTab(tab === id)} onClick={() => setTab(id)}>{l}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 40px' }}>
            {tab === 'theme' && (
              <ThemePanel
                themeText={themeText} setThemeText={setThemeText}
                photos={photos} addPhotoUrl={addPhotoUrl} addPhotoFiles={addPhotoFiles} removePhoto={removePhoto}
                swatches={swatches} deriving={deriving} onDerive={derive}
                error={error} mood={recipe.mood} uploading={uploading}
              />
            )}
            {tab === 'palette' && <PalettePanel recipe={recipe} patch={patch} />}
            {tab === 'form' && <FormPanel recipe={recipe} patch={patch} />}
            {tab === 'text' && <TextPanel text={text} setText={setText} />}
            {tab === 'inspo' && <InspoPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}
