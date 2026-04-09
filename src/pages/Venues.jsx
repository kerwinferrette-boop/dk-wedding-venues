import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, USERS } from '../lib/supabase'

// ── Constants ─────────────────────────────────────────────────────────────────

const REGIONS = [
  { key: 'all',      label: 'All',      icon: '🌍' },
  { key: 'socal',    label: 'SoCal',    icon: '☀️' },
  { key: 'bay',      label: 'Bay Area', icon: '🌉' },
  { key: 'monterey', label: 'Monterey', icon: '🌊' },
]

const SORT_OPTIONS = [
  { key: 'name',     label: 'Name A–Z'  },
  { key: 'fee_asc',  label: 'Fee ↑'     },
  { key: 'fee_desc', label: 'Fee ↓'     },
  { key: 'cap_desc', label: 'Capacity ↓'},
]

const PARTNER = { kerwin: 'dani', dani: 'kerwin' }
const USER_COLORS = { kerwin: '#A51C30', dani: '#2D6A4F' }

function normalizeRegion(r) {
  if (!r) return 'other'
  const s = r.toLowerCase()
  if (s === 'bay_area' || s === 'bay') return 'bay'
  return s
}

function fmt(n) {
  if (!n) return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n)
}

function parseVibeTags(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  return String(raw).split(',').map(t => t.trim()).filter(Boolean)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Stars({ value = 0, max = 5, size = 16, color = '#D4A843' }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          style={{
            fontSize: size,
            color: i < value ? color : 'var(--text-dim)',
            lineHeight: 1,
          }}
        >★</span>
      ))}
    </span>
  )
}

function Chip({ active, onClick, children, color = 'var(--text)' }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 14px',
        borderRadius: 20,
        border: `1.5px solid ${active ? color : 'var(--border)'}`,
        background: active ? color : 'transparent',
        color: active ? '#fff' : 'var(--text-muted)',
        fontSize: 13,
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  )
}

function Badge({ label, color = '#5DBB8A' }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 12,
      background: `${color}22`,
      color,
      fontSize: 10,
      fontWeight: 700,
      fontFamily: 'DM Sans, sans-serif',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      lineHeight: 1.6,
    }}>
      {label}
    </span>
  )
}

function RatingDots({ ratings, myUser }) {
  const partner = PARTNER[myUser]
  const myR     = ratings?.[myUser]
  const theirR  = ratings?.[partner]
  if (!myR && !theirR) return null

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {[myUser, partner].map(u => {
        const r = ratings?.[u]
        if (!r) return null
        return (
          <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              background: USER_COLORS[u],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 8, fontWeight: 800, fontFamily: 'DM Sans',
            }}>
              {u[0].toUpperCase()}
            </div>
            <Stars value={r.stars} size={10} color={USER_COLORS[u]} />
          </div>
        )
      })}
    </div>
  )
}

function StatPill({ icon, label, value }) {
  if (!value) return null
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '7px 10px',
      background: 'var(--dark)',
      borderRadius: 8,
    }}>
      <span style={{
        fontSize: 10, color: 'var(--text-dim)',
        fontFamily: 'DM Sans', textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {icon} {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'DM Sans' }}>
        {value}
      </span>
    </div>
  )
}

// ── VenueCard ──────────────────────────────────────────────────────────────────

function VenueCard({ venue, ratings, user, onRate, onPackage, onQuote }) {
  const userColor = USER_COLORS[user]
  const myRating  = ratings?.[user]

  const badges = []
  if (venue.leader)      badges.push({ label: '⭐ Top Pick',       color: '#C9932A' })
  if (venue.has_package) badges.push({ label: '📦 Package',        color: '#7B61FF' })
  if (venue.aqua)        badges.push({ label: '🐟 Aquarium',       color: '#2B9FCC' })
  if (venue.arch)        badges.push({ label: '🏛️ Historic',      color: '#9A7B5E' })
  if (venue.planet)      badges.push({ label: '🔭 Planetarium',    color: '#8A5FCC' })

  const vibeTags = parseVibeTags(venue.vibe_tags)

  const fmtFee = venue.venue_fee
    ? fmt(venue.venue_fee)
    : venue.catering_pp ? 'Bundled' : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22 }}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Image / Header ─────────────────────────────────────────────────── */}
      <div style={{
        height: 130,
        background: venue.image_url
          ? `url(${venue.image_url}) center/cover no-repeat`
          : `linear-gradient(135deg, ${userColor}18 0%, ${userColor}05 100%)`,
        position: 'relative',
        display: 'flex', alignItems: 'flex-end',
        padding: '0 14px 10px',
      }}>
        {venue.image_url && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.55))',
          }} />
        )}

        {/* Ratings dots — top right */}
        <div style={{ position: 'absolute', top: 10, right: 12, zIndex: 2 }}>
          <RatingDots ratings={ratings} myUser={user} />
        </div>

        {/* Name + region */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            fontFamily: 'Playfair Display, serif',
            fontWeight: 700, fontSize: 16,
            color: venue.image_url ? '#fff' : 'var(--text)',
            textShadow: venue.image_url ? '0 1px 4px rgba(0,0,0,0.6)' : 'none',
            lineHeight: 1.25,
          }}>
            {venue.name}
          </div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: 11,
            color: venue.image_url ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
            marginTop: 2,
          }}>
            {venue.region_label || venue.region}
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Badges */}
        {badges.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {badges.map(b => <Badge key={b.label} label={b.label} color={b.color} />)}
          </div>
        )}

        {/* Highlight */}
        {venue.highlight && (
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: 12,
            color: 'var(--text-muted)', lineHeight: 1.5, margin: 0,
          }}>
            {venue.highlight}
          </p>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {fmtFee  && <StatPill icon="💰" label="Fee"      value={fmtFee} />}
          {venue.max_cap && <StatPill icon="👥" label="Capacity" value={`${venue.max_cap}`} />}
          {venue.catering_pp && <StatPill icon="🍽" label="Catering" value={`${fmt(venue.catering_pp)}/pp`} />}
        </div>

        {/* Vibe tags */}
        {vibeTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {vibeTags.map(tag => (
              <span key={tag} style={{
                padding: '2px 7px', borderRadius: 10,
                background: 'var(--dark)', color: 'var(--text-muted)',
                fontSize: 11, fontFamily: 'DM Sans',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* ── Action Buttons ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Rate button */}
          <button
            onClick={() => onRate(venue)}
            style={{
              flex: 1, padding: '8px 10px', borderRadius: 10,
              border: `1.5px solid ${myRating ? userColor : 'var(--border)'}`,
              background: myRating ? `${userColor}14` : 'transparent',
              color: myRating ? userColor : 'var(--text-muted)',
              fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            {myRating
              ? <><Stars value={myRating.stars} size={11} color={userColor} /> Rated</>
              : '⭐ Rate'}
          </button>

          {/* Package button */}
          {venue.has_package && (
            <button
              onClick={() => onPackage(venue)}
              style={{
                padding: '8px 12px', borderRadius: 10,
                border: '1.5px solid #7B61FF44',
                background: '#7B61FF0D', color: '#7B61FF',
                fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              📦 Pkg
            </button>
          )}

          {/* Quote upload */}
          <button
            onClick={() => onQuote(venue)}
            style={{
              padding: '8px 12px', borderRadius: 10,
              border: '1.5px solid #5DBB8A44',
              background: '#5DBB8A0D', color: '#5DBB8A',
              fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            📄
          </button>

          {/* Site link */}
          {venue.url && (
            <a
              href={venue.url} target="_blank" rel="noopener noreferrer"
              style={{
                padding: '8px 10px', borderRadius: 10,
                border: '1.5px solid var(--border)',
                color: 'var(--text-dim)', fontSize: 12,
                fontFamily: 'DM Sans', fontWeight: 500,
                textDecoration: 'none', transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              🌐
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Rating Modal ──────────────────────────────────────────────────────────────

function RatingModal({ venue, ratings, user, onClose, onSave }) {
  const userColor   = USER_COLORS[user]
  const partner     = PARTNER[user]
  const partnerColor = USER_COLORS[partner]
  const existing    = ratings?.[user]
  const partnerRating = ratings?.[partner]

  const [stars, setStars]   = useState(existing?.stars || 0)
  const [notes, setNotes]   = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!stars) return
    setSaving(true)
    await onSave(venue.id, stars, notes)
    setSaving(false)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(26,18,8,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, backdropFilter: 'blur(4px)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93 }}
        transition={{ duration: 0.2 }}
        style={{
          background: 'var(--card)',
          borderRadius: 20, padding: 28,
          maxWidth: 440, width: '100%',
          boxShadow: '0 24px 64px rgba(26,18,8,0.22)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <h2 style={{
              fontFamily: 'Playfair Display, serif', fontWeight: 700,
              fontSize: 20, color: 'var(--text)', margin: 0,
            }}>
              {venue.name}
            </h2>
            <p style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 13,
              color: 'var(--text-muted)', margin: '4px 0 0',
            }}>
              {venue.region_label || venue.region}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: 'var(--text-dim)', padding: 4, lineHeight: 1,
          }}>
            ✕
          </button>
        </div>

        {/* My Rating */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: userColor, marginBottom: 12,
          }}>
            {user[0].toUpperCase() + user.slice(1)}'s Rating
          </div>

          {/* Star picker */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setStars(n)}
                style={{
                  flex: 1, paddingTop: '100%', position: 'relative',
                  borderRadius: 10,
                  border: `2px solid ${n <= stars ? userColor : 'var(--border)'}`,
                  background: n <= stars ? `${userColor}14` : 'var(--dark)',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
              >
                <span style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: n <= stars ? userColor : 'var(--text-dim)',
                }}>
                  ★
                </span>
              </button>
            ))}
          </div>

          {/* Notes textarea */}
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes, vibes, gut feelings…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)',
              background: 'var(--dark)', color: 'var(--text)',
              fontFamily: 'DM Sans, sans-serif', fontSize: 14,
              resize: 'vertical', outline: 'none',
            }}
          />
        </div>

        {/* Partner's existing rating */}
        {partnerRating && (
          <div style={{
            padding: '12px 14px', marginBottom: 18,
            background: `${partnerColor}0A`,
            border: `1px solid ${partnerColor}28`,
            borderRadius: 12,
          }}>
            <div style={{
              fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: partnerColor, marginBottom: 6,
            }}>
              {partner[0].toUpperCase() + partner.slice(1)} gave {partnerRating.stars} ★
            </div>
            <Stars value={partnerRating.stars} size={14} color={partnerColor} />
            {partnerRating.notes && (
              <p style={{
                fontFamily: 'DM Sans', fontSize: 13,
                color: 'var(--text-muted)', margin: '8px 0 0',
                fontStyle: 'italic', lineHeight: 1.45,
              }}>
                "{partnerRating.notes}"
              </p>
            )}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!stars || saving}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 12,
            border: 'none',
            background: stars ? userColor : 'var(--border)',
            color: stars ? '#fff' : 'var(--text-muted)',
            fontFamily: 'DM Sans', fontSize: 15, fontWeight: 700,
            cursor: stars ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          {saving ? 'Saving…' : existing ? 'Update Rating' : 'Save Rating'}
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── Package Data ──────────────────────────────────────────────────────────────

const PACKAGE_DATA = {
  25: {
    emoji: '🏛️',
    defaultGuests: 150,
    inclusions: [
      'Ceremony & reception spaces',
      'Day-of coordination',
      'Bridal suite & groom lounge',
      'Tables, chairs & linens',
      'Onsite venue host',
      'Complimentary parking',
    ],
    lineItems: [
      { key: 'venue',   label: 'Venue Rental',        type: 'fixed',      amount: 0   },
      { key: 'catering',label: 'Catering & Cuisine',   type: 'per_person', rate:   165 },
      { key: 'bar',     label: 'Open Bar Package',     type: 'per_person', rate:   55  },
      { key: 'florals', label: 'Florals & Décor',      type: 'fixed',      amount: 5500},
      { key: 'cake',    label: 'Cake & Dessert',       type: 'fixed',      amount: 1400},
      { key: 'dj',      label: 'DJ + Sound',           type: 'fixed',      amount: 3200},
      { key: 'photo',   label: 'Photography',          type: 'fixed',      amount: 5800},
      { key: 'coord',   label: 'Day-of Coordination',  type: 'fixed',      amount: 1500},
    ],
  },
  26: {
    emoji: '🦒',
    defaultGuests: 100,
    inclusions: [
      'Mkutano House exclusive rental',
      'Animal ambassador experiences',
      'Safari-themed styling',
      'Dedicated event staff',
      'Private guest parking',
      'Sunset giraffe photo moments',
    ],
    lineItems: [
      { key: 'venue',        label: 'Venue Rental',       type: 'fixed',      amount: 12700 },
      { key: 'catering',     label: 'Catering & Cuisine',  type: 'per_person', rate:   187   },
      { key: 'bar',          label: 'Open Bar Package',    type: 'per_person', rate:   65    },
      { key: 'florals',      label: 'Florals & Décor',     type: 'fixed',      amount: 4500  },
      { key: 'cake',         label: 'Cake & Dessert',      type: 'fixed',      amount: 1200  },
      { key: 'entertainment',label: 'Live Music / DJ',     type: 'fixed',      amount: 3800  },
      { key: 'coord',        label: 'Day-of Coordination', type: 'fixed',      amount: 2000  },
    ],
  },
  29: {
    emoji: '🎵',
    defaultGuests: 180,
    inclusions: [
      'Full venue buyout (ceremony + reception)',
      'In-house AV & sound system',
      'Bridal & groom suites',
      'Setup & breakdown crew',
      'Onsite event manager',
      'Tables, chairs & basic linen',
    ],
    lineItems: [
      { key: 'venue',   label: 'Venue Rental',        type: 'fixed',      amount: 8000 },
      { key: 'catering',label: 'Catering & Cuisine',   type: 'per_person', rate:   79   },
      { key: 'bar',     label: 'Open Bar Package',     type: 'per_person', rate:   45   },
      { key: 'florals', label: 'Florals & Décor',      type: 'fixed',      amount: 4000 },
      { key: 'cake',    label: 'Cake & Dessert',       type: 'fixed',      amount: 1000 },
      { key: 'dj',      label: 'DJ + Sound',           type: 'fixed',      amount: 3200 },
      { key: 'photo',   label: 'Photo & Video',        type: 'fixed',      amount: 5500 },
      { key: 'coord',   label: 'Day-of Coordination',  type: 'fixed',      amount: 2000 },
    ],
  },
}

// ── Package Builder Modal ─────────────────────────────────────────────────────

function PackageModal({ venue, user, onClose }) {
  const userColor = USER_COLORS[user]
  const pkg = PACKAGE_DATA[venue.id]

  const [guests, setGuests] = useState(pkg?.defaultGuests || 150)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load previously saved guest count
  useEffect(() => {
    if (!pkg) return
    async function load() {
      const { data } = await supabase
        .from('venue_packages')
        .select('selections')
        .eq('venue_id', venue.id)
        .eq('user', user)
        .maybeSingle()
      if (data?.selections?.guests) setGuests(data.selections.guests)
    }
    load()
  }, [venue.id, user]) // eslint-disable-line

  const total = useMemo(() => {
    if (!pkg) return 0
    return pkg.lineItems.reduce((sum, item) =>
      sum + (item.type === 'fixed' ? item.amount : item.rate * guests), 0)
  }, [pkg, guests])

  const perPerson = guests > 0 ? Math.round(total / guests) : 0

  const nudge = (delta) =>
    setGuests(g => Math.max(1, Math.min(venue.max_cap || 500, g + delta)))

  const handleSave = async () => {
    setSaving(true)
    const { data: existing } = await supabase
      .from('venue_packages').select('id')
      .eq('venue_id', venue.id).eq('user', user).maybeSingle()
    if (existing?.id) {
      await supabase.from('venue_packages')
        .update({ selections: { guests }, total, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('venue_packages')
        .insert({ venue_id: venue.id, user, selections: { guests }, total })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!pkg) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => e.target === e.currentTarget && onClose()}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(26,18,8,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93 }}
          style={{
            background: 'var(--card)', borderRadius: 20, padding: 32,
            maxWidth: 400, width: '100%', textAlign: 'center',
            boxShadow: '0 24px 64px rgba(26,18,8,0.22)',
          }}
        >
          <p style={{ fontFamily: 'DM Sans', color: 'var(--text-muted)' }}>No package data available.</p>
          <button onClick={onClose} style={{
            padding: '10px 28px', borderRadius: 10, border: 'none',
            background: userColor, color: '#fff', fontFamily: 'DM Sans',
            fontWeight: 700, cursor: 'pointer', marginTop: 16,
          }}>Close</button>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(26,18,8,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px', backdropFilter: 'blur(4px)',
        overflowY: 'auto',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 28 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93 }}
        transition={{ duration: 0.22 }}
        style={{
          background: 'var(--card)', borderRadius: 20,
          maxWidth: 560, width: '100%',
          boxShadow: '0 28px 72px rgba(26,18,8,0.26)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '22px 24px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <span style={{ fontSize: 36, lineHeight: 1 }}>{pkg.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontFamily: 'Playfair Display, serif', fontWeight: 700,
              fontSize: 20, color: 'var(--text)', margin: 0, lineHeight: 1.25,
            }}>
              {venue.name}
            </h2>
            {venue.quoted_price && (
              <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Quoted reference:{' '}
                <span style={{ color: '#7B61FF', fontWeight: 700 }}>{fmt(venue.quoted_price)}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: 'none', background: 'rgba(26,18,8,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', flexShrink: 0,
            }}
          >✕</button>
        </div>

        {/* ── Guest Count ── */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
            👥 Guest Count
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[[-10,'−−'],[-1,'−']].map(([d, lbl]) => (
              <button key={lbl} onClick={() => nudge(d)} style={{
                width: 28, height: 28, borderRadius: 7,
                border: '1px solid var(--border)', background: 'transparent',
                cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 14, fontWeight: 700,
                color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{lbl}</button>
            ))}
            <input
              type="number"
              value={guests}
              onChange={e => setGuests(Math.max(1, Math.min(venue.max_cap || 500, parseInt(e.target.value) || 1)))}
              style={{
                width: 64, textAlign: 'center', fontFamily: 'DM Sans',
                fontSize: 16, fontWeight: 700, color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 8,
                padding: '4px 6px', background: 'rgba(26,18,8,0.03)',
              }}
            />
            {[[1,'+'],[10,'++']].map(([d, lbl]) => (
              <button key={lbl} onClick={() => nudge(d)} style={{
                width: 28, height: 28, borderRadius: 7,
                border: '1px solid var(--border)', background: 'transparent',
                cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 14, fontWeight: 700,
                color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{lbl}</button>
            ))}
          </div>
          <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
            max {venue.max_cap}
          </span>
        </div>

        {/* ── Line Items ── */}
        <div style={{ padding: '4px 24px 0' }}>
          <p style={{
            fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700,
            color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase',
            margin: '12px 0 4px',
          }}>Breakdown</p>
          {pkg.lineItems.map((item, idx) => {
            const lineTotal = item.type === 'fixed' ? item.amount : item.rate * guests
            const isZero = lineTotal === 0
            return (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center',
                padding: '9px 0',
                borderBottom: idx < pkg.lineItems.length - 1
                  ? '1px solid rgba(26,18,8,0.05)' : 'none',
              }}>
                <span style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text)', flex: 1 }}>
                  {item.label}
                </span>
                {item.type === 'per_person' && (
                  <span style={{
                    fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-dim)',
                    marginRight: 12, whiteSpace: 'nowrap',
                  }}>
                    {fmt(item.rate)} × {guests}
                  </span>
                )}
                <span style={{
                  fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
                  color: isZero ? 'var(--text-dim)' : 'var(--text)',
                  minWidth: 80, textAlign: 'right',
                }}>
                  {isZero ? 'Included' : fmt(lineTotal)}
                </span>
              </div>
            )
          })}
        </div>

        {/* ── Total ── */}
        <div style={{
          margin: '8px 24px 0',
          borderTop: `2px solid ${userColor}`,
          padding: '14px 0',
          display: 'flex', alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'DM Sans', fontSize: 15, fontWeight: 700, color: 'var(--text)', flex: 1 }}>
            Estimated Total
          </span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700, color: userColor }}>
              {fmt(total)}
            </div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)' }}>
              {fmt(perPerson)} per person
            </div>
          </div>
        </div>

        {/* ── Inclusions ── */}
        <div style={{
          margin: '4px 24px 16px',
          padding: '14px 16px',
          background: 'rgba(26,18,8,0.03)',
          borderRadius: 12, border: '1px solid var(--border)',
        }}>
          <p style={{
            fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700,
            color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase',
            margin: '0 0 10px',
          }}>What's Included</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
            {pkg.inclusions.map((inc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ color: userColor, fontSize: 12, marginTop: 2, flexShrink: 0, fontWeight: 700 }}>✓</span>
                <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  {inc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{
          padding: '14px 24px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10,
        }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
              background: saved ? '#5DBB8A' : userColor,
              color: '#fff', fontFamily: 'DM Sans', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', transition: 'background 0.25s',
            }}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Package'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 22px', borderRadius: 12,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 15, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Quote Upload Modal ────────────────────────────────────────────────────────

function QuoteUploadModal({ venue, user, onClose }) {
  const userColor = USER_COLORS[user]
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState('idle') // idle | uploading | extracting | done | error
  const [extracted, setExtracted] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [pastQuotes, setPastQuotes] = useState([])
  const [activeTab, setActiveTab] = useState('upload')

  useEffect(() => {
    async function loadPast() {
      const { data } = await supabase
        .from('quote_files')
        .select('*')
        .eq('venue_id', venue.id)
        .order('uploaded_at', { ascending: false })
      setPastQuotes(data || [])
      if (data?.length > 0) setActiveTab('history')
    }
    loadPast()
  }, [venue.id])

  async function handleUpload() {
    if (!file) return
    setStatus('uploading')
    setErrorMsg('')
    try {
      const ext = file.name.split('.').pop()
      const filePath = `${user}/${venue.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('quote-files')
        .upload(filePath, file, { upsert: false })
      if (uploadErr) throw new Error(uploadErr.message)

      setStatus('extracting')
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('extract-quote', {
        body: { file_path: filePath, venue_id: venue.id, user },
      })
      if (fnErr) throw new Error(fnErr.message)
      if (fnData?.error) throw new Error(fnData.error)

      setExtracted(fnData.extracted)
      setStatus('done')

      const { data } = await supabase
        .from('quote_files')
        .select('*')
        .eq('venue_id', venue.id)
        .order('uploaded_at', { ascending: false })
      setPastQuotes(data || [])
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  const isPDF = file && file.type === 'application/pdf'
  const validFile = file && (file.type.startsWith('image/') || isPDF)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 16 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg)', borderRadius: 20, padding: 32,
          width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto',
          border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'Playfair Display', fontSize: 22, color: 'var(--text)' }}>
              📄 Quote Upload
            </h2>
            <p style={{ margin: '4px 0 0', fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text-muted)' }}>
              {venue.name}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 22, color: 'var(--text-dim)', lineHeight: 1, padding: 4,
          }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
          {[
            { key: 'upload',  label: '⬆️ Upload New' },
            { key: 'history', label: `📂 History (${pastQuotes.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '8px 18px', border: 'none',
                borderBottom: `2.5px solid ${activeTab === key ? userColor : 'transparent'}`,
                background: 'transparent',
                color: activeTab === key ? userColor : 'var(--text-muted)',
                fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.13s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'upload' ? (
          <>
            {(status === 'idle' || status === 'error') && (
              <>
                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('quote-file-input').click()}
                  style={{
                    border: `2px dashed ${dragOver ? userColor : file ? '#5DBB8A' : 'var(--border)'}`,
                    borderRadius: 14, padding: '32px 24px', textAlign: 'center',
                    background: dragOver ? `${userColor}0A` : file ? '#5DBB8A0A' : 'var(--card)',
                    cursor: 'pointer', transition: 'all 0.15s', marginBottom: 16,
                  }}
                >
                  <input
                    id="quote-file-input"
                    type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                    style={{ display: 'none' }}
                    onChange={e => setFile(e.target.files[0] || null)}
                  />
                  <div style={{ fontSize: 32, marginBottom: 8 }}>
                    {file ? (isPDF ? '📑' : '🖼️') : '📂'}
                  </div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: file ? '#5DBB8A' : 'var(--text-muted)' }}>
                    {file ? file.name : 'Drop a quote here or click to browse'}
                  </div>
                  {!file && (
                    <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                      PDF, JPG, PNG — up to 5MB
                    </div>
                  )}
                </div>

                {status === 'error' && (
                  <div style={{
                    background: '#FF4B4B14', border: '1px solid #FF4B4B44',
                    borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                    fontFamily: 'DM Sans', fontSize: 13, color: '#FF4B4B',
                  }}>
                    ⚠️ {errorMsg}
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!validFile}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 12,
                    border: 'none', background: validFile ? userColor : 'var(--border)',
                    color: validFile ? '#fff' : 'var(--text-dim)',
                    fontFamily: 'DM Sans', fontSize: 14, fontWeight: 700,
                    cursor: validFile ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
                  }}
                >
                  ✨ Extract with AI
                </button>
              </>
            )}

            {status === 'uploading' && (
              <QuoteStatusCard icon="⬆️" label="Uploading to storage…" color={userColor} />
            )}
            {status === 'extracting' && (
              <QuoteStatusCard icon="🤖" label="Claude is reading your quote…" color={userColor} />
            )}
            {status === 'done' && extracted && (
              <QuoteExtractedView
                data={extracted}
                userColor={userColor}
                onUploadAnother={() => { setFile(null); setExtracted(null); setStatus('idle') }}
              />
            )}
          </>
        ) : (
          <QuoteHistoryTab quotes={pastQuotes} />
        )}
      </motion.div>
    </motion.div>
  )
}

function QuoteStatusCard({ icon, label, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 24px', fontFamily: 'DM Sans' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color }}>{label}</div>
    </div>
  )
}

function QuoteExtractedView({ data, userColor, onUploadAnother }) {
  const rows = [
    data.venue_name  ? ['Venue',    data.venue_name]              : null,
    data.event_date  ? ['Date',     data.event_date]              : null,
    data.guest_count != null ? ['Guests', `${data.guest_count} people`] : null,
    data.total       != null ? ['Total',  fmt(data.total)]        : null,
    data.deposit     != null ? ['Deposit',fmt(data.deposit)]      : null,
    data.payment_schedule ? ['Payments', data.payment_schedule]   : null,
  ].filter(Boolean)

  return (
    <div>
      <div style={{
        background: '#5DBB8A14', border: '1px solid #5DBB8A44',
        borderRadius: 12, padding: '12px 16px', marginBottom: 20,
        fontFamily: 'DM Sans', fontSize: 13, color: '#5DBB8A', fontWeight: 600,
      }}>
        ✅ Extraction complete!
      </div>

      {rows.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {rows.map(([label, val]) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', gap: 16,
              padding: '8px 0', borderBottom: '1px solid var(--border)',
              fontFamily: 'DM Sans', fontSize: 14,
            }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
              <span style={{ color: 'var(--text)', fontWeight: 600, textAlign: 'right' }}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {data.line_items?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700,
            color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
          }}>
            Line Items
          </div>
          {data.line_items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', gap: 16,
              padding: '6px 0', borderBottom: '1px solid var(--border)',
              fontFamily: 'DM Sans', fontSize: 13,
            }}>
              <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                {item.amount != null ? fmt(item.amount) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.inclusions?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700,
            color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
          }}>
            Inclusions
          </div>
          {data.inclusions.map((inc, i) => (
            <div key={i} style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)', padding: '3px 0' }}>
              • {inc}
            </div>
          ))}
        </div>
      )}

      {data.notes && (
        <div style={{
          background: 'var(--card)', borderRadius: 10, padding: '12px 14px', marginBottom: 16,
          fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5,
        }}>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>Notes: </span>{data.notes}
        </div>
      )}

      <button
        onClick={onUploadAnother}
        style={{
          width: '100%', padding: '11px 0', borderRadius: 12,
          border: '1.5px solid var(--border)', background: 'transparent',
          color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        ⬆️ Upload Another
      </button>
    </div>
  )
}

function QuoteHistoryTab({ quotes }) {
  if (quotes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px', fontFamily: 'DM Sans', color: 'var(--text-dim)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
        <div style={{ fontSize: 14 }}>No quotes uploaded yet</div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {quotes.map(q => {
        const d = q.extracted_data || {}
        return (
          <div key={q.id} style={{
            background: 'var(--card)', borderRadius: 12, padding: '14px 16px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                {q.user === 'kerwin' ? '🔴' : '🟢'} {q.user}
              </span>
              <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-dim)' }}>
                {new Date(q.uploaded_at).toLocaleDateString()}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {d.total != null && (
                <span style={{ fontFamily: 'DM Sans', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Total </span>
                  <span style={{ color: 'var(--text)', fontWeight: 700 }}>{fmt(d.total)}</span>
                </span>
              )}
              {d.guest_count != null && (
                <span style={{ fontFamily: 'DM Sans', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Guests </span>
                  <span style={{ color: 'var(--text)', fontWeight: 700 }}>{d.guest_count}</span>
                </span>
              )}
              {d.event_date && (
                <span style={{ fontFamily: 'DM Sans', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Date </span>
                  <span style={{ color: 'var(--text)', fontWeight: 700 }}>{d.event_date}</span>
                </span>
              )}
            </div>
            {d.parse_error && (
              <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#C9932A', marginTop: 6 }}>
                ⚠️ Could not fully parse quote
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Add Venue Modal ────────────────────────────────────────────────────────────

const REGION_OPTIONS = [
  { key: 'socal',    label: 'SoCal'    },
  { key: 'bay',      label: 'Bay Area' },
  { key: 'monterey', label: 'Monterey' },
  { key: 'other',    label: 'Other'    },
]

function AddVenueModal({ user, onClose, onAdded }) {
  const userColor = USER_COLORS[user]
  const [name, setName]           = useState('')
  const [region, setRegion]       = useState('socal')
  const [fee, setFee]             = useState('')
  const [cateringPp, setCateringPp] = useState('')
  const [highlight, setHighlight] = useState('')
  const [imageUrl, setImageUrl]   = useState('')
  const [vibeTags, setVibeTags]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')

    const regionLabel = REGION_OPTIONS.find(r => r.key === region)?.label ?? region

    const row = {
      name: name.trim(),
      region,
      region_label: regionLabel,
      venue_fee:    fee         ? parseInt(fee.replace(/[^0-9]/g, ''), 10) || null : null,
      catering_pp:  cateringPp  ? parseInt(cateringPp.replace(/[^0-9]/g, ''), 10) || null : null,
      highlight:    highlight.trim() || null,
      image_url:    imageUrl.trim() || null,
      vibe_tags:    vibeTags.trim()
        ? vibeTags.split(',').map(t => t.trim()).filter(Boolean)
        : null,
    }

    const { data, error: sbErr } = await supabase.from('venues').insert(row).select().single()

    if (sbErr) {
      setError(sbErr.message || 'Failed to save venue.')
      setSaving(false)
      return
    }

    onAdded(data)
    onClose()
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '0.875rem',
    color: 'var(--text)',
    background: 'var(--dark)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-dim)',
    marginBottom: 6,
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(26,18,8,0.35)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 0 0 0',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        style={{
          width: '100%', maxWidth: 540,
          background: 'var(--card)',
          borderRadius: '20px 20px 0 0',
          padding: '24px 24px 40px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', color: 'var(--text)', margin: 0 }}>
            Add Venue
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: 'var(--text-dim)', lineHeight: 1, padding: '0 4px' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Venue Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="The Venue Collective"
              style={{ ...inputStyle, borderColor: name ? userColor + '88' : 'var(--border)' }}
              autoFocus
            />
          </div>

          {/* Region */}
          <div>
            <label style={labelStyle}>Region *</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {REGION_OPTIONS.map(r => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRegion(r.key)}
                  style={{
                    padding: '7px 16px', borderRadius: 20,
                    border: `1.5px solid ${region === r.key ? userColor : 'var(--border)'}`,
                    background: region === r.key ? userColor : 'transparent',
                    color: region === r.key ? '#fff' : 'var(--text-muted)',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fee + Catering */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Venue Fee</label>
              <input
                value={fee}
                onChange={e => setFee(e.target.value)}
                placeholder="$15,000"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Catering / person</label>
              <input
                value={cateringPp}
                onChange={e => setCateringPp(e.target.value)}
                placeholder="$185"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Highlight */}
          <div>
            <label style={labelStyle}>Highlight</label>
            <textarea
              value={highlight}
              onChange={e => setHighlight(e.target.value)}
              placeholder="One or two sentences about what makes this venue special."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>

          {/* Image URL */}
          <div>
            <label style={labelStyle}>Image URL</label>
            <input
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              style={inputStyle}
            />
          </div>

          {/* Vibe tags */}
          <div>
            <label style={labelStyle}>Vibe Tags (comma-separated)</label>
            <input
              value={vibeTags}
              onChange={e => setVibeTags(e.target.value)}
              placeholder="romantic, garden, outdoor, modern"
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', color: '#C9384F', margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            style={{
              width: '100%', padding: '14px 0',
              fontFamily: 'Playfair Display, serif', fontSize: '1rem', fontWeight: 700,
              background: name.trim() ? userColor : 'rgba(0,0,0,0.12)',
              color: '#fff', border: 'none', borderRadius: 14,
              cursor: name.trim() ? 'pointer' : 'default',
              marginTop: 4,
            }}
          >
            {saving ? 'Saving…' : 'Add Venue'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Main Venues Page ──────────────────────────────────────────────────────────

export default function Venues({ user, onSwitchUser }) {
  const userColor = USER_COLORS[user]

  // ── State ──────────────────────────────────────────────────────────────────
  const [venues,      setVenues]      = useState([])
  const [ratingsMap,  setRatingsMap]  = useState({}) // { [venueId]: { kerwin: row, dani: row } }
  const [loading,     setLoading]     = useState(true)

  // Filters
  const [activeRegion,     setActiveRegion]     = useState('all')
  const [filterTopPicks,   setFilterTopPicks]   = useState(false)
  const [filterHasPackage, setFilterHasPackage] = useState(false)
  const [sortBy,           setSortBy]           = useState('name')
  const [maxFee,           setMaxFee]           = useState(50000)
  const [minCap,           setMinCap]           = useState(0)

  // Modals
  const [ratingVenue,  setRatingVenue]  = useState(null)
  const [packageVenue, setPackageVenue] = useState(null)
  const [quoteVenue,   setQuoteVenue]   = useState(null)
  const [showAddVenue, setShowAddVenue] = useState(false)

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: venueData }, { data: ratingData }] = await Promise.all([
        supabase.from('venues').select('*').neq('archived', true).order('name'),
        supabase.from('venue_ratings').select('*'),
      ])

      setVenues(venueData || [])

      // Build ratingsMap
      const map = {}
      for (const r of ratingData || []) {
        if (!map[r.venue_id]) map[r.venue_id] = {}
        map[r.venue_id][r.user_id] = r
      }
      setRatingsMap(map)
      setLoading(false)
    }
    load()
  }, [])

  // ── Save Rating ────────────────────────────────────────────────────────────
  const saveRating = useCallback(async (venueId, stars, notes) => {
    const { data, error } = await supabase
      .from('venue_ratings')
      .upsert(
        {
          venue_id: venueId, user_id: user, stars, notes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'venue_id,user_id' }
      )
      .select()
      .single()

    if (!error && data) {
      setRatingsMap(prev => ({
        ...prev,
        [venueId]: { ...(prev[venueId] || {}), [user]: data },
      }))
    }
  }, [user])

  // ── Filtered & Sorted Venues ───────────────────────────────────────────────
  const filteredVenues = useMemo(() => {
    let list = [...venues]

    if (activeRegion !== 'all') {
      list = list.filter(v => normalizeRegion(v.region) === activeRegion)
    }
    if (filterTopPicks)   list = list.filter(v => v.leader)
    if (filterHasPackage) list = list.filter(v => v.has_package)

    // Fee slider: only exclude venues where fee is explicitly above maxFee
    if (maxFee < 50000) {
      list = list.filter(v => !v.venue_fee || Number(v.venue_fee) <= maxFee)
    }
    // Capacity slider
    if (minCap > 0) {
      list = list.filter(v => !v.max_cap || Number(v.max_cap) >= minCap)
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'name':     return a.name.localeCompare(b.name)
        case 'fee_asc':  return (a.venue_fee || 99999) - (b.venue_fee || 99999)
        case 'fee_desc': return (b.venue_fee || 0) - (a.venue_fee || 0)
        case 'cap_desc': return (b.max_cap || 0) - (a.max_cap || 0)
        default: return 0
      }
    })

    return list
  }, [venues, activeRegion, filterTopPicks, filterHasPackage, sortBy, maxFee, minCap])

  // ── Region counts ──────────────────────────────────────────────────────────
  const regionCounts = useMemo(() => {
    const counts = { all: venues.length }
    for (const v of venues) {
      const r = normalizeRegion(v.region)
      counts[r] = (counts[r] || 0) + 1
    }
    return counts
  }, [venues])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--dark)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: `2px solid ${userColor}`,
          borderTopColor: 'transparent',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', color: 'var(--text)' }}>

      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 56, zIndex: 100,
      }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '14px 24px 0' }}>

          {/* Top row */}
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <h1 style={{
                fontFamily: 'Playfair Display, serif', fontWeight: 700,
                fontSize: 20, color: 'var(--text)', margin: 0, lineHeight: 1.2,
              }}>
                Venue Scouting
              </h1>
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                color: 'var(--text-muted)', margin: '2px 0 0',
              }}>
                {filteredVenues.length} of {venues.length} venues
              </p>
            </div>
          </div>

          {/* Region tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {REGIONS.map(r => (
              <button
                key={r.key}
                onClick={() => setActiveRegion(r.key)}
                style={{
                  padding: '9px 16px',
                  border: 'none',
                  borderBottom: `2.5px solid ${activeRegion === r.key ? userColor : 'transparent'}`,
                  background: 'transparent',
                  color: activeRegion === r.key ? userColor : 'var(--text-muted)',
                  fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.13s', whiteSpace: 'nowrap',
                }}
              >
                {r.icon} {r.label}
                {regionCounts[r.key] != null && (
                  <span style={{
                    marginLeft: 5, padding: '1px 5px', borderRadius: 8,
                    background: 'var(--dark)', fontSize: 10, color: 'var(--text-dim)',
                  }}>
                    {regionCounts[r.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 24px',
      }}>
        <div style={{
          maxWidth: 1140, margin: '0 auto',
          display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
        }}>
          {/* Filter chips */}
          <Chip active={filterTopPicks} onClick={() => setFilterTopPicks(p => !p)} color="#C9932A">
            ⭐ Top Picks
          </Chip>
          <Chip active={filterHasPackage} onClick={() => setFilterHasPackage(p => !p)} color="#7B61FF">
            📦 Has Package
          </Chip>

          <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 2px' }} />

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              padding: '5px 10px', borderRadius: 18,
              border: '1.5px solid var(--border)',
              background: 'var(--dark)', color: 'var(--text)',
              fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer', outline: 'none',
            }}
          >
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>

          <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 2px' }} />

          {/* Max Fee slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Max Fee
            </span>
            <input
              type="range" min={0} max={50000} step={500} value={maxFee}
              onChange={e => setMaxFee(Number(e.target.value))}
              style={{ width: 90, accentColor: userColor, cursor: 'pointer' }}
            />
            <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text)', minWidth: 64, whiteSpace: 'nowrap' }}>
              {maxFee >= 50000 ? 'No limit' : fmt(maxFee)}
            </span>
          </div>

          <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 2px' }} />

          {/* Min Capacity slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Min Guests
            </span>
            <input
              type="range" min={0} max={300} step={10} value={minCap}
              onChange={e => setMinCap(Number(e.target.value))}
              style={{ width: 90, accentColor: userColor, cursor: 'pointer' }}
            />
            <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text)', minWidth: 28 }}>
              {minCap > 0 ? `${minCap}+` : 'Any'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Coming Soon ───────────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 600, margin: '80px auto', padding: '0 24px',
        textAlign: 'center', fontFamily: 'DM Sans, sans-serif',
      }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🏛️</div>
        <h2 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 22,
          color: 'var(--text)', margin: '0 0 12px',
        }}>
          Venue Comparison Coming Soon
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          This is where side-by-side venue comparison, pricing breakdowns, and your shortlist will live.
        </p>
      </div>

      {/* ── Rating Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {ratingVenue && (
          <RatingModal
            venue={ratingVenue}
            ratings={ratingsMap[ratingVenue.id]}
            user={user}
            onClose={() => setRatingVenue(null)}
            onSave={saveRating}
          />
        )}
      </AnimatePresence>

      {/* ── Package Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {packageVenue && (
          <PackageModal
            venue={packageVenue}
            user={user}
            onClose={() => setPackageVenue(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Quote Upload Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {quoteVenue && (
          <QuoteUploadModal
            venue={quoteVenue}
            user={user}
            onClose={() => setQuoteVenue(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Add Venue Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddVenue && (
          <AddVenueModal
            user={user}
            onClose={() => setShowAddVenue(false)}
            onAdded={(newVenue) => {
              setVenues((prev) => [...prev, newVenue].sort((a, b) => a.name.localeCompare(b.name)))
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Add Venue FAB ─────────────────────────────────────────────────── */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setShowAddVenue(true)}
        title="Add venue"
        style={{
          position: 'fixed', bottom: 28, right: 24,
          width: 52, height: 52, borderRadius: '50%',
          background: userColor, color: '#fff',
          border: 'none', cursor: 'pointer',
          fontSize: '1.6rem', lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 16px ${userColor}55`,
          zIndex: 100,
        }}
      >
        +
      </motion.button>
    </div>
  )
}
