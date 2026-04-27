import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, USERS } from '../lib/supabase'
import ArchetypeBadge from '../components/ArchetypeBadge'
import { VENUE_PACKAGES, calcOptionCost, defaultSelections } from '../lib/venuePackages'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val) {
  if (!val) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val)
}

const DEFAULT_BREAKDOWN = {
  venue: 0,
  catering: 0,
  bar: 0,
  photography: 0,
  florals: 0,
  music: 0,
  other: 0,
  taxRate: 9.5,
  gratRate: 20.0,
}

function calcTotal(b, multiplier = 1.25) {
  const fnb = (b.catering || 0) + (b.bar || 0)
  const taxAmt  = fnb * ((b.taxRate  ?? 9.5) / 100)
  const gratAmt = fnb * ((b.gratRate ?? 20.0) / 100)
  const variable = ((b.venue || 0) + (b.catering || 0) + (b.bar || 0)) * multiplier
  const fixed = (b.photography || 0) + (b.florals || 0) + (b.music || 0) + (b.other || 0)
  return { variable, fixed, taxAmt, gratAmt, total: variable + fixed + taxAmt + gratAmt }
}

// ─── Budget Line Row ──────────────────────────────────────────────────────────

function BudgetRow({ label, field, value, onChange, accent, isVariable }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value || ''))
  const inputRef = useRef(null)

  function commit() {
    const parsed = parseInt(draft.replace(/[^0-9]/g, ''), 10) || 0
    onChange(field, parsed)
    setEditing(false)
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2">
        {isVariable && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: `${accent}18`,
              color: accent,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.65rem',
              letterSpacing: '0.05em',
            }}
          >
            ×1.25
          </span>
        )}
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </span>
      </div>

      {editing ? (
        <div className="flex items-center gap-1">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>$</span>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${accent}`,
              outline: 'none',
              textAlign: 'right',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.875rem',
              color: 'var(--text)',
              width: '90px',
            }}
          />
        </div>
      ) : (
        <button
          onClick={() => { setDraft(String(value || '')); setEditing(true) }}
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.875rem',
            color: value ? 'var(--text)' : 'var(--text-dim)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: 4,
          }}
        >
          {value ? fmt(value) : 'tap to enter'}
        </button>
      )}
    </div>
  )
}

// ─── Percent Row (tax / gratuity) ─────────────────────────────────────────────

function PctRow({ label, field, value, base, onChange, accent }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? ''))
  const inputRef = useRef(null)
  const dollarAmt = base * ((value ?? 0) / 100)

  function commit() {
    const parsed = parseFloat(draft.replace(/[^0-9.]/g, '')) || 0
    onChange(field, Math.min(parsed, 99))
    setEditing(false)
  }

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2">
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {label}
        </span>
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => e.key === 'Enter' && commit()}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                borderBottom: `1px solid ${accent}`,
                fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: 'var(--text)',
                width: 40, textAlign: 'right',
              }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
          </div>
        ) : (
          <button
            onClick={() => { setDraft(String(value ?? '')); setEditing(true) }}
            style={{ background: `${accent}14`, border: 'none', cursor: 'pointer', borderRadius: 4, padding: '1px 6px', fontFamily: 'DM Sans, sans-serif', fontSize: '0.72rem', color: accent, fontWeight: 600 }}
          >
            {value ?? 0}%
          </button>
        )}
      </div>
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        {dollarAmt > 0 ? fmt(dollarAmt) : '—'}
      </span>
    </div>
  )
}

// ─── Tension Alert ────────────────────────────────────────────────────────────

const TENSION_LABELS = {
  vis_bud: { label: 'Vision vs. Budget', desc: 'One of you has big dreams; the other is watching costs.' },
  cust_conv: { label: 'Customization vs. Simplicity', desc: 'One wants every detail perfect; the other wants it easy.' },
  guest_count: { label: 'Guest Count', desc: "You're not aligned on how many people to invite." },
  energy: { label: 'Party Energy', desc: 'Different expectations for the vibe and intensity.' },
}

function TensionAlert({ tensionKey }) {
  const info = TENSION_LABELS[tensionKey] || { label: tensionKey, desc: '' }
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl"
      style={{
        background: 'rgba(224,112,112,0.08)',
        border: '1px solid rgba(224,112,112,0.2)',
      }}
    >
      <span style={{ color: 'var(--red)', fontSize: '0.9rem', marginTop: 1 }}>⚡</span>
      <div>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.825rem',
            fontWeight: 600,
            color: 'var(--red)',
          }}
        >
          {info.label}
        </p>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.775rem',
            color: 'var(--text-muted)',
            marginTop: 2,
          }}
        >
          {info.desc}
        </p>
      </div>
    </div>
  )
}

// ─── Nav Card ─────────────────────────────────────────────────────────────────

function NavCard({ label, desc, icon, path, available, navigate }) {
  return (
    <motion.button
      whileHover={available ? { scale: 1.02 } : {}}
      whileTap={available ? { scale: 0.97 } : {}}
      onClick={() => available && navigate(path)}
      className="w-full text-left p-4 rounded-2xl"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        cursor: available ? 'pointer' : 'default',
        opacity: available ? 1 : 0.45,
      }}
    >
      <div className="flex items-center gap-3 mb-1">
        <span style={{ fontSize: '1.25rem' }}>{icon}</span>
        <span
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '0.95rem',
            color: 'var(--text)',
          }}
        >
          {label}
        </span>
        {!available && (
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--border)',
              color: 'var(--text-dim)',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            soon
          </span>
        )}
      </div>
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '0.775rem',
          color: 'var(--text-muted)',
          paddingLeft: '2.25rem',
        }}
      >
        {desc}
      </p>
    </motion.button>
  )
}

// ─── Dash Venue Card ──────────────────────────────────────────────────────────

const REGION_LABEL = { socal: 'SoCal', bay: 'Bay Area', monterey: 'Monterey' }

function normalizeRegion(r) {
  if (!r) return null
  const s = r.toLowerCase()
  if (s === 'bay_area' || s === 'bay') return 'bay'
  return s
}

function DashVenueCard({ venue, accentColor, onClick }) {
  const badges = []
  if (venue.leader)      badges.push({ label: '⭐ Top Pick',    color: '#C9932A' })
  if (venue.has_package) badges.push({ label: '📦 Package',     color: '#7B61FF' })
  if (venue.aqua)        badges.push({ label: '🐟 Aquarium',    color: '#2B9FCC' })
  if (venue.arch)        badges.push({ label: '🏛️ Historic',   color: '#9A7B5E' })
  if (venue.planet)      badges.push({ label: '🔭 Planetarium', color: '#8A5FCC' })

  const regionKey = normalizeRegion(venue.region)
  const regionLabel = REGION_LABEL[regionKey] || venue.region || null

  const feeLabel = venue.venue_fee
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(venue.venue_fee)
    : venue.catering_pp ? 'Bundled' : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Hero image */}
      <div style={{
        height: 110,
        background: venue.image_url
          ? `url(${venue.image_url}) center/cover no-repeat`
          : `linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}05 100%)`,
        position: 'relative',
      }}>
        {venue.image_url && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.5))',
          }} />
        )}
        {regionLabel && (
          <span style={{
            position: 'absolute', bottom: 8, right: 10,
            fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 700,
            color: '#fff', background: 'rgba(0,0,0,0.45)',
            padding: '2px 7px', borderRadius: 10, letterSpacing: '0.04em',
          }}>
            {regionLabel}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontFamily: 'Playfair Display, serif', fontSize: '0.95rem',
            color: 'var(--text)', lineHeight: 1.2,
          }}>
            {venue.name}
          </span>
          {feeLabel && (
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem',
              fontWeight: 600, color: accentColor, whiteSpace: 'nowrap',
            }}>
              {feeLabel}
            </span>
          )}
        </div>

        {badges.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {badges.map(b => (
              <span key={b.label} style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 700,
                color: b.color, background: `${b.color}18`,
                padding: '2px 7px', borderRadius: 10, letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                {b.label}
              </span>
            ))}
          </div>
        )}

        {venue.min_cap || venue.max_cap ? (
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '0.72rem',
            color: 'var(--text-dim)', marginTop: 5,
          }}>
            {venue.min_cap && venue.max_cap
              ? `${venue.min_cap}–${venue.max_cap} guests`
              : venue.max_cap ? `Up to ${venue.max_cap} guests` : `${venue.min_cap}+ guests`}
          </p>
        ) : null}
      </div>
    </motion.div>
  )
}

// ─── Wedding Calendar ─────────────────────────────────────────────────────────

const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CAL_DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function WeddingCalendar({ year, month, onNavMonth, selectedDate, offDays, calMode, onDayClick, onSetMode, accent }) {
  const today    = new Date()
  const todayIso = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const navBtn = {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '4px 10px', borderRadius: 7, color: 'var(--text-muted)',
    fontFamily: 'DM Sans, sans-serif', fontSize: '1rem', lineHeight: 1,
  }

  return (
    <div>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button style={navBtn} onClick={() => onNavMonth(-1)}>‹</button>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.95rem', color: 'var(--text)' }}>
          {CAL_MONTHS[month]} {year}
        </span>
        <button style={navBtn} onClick={() => onNavMonth(1)}>›</button>
      </div>

      {/* Day-of-week labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: '0.65rem', color: 'var(--text-dim)', paddingBottom: 2 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} />
          const isSelected = iso === selectedDate
          const isOff      = offDays.includes(iso)
          const isToday    = iso === todayIso
          const blocked    = calMode === 'select' && isOff
          const day        = parseInt(iso.split('-')[2], 10)

          return (
            <button
              key={iso}
              onClick={() => !blocked && onDayClick(iso)}
              style={{
                position: 'relative',
                padding: '7px 2px',
                borderRadius: 8,
                border: isSelected
                  ? `1.5px solid ${accent}`
                  : isOff && calMode === 'off'
                  ? '1.5px solid rgba(224,112,112,0.4)'
                  : '1.5px solid transparent',
                background: isSelected
                  ? `${accent}22`
                  : isOff
                  ? 'rgba(224,112,112,0.09)'
                  : 'none',
                cursor: blocked ? 'not-allowed' : 'pointer',
                opacity: blocked ? 0.4 : 1,
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.8rem',
                fontWeight: isSelected ? 700 : 400,
                color: isSelected ? accent : isOff ? 'rgba(224,112,112,0.75)' : 'var(--text)',
                textDecoration: isOff ? 'line-through' : 'none',
                textAlign: 'center',
                transition: 'all 0.12s',
              }}
            >
              {day}
              {isToday && (
                <span style={{
                  position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                  width: 3, height: 3, borderRadius: '50%',
                  background: isSelected ? accent : 'var(--text-dim)',
                  display: 'block',
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
        <button
          onClick={() => onSetMode('select')}
          style={{
            flex: 1, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem',
            fontWeight: calMode === 'select' ? 600 : 400,
            background: calMode === 'select' ? `${accent}18` : 'rgba(0,0,0,0.05)',
            color: calMode === 'select' ? accent : 'var(--text-muted)',
            border: `1px solid ${calMode === 'select' ? accent + '40' : 'transparent'}`,
            transition: 'all 0.12s',
          }}
        >
          Pick Date
        </button>
        <button
          onClick={() => onSetMode('off')}
          style={{
            flex: 1, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem',
            fontWeight: calMode === 'off' ? 600 : 400,
            background: calMode === 'off' ? 'rgba(224,112,112,0.12)' : 'rgba(0,0,0,0.05)',
            color: calMode === 'off' ? '#E07070' : 'var(--text-muted)',
            border: `1px solid ${calMode === 'off' ? 'rgba(224,112,112,0.4)' : 'transparent'}`,
            transition: 'all 0.12s',
          }}
        >
          Block Off-Days
        </button>
      </div>
    </div>
  )
}

function formatCalDate(iso) {
  const d = new Date(iso + 'T12:00:00')
  return `${CAL_DAYS[d.getDay()]}, ${CAL_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard({ user, onSwitchUser }) {
  const navigate = useNavigate()
  const userMeta = USERS[user]

  const [meta, setMeta] = useState(null)
  const [breakdown, setBreakdown] = useState(DEFAULT_BREAKDOWN)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [venues, setVenues] = useState([])
  const [selectedVenueId, setSelectedVenueId] = useState(null)
  const [guestCount, setGuestCount] = useState(150)
  const [pkgSelections, setPkgSelections] = useState({})
  const saveTimerRef = useRef(null)

  // ── Calendar ─────────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(null)
  const [offDays, setOffDays]           = useState([])
  const [calYear, setCalYear]           = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth]         = useState(() => new Date().getMonth())
  const [calMode, setCalMode]           = useState('select')
  const [pricingState, setPricingState] = useState('idle') // 'idle'|'loading'|'done'|'error'
  const [lockedVenue,  setLockedVenue]  = useState(null)
  const [lockedCinema, setLockedCinema] = useState(null)
  const [guestStats,   setGuestStats]   = useState({ total: 0, plusOnes: 0, kerwin: 0, dani: 0 })

  // ── Load project_metadata + venues ────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [{ data }, { data: venueData }, { data: cinemaData }, { data: guestData }] = await Promise.all([
        supabase.from('project_metadata').select('*').eq('id', 1).single(),
        supabase.from('venues').select('*').neq('archived', true).order('name'),
        supabase.from('cinematographers').select('*').eq('locked', true).single(),
        supabase.from('guests').select('status, plus_one, side').eq('status', 'locked'),
      ])

      if (data) {
        setMeta(data)
        const bb = data.budget_breakdown || {}
        if (Object.keys(bb).length > 0) {
          setBreakdown({ ...DEFAULT_BREAKDOWN, ...bb })
        }
        if (bb._venue_id) setSelectedVenueId(bb._venue_id)
        if (bb._guests) setGuestCount(bb._guests)
        if (bb._pkg) setPkgSelections(bb._pkg)
        if (bb._cal_date) setSelectedDate(bb._cal_date)
        if (bb._cal_off)  setOffDays(bb._cal_off || [])

        if (cinemaData) setLockedCinema(cinemaData)
        if (guestData) {
          const plusOnes = guestData.filter(g => g.plus_one).length
          const kerwin   = guestData.filter(g => g.side === 'kerwin').length
          const dani     = guestData.filter(g => g.side === 'dani').length
          setGuestStats({ total: guestData.length, plusOnes, kerwin, dani })
        }
        const locked = venueData?.find(v => v.locked)
        if (locked) {
          setLockedVenue(locked)
          const bb2 = data.budget_breakdown || {}
          if (!bb2._venue_id) setSelectedVenueId(locked.id)
        }
      }
      setVenues(venueData || [])
      setLoaded(true)
    }
    load()
  }, [])

  // ── Realtime subscription on project_metadata ──────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('dashboard_meta')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'project_metadata', filter: 'id=eq.1' },
        (payload) => {
          setMeta(payload.new)
          if (payload.new.budget_breakdown && Object.keys(payload.new.budget_breakdown).length > 0) {
            setBreakdown((prev) => ({ ...prev, ...payload.new.budget_breakdown }))
          }
          const bb = payload.new.budget_breakdown || {}
          if (bb._venue_id) setSelectedVenueId(bb._venue_id)
          if (bb._guests) setGuestCount(bb._guests)
          if (bb._pkg) setPkgSelections(bb._pkg)
          if (bb._cal_date) setSelectedDate(bb._cal_date)
          if (bb._cal_off)  setOffDays(bb._cal_off || [])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Persist breakdown to Supabase (debounced) ─────────────────────────────
  const persistBreakdown = useCallback((next) => {
    clearTimeout(saveTimerRef.current)
    setSaving(true)
    saveTimerRef.current = setTimeout(async () => {
      await supabase.from('project_metadata').update({ budget_breakdown: next }).eq('id', 1)
      setSaving(false)
    }, 600)
  }, [])

  // ── Compute package-driven costs from current selections + guests ──────────
  function applyPackageCosts(pkg, selections, guests, base) {
    const next = { ...base }
    for (const cat of pkg.categories) {
      const selId = selections[cat.key] ?? cat.options[0].id
      const opt = cat.options.find(o => o.id === selId) ?? cat.options[0]
      next[cat.budgetField] = calcOptionCost(opt, guests)
    }
    return next
  }

  // ── Calendar handlers ─────────────────────────────────────────────────────

  async function handlePickDate(date) {
    setSelectedDate(date)
    setPricingState('idle')
    const next = { ...breakdown, _cal_date: date, _cal_off: offDays }
    setBreakdown(next)
    await supabase.from('project_metadata').update({
      wedding_date: formatCalDate(date),
      budget_breakdown: next,
    }).eq('id', 1)
    triggerAutoPricing(date, next)
  }

  async function handleToggleOffDay(date) {
    const next = offDays.includes(date)
      ? offDays.filter(d => d !== date)
      : [...offDays, date]
    setOffDays(next)
    const newDate = next.includes(selectedDate) ? null : selectedDate
    if (newDate !== selectedDate) setSelectedDate(newDate)
    const bb = { ...breakdown, _cal_off: next, _cal_date: newDate }
    setBreakdown(bb)
    await supabase.from('project_metadata').update({
      budget_breakdown: bb,
      ...(newDate !== selectedDate ? { wedding_date: null } : {}),
    }).eq('id', 1)
  }

  async function triggerAutoPricing(date, currentBreakdown) {
    const venueUrl = venues.find(v => v.id === selectedVenueId)?.url ?? null
    const quotes   = currentBreakdown._quotes ?? []
    if (!venueUrl && quotes.length === 0) return
    setPricingState('loading')
    try {
      const res = await fetch('/.netlify/functions/date-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, venueUrl, quotes }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const pricing = await res.json()
      if (pricing.error) throw new Error(pricing.error)

      const merged = { ...currentBreakdown }
      for (const field of ['venue','catering','bar','photography','florals','music','other']) {
        if ((pricing[field] ?? 0) > 0) merged[field] = pricing[field]
      }
      merged._pricing_notes = pricing.notes
      merged._pricing_date  = date

      setBreakdown(merged)
      setPricingState('done')
      await supabase.from('project_metadata').update({
        plus_plus_multiplier: pricing.multiplier ?? 1.25,
        budget_breakdown: merged,
      }).eq('id', 1)
    } catch {
      setPricingState('error')
    }
  }

  function handleCalNav(dir) {
    let m = calMonth + dir
    let y = calYear
    if (m < 0)  { m = 11; y-- }
    if (m > 11) { m = 0;  y++ }
    setCalMonth(m)
    setCalYear(y)
  }

  // ── Budget line update (manual rows) ──────────────────────────────────────
  async function updateLine(field, val) {
    const next = { ...breakdown, [field]: val }
    setBreakdown(next)
    persistBreakdown(next)
  }

  // ── Venue selection ────────────────────────────────────────────────────────
  function selectVenue(rawId) {
    const venueId = rawId != null && rawId !== '' ? Number(rawId) : null
    setSelectedVenueId(venueId)

    const pkg = venueId ? VENUE_PACKAGES[venueId] : null
    let next

    if (pkg) {
      const sels = defaultSelections(pkg)
      const guests = pkg.defaultGuests
      setPkgSelections(sels)
      setGuestCount(guests)
      next = applyPackageCosts(pkg, sels, guests, {
        ...breakdown, _venue_id: venueId, _guests: guests, _pkg: sels,
      })
    } else {
      // No package — just use venue_fee from venues list
      const venue = venues.find(v => v.id === venueId)
      const fee = venue?.venue_fee ? Number(venue.venue_fee) : 0
      next = { ...breakdown, venue: fee, _venue_id: venueId }
    }

    setBreakdown(next)
    persistBreakdown(next)
  }

  // ── Package option selection ───────────────────────────────────────────────
  function selectPkgOption(catKey, optionId) {
    const pkg = VENUE_PACKAGES[selectedVenueId]
    if (!pkg) return
    const newSels = { ...pkgSelections, [catKey]: optionId }
    setPkgSelections(newSels)
    const next = applyPackageCosts(pkg, newSels, guestCount, {
      ...breakdown, _pkg: newSels,
    })
    setBreakdown(next)
    persistBreakdown(next)
  }

  // ── Guest count change ─────────────────────────────────────────────────────
  function changeGuests(count) {
    const pkg = VENUE_PACKAGES[selectedVenueId]
    if (!pkg) return
    const clamped = Math.max(1, Math.min(pkg.maxCap || 999, count))
    setGuestCount(clamped)
    const next = applyPackageCosts(pkg, pkgSelections, clamped, {
      ...breakdown, _guests: clamped,
    })
    setBreakdown(next)
    persistBreakdown(next)
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const activePackage = selectedVenueId ? VENUE_PACKAGES[selectedVenueId] ?? null : null
  const multiplier = meta?.plus_plus_multiplier ?? 1.25
  const { variable, fixed, taxAmt, gratAmt, total } = calcTotal(breakdown, multiplier)
  const budget = meta?.budget_target ?? 0
  const overBudget = budget > 0 && total > budget
  const pct = budget > 0 ? Math.min((total / budget) * 100, 100) : 0

  const tensions = meta?.tension_points ?? []

  const compatibility = meta?.compatibility_score ?? null
  const kerwinArchetype = meta?.kerwin_archetype ?? null
  const daniArchetype = meta?.dani_archetype ?? null

  if (!loaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--dark)' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: userMeta.color, borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen pb-16"
      style={{ background: 'var(--dark)' }}
    >
      <div className="w-full max-w-md mx-auto px-4 pt-10">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div>
            <h1
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.6rem',
                color: 'var(--text)',
                lineHeight: 1.15,
              }}
            >
              Command Center
            </h1>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.8rem',
                color: 'var(--text-dim)',
                marginTop: 4,
              }}
            >
              Wedding OS · {meta?.wedding_date ?? 'Date TBD'}
            </p>
          </div>
        </div>

        {/* ── Confirmed Picks ──────────────────────────────────────────── */}
        {(lockedVenue || lockedCinema) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl mb-4"
            style={{ background: 'var(--card)', border: `1px solid ${userMeta.color}44` }}
          >
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.05rem', color: 'var(--text)', margin: '0 0 14px' }}>
              🔒 Confirmed
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lockedVenue && (
                <div style={{
                  background: 'rgba(201,147,42,0.08)', border: '1px solid rgba(201,147,42,0.3)',
                  borderRadius: 12, padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                      {lockedVenue.name}
                    </div>
                    <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#C9932A', fontWeight: 600, letterSpacing: '0.06em' }}>VENUE</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)' }}>
                      {lockedVenue.region_label || lockedVenue.region}
                    </div>
                    {lockedVenue.url && (
                      <a href={lockedVenue.url} target="_blank" rel="noreferrer"
                        style={{ fontFamily: 'DM Sans', fontSize: 12, color: userMeta.color, textDecoration: 'none', fontWeight: 600 }}>
                        Visit →
                      </a>
                    )}
                  </div>
                  {(lockedVenue.venue_fee || lockedVenue.catering_pp) && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      {lockedVenue.venue_fee && (
                        <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)' }}>
                          Venue fee: <strong style={{ color: 'var(--text)' }}>${lockedVenue.venue_fee.toLocaleString()}</strong>
                        </span>
                      )}
                      {lockedVenue.catering_pp && (
                        <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)' }}>
                          · Catering: <strong style={{ color: 'var(--text)' }}>${lockedVenue.catering_pp}/pp</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {lockedCinema && (
                <div style={{
                  background: 'rgba(201,147,42,0.05)', border: '1px solid rgba(201,147,42,0.2)',
                  borderRadius: 12, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                      {lockedCinema.name}
                    </div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {lockedCinema.package_name || 'Cinema'}{lockedCinema.price ? ` · $${lockedCinema.price.toLocaleString()}` : ''}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#C9932A', fontWeight: 600, letterSpacing: '0.06em' }}>CINEMA</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Guest Count ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl mb-4"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.05rem', color: 'var(--text)', margin: 0 }}>
              👥 Guest List
            </h2>
            <button onClick={() => navigate('/guests')}
              style={{ fontFamily: 'DM Sans', fontSize: '0.78rem', color: userMeta.color, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
              Manage →
            </button>
          </div>
          {guestStats.total === 0 ? (
            <p style={{ fontFamily: 'DM Sans', fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>
              No locked guests yet. Head to <button onClick={() => navigate('/guests')} style={{ background: 'none', border: 'none', color: userMeta.color, cursor: 'pointer', fontFamily: 'DM Sans', fontSize: '0.8rem', fontWeight: 600, padding: 0 }}>Guest Draft Board</button> to start building your list.
            </p>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: 'Total', value: guestStats.total + guestStats.plusOnes, sub: `${guestStats.total} + ${guestStats.plusOnes} (+1s)` },
                { label: 'Kerwin', value: guestStats.kerwin, sub: 'side' },
                { label: 'Dani', value: guestStats.dani, sub: 'side' },
              ].map(({ label, value, sub }) => (
                <div key={label} style={{
                  flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                  padding: '10px 12px', textAlign: 'center',
                }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
                  {sub !== 'side' && <div style={{ fontFamily: 'DM Sans', fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{sub}</div>}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Wedding Date Calendar ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl mb-4"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.05rem', color: 'var(--text)', margin: 0 }}>
              Wedding Date
            </h2>
            {selectedDate && (
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: userMeta.color, fontWeight: 600 }}>
                {formatCalDate(selectedDate).split(', ').slice(1).join(', ')}
              </span>
            )}
          </div>

          <WeddingCalendar
            year={calYear}
            month={calMonth}
            onNavMonth={handleCalNav}
            selectedDate={selectedDate}
            offDays={offDays}
            calMode={calMode}
            onDayClick={date => calMode === 'select' ? handlePickDate(date) : handleToggleOffDay(date)}
            onSetMode={setCalMode}
            accent={userMeta.color}
          />

          {pricingState === 'loading' && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 15, height: 15, borderRadius: '50%',
                border: `2px solid ${userMeta.color}`, borderTopColor: 'transparent',
                animation: 'spin 0.7s linear infinite', flexShrink: 0,
              }} />
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Reading quotes &amp; venue site…
              </span>
            </div>
          )}
          {pricingState === 'error' && (
            <p style={{ marginTop: 10, fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: '#E07070', margin: '10px 0 0' }}>
              Couldn't auto-fill pricing. Check venue URL or try again.
            </p>
          )}
        </motion.div>

        {/* ── Archetype Pair Card ────────────────────────────────────────── */}
        {(kerwinArchetype || daniArchetype) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl mb-4"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col items-center">
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.7rem',
                    color: USERS.kerwin.color,
                    marginBottom: 8,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Kerwin
                </span>
                {kerwinArchetype ? (
                  <ArchetypeBadge archetypeId={kerwinArchetype} size="md" />
                ) : (
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif' }}>
                    Quiz pending
                  </span>
                )}
              </div>

              {/* Compatibility score */}
              {compatibility !== null && (
                <div className="flex flex-col items-center">
                  <p
                    style={{
                      fontFamily: 'Playfair Display, serif',
                      fontSize: '2rem',
                      color: 'var(--text)',
                      lineHeight: 1,
                    }}
                  >
                    {compatibility}
                  </p>
                  <p
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '0.65rem',
                      color: 'var(--text-dim)',
                      marginTop: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Match
                  </p>
                </div>
              )}

              <div className="flex flex-col items-center">
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.7rem',
                    color: USERS.dani.color,
                    marginBottom: 8,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Dani
                </span>
                {daniArchetype ? (
                  <ArchetypeBadge archetypeId={daniArchetype} size="md" />
                ) : (
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif' }}>
                    Quiz pending
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tension Alerts ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {tensions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-2 mb-4"
            >
              {tensions.map((t) => (
                <TensionAlert key={t} tensionKey={t} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Budget Calculator ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-2xl mb-4"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.05rem',
                color: 'var(--text)',
              }}
            >
              Live Budget
            </h2>
            {saving && (
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.7rem',
                  color: 'var(--text-dim)',
                }}
              >
                Saving…
              </span>
            )}
          </div>

          {/* Venue selector */}
          {venues.length > 0 && (
            <div className="mb-4">
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.7rem',
                  color: 'var(--text-dim)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Venue
              </p>
              <select
                value={selectedVenueId || ''}
                onChange={e => selectVenue(e.target.value ? Number(e.target.value) : null)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedVenueId ? userMeta.color + '88' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.875rem',
                  color: selectedVenueId ? 'var(--text)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: 32,
                }}
              >
                <option value="" style={{ background: '#1a1a1a' }}>Select a venue…</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id} style={{ background: '#1a1a1a' }}>
                    {v.name}{v.venue_fee ? ` — ${fmt(v.venue_fee)}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Variable costs (×1.25) */}
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem',
            color: 'var(--text-dim)', marginBottom: activePackage ? 8 : 4,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Variable costs (×{multiplier})
          </p>

          {activePackage ? (
            /* ── Package Configurator ── */
            <div style={{ marginBottom: 4 }}>
              {/* Guest count stepper */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)', marginBottom: 12,
              }}>
                <span style={{ fontFamily: 'DM Sans', fontSize: '0.8rem', color: 'var(--text-muted)', flex: 1 }}>
                  👥 Guest Count
                </span>
                {[[-10,'−−'],[-1,'−']].map(([d, lbl]) => (
                  <button key={lbl} onClick={() => changeGuests(guestCount + d)} style={{
                    width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)',
                    background: 'transparent', cursor: 'pointer', fontFamily: 'DM Sans',
                    fontSize: 13, fontWeight: 700, color: 'var(--text)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{lbl}</button>
                ))}
                <input
                  type="number"
                  value={guestCount}
                  onChange={e => changeGuests(parseInt(e.target.value) || 1)}
                  style={{
                    width: 56, textAlign: 'center', fontFamily: 'DM Sans',
                    fontSize: 15, fontWeight: 700, color: 'var(--text)',
                    border: '1px solid var(--border)', borderRadius: 8,
                    padding: '3px 4px', background: 'rgba(26,18,8,0.03)',
                  }}
                />
                {[[1,'+'],[10,'++']].map(([d, lbl]) => (
                  <button key={lbl} onClick={() => changeGuests(guestCount + d)} style={{
                    width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)',
                    background: 'transparent', cursor: 'pointer', fontFamily: 'DM Sans',
                    fontSize: 13, fontWeight: 700, color: 'var(--text)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{lbl}</button>
                ))}
              </div>

              {/* Option cards per category */}
              {activePackage.categories.map(cat => {
                const selId = pkgSelections[cat.key] ?? cat.options[0].id
                return (
                  <div key={cat.key} style={{ marginBottom: 10 }}>
                    <p style={{
                      fontFamily: 'DM Sans', fontSize: '0.7rem', color: 'var(--text-dim)',
                      marginBottom: 6, letterSpacing: '0.04em',
                    }}>
                      {cat.label}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {cat.options.map(opt => {
                        const cost = calcOptionCost(opt, guestCount)
                        const selected = selId === opt.id
                        return (
                          <button
                            key={opt.id}
                            onClick={() => selectPkgOption(cat.key, opt.id)}
                            style={{
                              flex: '1 1 140px', textAlign: 'left',
                              padding: '10px 12px', borderRadius: 12,
                              border: `1.5px solid ${selected ? userMeta.color : 'rgba(255,255,255,0.1)'}`,
                              background: selected ? `${userMeta.color}18` : 'rgba(255,255,255,0.03)',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            <div style={{
                              fontFamily: 'DM Sans', fontSize: '0.8rem', fontWeight: 600,
                              color: selected ? 'var(--text)' : 'var(--text-muted)', marginBottom: 2,
                            }}>
                              {opt.label}
                            </div>
                            <div style={{
                              fontFamily: 'DM Sans', fontSize: '0.7rem',
                              color: selected ? userMeta.color : 'var(--text-dim)',
                              fontWeight: selected ? 700 : 400,
                            }}>
                              {cost === 0 ? 'Included' : fmt(cost)}
                            </div>
                            <div style={{
                              fontFamily: 'DM Sans', fontSize: '0.65rem',
                              color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.35,
                            }}>
                              {opt.desc}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* ── Manual rows ── */
            <>
              {[
                { field: 'venue', label: 'Venue' },
                { field: 'catering', label: 'Catering' },
                { field: 'bar', label: 'Bar' },
              ].map(({ field, label }) => (
                <BudgetRow
                  key={field}
                  field={field}
                  label={label}
                  value={breakdown[field]}
                  onChange={updateLine}
                  accent={userMeta.color}
                  isVariable
                />
              ))}
            </>
          )}

          {/* Fixed costs */}
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.7rem',
              color: 'var(--text-dim)',
              marginTop: 16,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Fixed costs
          </p>

          {[
            { field: 'photography', label: 'Photography / Video' },
            { field: 'florals', label: 'Florals' },
            { field: 'music', label: 'Music / Entertainment' },
            { field: 'other', label: 'Other' },
          ].map(({ field, label }) => (
            <BudgetRow
              key={field}
              field={field}
              label={label}
              value={breakdown[field]}
              onChange={updateLine}
              accent={userMeta.color}
              isVariable={false}
            />
          ))}

          {/* Tax & Gratuity */}
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 16, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Tax &amp; Gratuity <span style={{ fontSize: '0.6rem', letterSpacing: 0, textTransform: 'none', color: 'var(--text-dim)' }}>(applied to F&amp;B)</span>
          </p>
          <PctRow label="Sales Tax" field="taxRate" value={breakdown.taxRate ?? 9.5} base={(breakdown.catering || 0) + (breakdown.bar || 0)} onChange={updateLine} accent={userMeta.color} />
          <PctRow label="Gratuity" field="gratRate" value={breakdown.gratRate ?? 20.0} base={(breakdown.catering || 0) + (breakdown.bar || 0)} onChange={updateLine} accent={userMeta.color} />

          {/* Formula breakdown */}
          <div
            className="mt-4 pt-4 flex flex-col gap-1.5"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {[
              { label: `Variable subtotal (×${multiplier})`, val: variable },
              { label: 'Fixed costs', val: fixed },
              { label: `Tax (${breakdown.taxRate ?? 9.5}%)`, val: taxAmt },
              { label: `Gratuity (${breakdown.gratRate ?? 20.0}%)`, val: gratAmt },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between">
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmt(val)}</span>
              </div>
            ))}

            <div
              className="flex justify-between pt-2 mt-1"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.05rem', color: overBudget ? 'var(--red)' : 'var(--text)' }}>
                Total
              </span>
              <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.05rem', color: overBudget ? 'var(--red)' : 'var(--text)' }}>
                {fmt(total)}
              </span>
            </div>
          </div>

          {/* AI pricing notes banner */}
          {breakdown._pricing_notes && breakdown._pricing_date === selectedDate && (
            <div
              className="mt-3 px-3 py-2.5 rounded-xl"
              style={{ background: `${userMeta.color}0E`, border: `1px solid ${userMeta.color}28` }}
            >
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: userMeta.color, margin: '0 0 8px', lineHeight: 1.5 }}>
                ✦ {breakdown._pricing_notes}
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => triggerAutoPricing(selectedDate, breakdown)}
                  disabled={pricingState === 'loading'}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: `1px solid ${userMeta.color}50`,
                    background: 'none', color: userMeta.color, cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif', fontSize: '0.72rem', fontWeight: 600,
                    opacity: pricingState === 'loading' ? 0.5 : 1,
                  }}
                >
                  ↺ Re-run
                </button>
                <button
                  onClick={async () => {
                    const cleared = { ...breakdown }
                    delete cleared._pricing_notes
                    delete cleared._pricing_date
                    for (const f of ['venue','catering','bar','photography','florals','music','other']) {
                      cleared[f] = 0
                    }
                    setBreakdown(cleared)
                    setPricingState('idle')
                    persistBreakdown(cleared)
                  }}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif', fontSize: '0.72rem',
                  }}
                >
                  ✕ Clear
                </button>
              </div>
            </div>
          )}

          {/* Budget progress bar */}
          {budget > 0 && (
            <div className="mt-3">
              <div
                className="h-1 w-full rounded-full"
                style={{ background: 'var(--border)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: overBudget ? 'var(--red)' : userMeta.color }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.7rem',
                    color: overBudget ? 'var(--red)' : 'var(--text-dim)',
                  }}
                >
                  {overBudget ? `${fmt(total - budget)} over budget` : `${fmt(budget - total)} remaining`}
                </span>
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.7rem',
                    color: 'var(--text-dim)',
                  }}
                >
                  Target: {fmt(budget)}
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Top Venues ──────────────────────────────────────────────────── */}
        {venues.filter(v => v.locked || v.leader).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-4"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.05rem', color: 'var(--text)', margin: 0 }}>
                Top Venues
              </h2>
              <button
                onClick={() => navigate('/venues')}
                style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem',
                  color: userMeta.color, background: 'none', border: 'none',
                  cursor: 'pointer', fontWeight: 600, padding: 0,
                }}
              >
                See all →
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...venues]
                .filter(v => v.locked || v.leader)
                .slice(0, 3)
                .map(v => (
                  <DashVenueCard
                    key={v.id}
                    venue={v}
                    accentColor={userMeta.color}
                    onClick={() => navigate('/venues')}
                  />
                ))
              }
            </div>
          </motion.div>
        )}

        {/* ── Navigation Hub ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-3"
        >
          <NavCard
            label="Venue Scouting"
            desc="36 venues across SoCal, Bay Area & Monterey. Rate, compare, and build packages."
            icon="🏛"
            path="/venues"
            available={true}
            navigate={navigate}
          />
          <NavCard
            label="Guest Draft Board"
            desc="Locked, Bubble Squad, and Practice Squad. Live headcount & budget impact."
            icon="👥"
            path="/guests"
            available={true}
            navigate={navigate}
          />
          <NavCard
            label="Vendor Windows"
            desc="Music, catering, bar, cinematography, florals, and more."
            icon="🎼"
            path="/vendors"
            available={true}
            navigate={navigate}
          />
          <NavCard
            label="Style Quiz"
            desc="10 questions to find your wedding archetype and planning style."
            icon="🧬"
            path="/quiz"
            available={true}
            navigate={navigate}
          />
          <NavCard
            label="Compatibility Report"
            desc="Your archetype match, tension points, and planning playbook."
            icon="📊"
            path="/results"
            available={kerwinArchetype !== null && daniArchetype !== null}
            navigate={navigate}
          />
          <NavCard
            label="Vibe Scraper"
            desc="Drop a URL. We'll analyze the visual DNA and score it against your archetype."
            icon="✨"
            path="/vibe"
            available={true}
            navigate={navigate}
          />
        </motion.div>

      </div>
    </div>
  )
}
