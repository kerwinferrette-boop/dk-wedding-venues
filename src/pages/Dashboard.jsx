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
}

function calcTotal(b, multiplier = 1.25) {
  const variable = (b.venue + b.catering + b.bar) * multiplier
  const fixed = b.photography + b.florals + b.music + b.other
  return { variable, fixed, total: variable + fixed }
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

  // ── Load project_metadata + venues ────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [{ data }, { data: venueData }] = await Promise.all([
        supabase.from('project_metadata').select('*').eq('id', 1).single(),
        supabase.from('venues').select('id, name, venue_fee').neq('archived', true).order('name'),
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
  const { variable, fixed, total } = calcTotal(breakdown, multiplier)
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

          {/* Formula breakdown */}
          <div
            className="mt-4 pt-4 flex flex-col gap-1.5"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div className="flex justify-between">
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                Variable subtotal (×{multiplier})
              </span>
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                {fmt(variable)}
              </span>
            </div>
            <div className="flex justify-between">
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                Fixed costs
              </span>
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                {fmt(fixed)}
              </span>
            </div>

            <div
              className="flex justify-between pt-2 mt-1"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <span
                style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '1.05rem',
                  color: overBudget ? 'var(--red)' : 'var(--text)',
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '1.05rem',
                  color: overBudget ? 'var(--red)' : 'var(--text)',
                }}
              >
                {fmt(total)}
              </span>
            </div>
          </div>

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
