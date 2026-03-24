import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, USERS } from '../lib/supabase'
import ArchetypeBadge from '../components/ArchetypeBadge'

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

  // ── Load project_metadata ──────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('project_metadata')
        .select('*')
        .eq('id', 1)
        .single()

      if (data) {
        setMeta(data)
        if (data.budget_breakdown && Object.keys(data.budget_breakdown).length > 0) {
          setBreakdown({ ...DEFAULT_BREAKDOWN, ...data.budget_breakdown })
        }
      }
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
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Budget line update ─────────────────────────────────────────────────────
  async function updateLine(field, val) {
    const next = { ...breakdown, [field]: val }
    setBreakdown(next)
    setSaving(true)
    await supabase
      .from('project_metadata')
      .update({ budget_breakdown: next })
      .eq('id', 1)
    setSaving(false)
  }

  // ── Derived ───────────────────────────────────────────────────────────────
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
        <div className="flex items-center justify-between mb-8">
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
          <button
            onClick={onSwitchUser}
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.8rem',
              color: 'var(--text-dim)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Switch user
          </button>
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

          {/* Variable costs (×1.25) */}
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.7rem',
              color: 'var(--text-dim)',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Variable costs (×{multiplier})
          </p>

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
            desc="33 venues rated on the 40-point combine. Tandem ratings & smart inquiry."
            icon="🏛"
            path="/venues"
            available={false}
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
            label="Vibe Scraper"
            desc="Drop a URL. We'll analyze the visual DNA and score it against your archetype."
            icon="✨"
            path="/vibe"
            available={false}
            navigate={navigate}
          />
        </motion.div>

      </div>
    </div>
  )
}
