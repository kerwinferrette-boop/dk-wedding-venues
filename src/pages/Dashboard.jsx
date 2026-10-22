// Execution-phase dashboard.
// Venue is locked (La Valencia, 3/27/27). This page is the one-glance status
// of: where the budget stands at the current/projected guest count, what
// vendors are still open, and what's due next on the timeline.

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  fetchQuote,
  fetchProjectMetadata,
  computeBudget,
  computeMarginalCostPerGuest,
  fetchExtras,
  computeExtras,
  computeVendorCommitments,
  computeContributionBreakdown,
  fetchWeekendVenues,
  fetchWeekendItinerary,
  computeWeekendSpend,
  computeBudgetByCategory,
  computeHeadcount,
  guestTargets,
  headcountStatus,
  budgetStatus,
  formatUsd,
  formatUsdPrecise,
} from '../lib/budget'
import { categoryLabel, categoryColor } from '../lib/budgetCategories'
import BudgetStackedBar from '../components/BudgetStackedBar'

const PAGE_BG = 'var(--dark)'
const TODAY = new Date()
const WEDDING_DATE = new Date('2027-03-27')
const MILESTONE_LIMIT = 20

// Guest-count slider range. Deliberately wider than the cap so you can model
// going over it.
const SLIDER_MIN = 100
const SLIDER_MAX = 210
const sliderPct = (n) =>
  Math.max(0, Math.min(100, ((n - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100))

const CAP_COLORS = {
  under: 'var(--green)',
  'over-target': 'var(--yellow)',
  'over-cap': 'var(--red)',
}

/** A labelled tick under the guest slider at a given percentage of the track. */
function Marker({ pct, color, label, dotted }) {
  return (
    <div style={{
      position: 'absolute', left: `${pct}%`, top: 0,
      transform: 'translateX(-50%)', display: 'flex',
      flexDirection: 'column', alignItems: 'center', pointerEvents: 'none',
    }}>
      <div style={{
        width: 0, height: 6,
        borderLeft: `${dotted ? '1px dashed' : '2px solid'} ${color}`,
      }} />
      <div style={{
        fontSize: 9, color, fontFamily: 'DM Sans',
        letterSpacing: '0.04em', whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
    </div>
  )
}

async function fetchPendingMilestones() {
  const { data } = await supabase
    .from('timeline_milestones')
    .select('*')
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(MILESTONE_LIMIT)
  return data || []
}

function daysBetween(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

function statusColor(s) {
  if (s === 'green') return 'var(--green)'
  if (s === 'yellow') return 'var(--yellow)'
  if (s === 'red') return 'var(--red)'
  return 'var(--text-muted)'
}

export default function Dashboard() {
  const navigate = useNavigate()

  const [quote, setQuote] = useState([])
  const [meta, setMeta] = useState(null)
  const [vendors, setVendors] = useState([])
  const [milestones, setMilestones] = useState([])
  const [guests, setGuests] = useState([])
  const [extras, setExtras] = useState([])
  const [weekendVenues, setWeekendVenues] = useState([])
  const [weekendItinerary, setWeekendItinerary] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Guest count slider state - synced to the live projected headcount once guests load.
  const [projectedGuests, setProjectedGuests] = useState(150)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [q, m, v, t, g, x, wv, wi] = await Promise.all([
          fetchQuote(),
          fetchProjectMetadata(),
          supabase.from('vendor_pipeline').select('*').order('priority', { ascending: true }),
          fetchPendingMilestones(),
          supabase.from('guests').select('id, rsvp, plus_one, cut_candidate'),
          fetchExtras(),
          fetchWeekendVenues(),
          fetchWeekendItinerary(),
        ])
        if (cancelled) return
        setQuote(q)
        setMeta(m)
        setVendors(v.data || [])
        setMilestones(t)
        setGuests(g.data || [])
        setExtras(x)
        setWeekendVenues(wv)
        setWeekendItinerary(wi)
        // projectedGuests is kept in sync by the towardCap useEffect below
      } catch (e) {
        if (!cancelled) setError(e.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Real-time subscriptions so skills writing into Supabase reflect live.
  useEffect(() => {
    const ch = supabase
      .channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_pipeline' },
        async () => {
          const { data } = await supabase.from('vendor_pipeline').select('*').order('priority')
          setVendors(data || [])
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timeline_milestones' },
        async () => setMilestones(await fetchPendingMilestones()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' },
        async () => {
          // Must select the same columns as the initial load - computeHeadcount
          // needs plus_one and cut_candidate, not just rsvp.
          const { data } = await supabase.from('guests').select('id, rsvp, plus_one, cut_candidate')
          setGuests(data || [])
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'extras_budget' },
        async () => setExtras(await fetchExtras()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekend_venues' },
        async () => setWeekendVenues(await fetchWeekendVenues()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekend_itinerary' },
        async () => setWeekendItinerary(await fetchWeekendItinerary()))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const headcount = useMemo(() => computeHeadcount(guests), [guests])
  const targets = useMemo(() => guestTargets(meta), [meta])
  const towardCap = headcount.projected

  // Keep slider in sync with the actual guest list whenever it changes
  useEffect(() => {
    if (towardCap > 0) setProjectedGuests(towardCap)
  }, [towardCap])

  const budget = useMemo(() => {
    if (!quote.length) return null
    return computeBudget(quote, projectedGuests, { vendorCount: 6 })
  }, [quote, projectedGuests])

  const marginal = useMemo(() => {
    if (!quote.length) return 0
    return computeMarginalCostPerGuest(quote, projectedGuests, { vendorCount: 6 })
  }, [quote, projectedGuests])

  const extrasSummary = useMemo(() => computeExtras(extras), [extras])

  const vendorCommitments = useMemo(() =>
    computeVendorCommitments(vendors, { exclude: ['catering', 'bar'] }),
  [vendors])

  const contributions = useMemo(() =>
    computeContributionBreakdown(extras, vendorCommitments.rows),
  [extras, vendorCommitments])

  const weekendSpend = useMemo(() =>
    computeWeekendSpend(weekendVenues, weekendItinerary),
  [weekendVenues, weekendItinerary])

  // Whole-wedding budget by vendor type: core quote lines + extras + weekend.
  const byCategory = useMemo(() => computeBudgetByCategory({
    coreLines: budget?.lines || [],
    extras,
    weekend: weekendSpend.rows,
  }), [budget, extras, weekendSpend])

  const categorySegments = useMemo(() =>
    byCategory.categories.map(c => ({
      key: c.category, label: categoryLabel(c.category), color: categoryColor(c.category), value: c.total,
    })),
  [byCategory])

  const payerSegments = useMemo(() => [
    { key: 'parents', label: 'Parents covering', color: 'var(--gold)', value: byCategory.parents },
    { key: 'couple', label: 'Out of pocket', color: 'var(--teal)', value: byCategory.couple },
  ], [byCategory])

  // Soonest upcoming payment due date across the extras, for the home card.
  const nextExtraDue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return extras
      .filter(e => e.due_date && e.due_date >= today)
      .map(e => ({ name: e.name, due_date: e.due_date }))
      .sort((a, b) => a.due_date.localeCompare(b.due_date))[0] || null
  }, [extras])

  const target = meta?.budget_target || 58000
  const status = budget ? budgetStatus(budget.total, target) : 'gray'
  const over = budget ? Math.max(0, budget.total - target) : 0
  const under = budget ? Math.max(0, target - budget.total) : 0

  const rsvpStats = useMemo(() => {
    const counts = { yes: 0, no: 0, maybe: 0, pending: 0 }
    for (const g of guests) {
      const k = (g.rsvp || 'pending').toLowerCase()
      if (counts[k] != null) counts[k]++
      else counts.pending++
    }
    return counts
  }, [guests])

  const vendorStats = useMemo(() => {
    const totals = { needed: 0, sourcing: 0, contacted: 0, shortlisted: 0, booked: 0, passed: 0 }
    for (const v of vendors) {
      const k = v.status || 'needed'
      if (totals[k] != null) totals[k]++
    }
    return totals
  }, [vendors])

  async function completeMilestone(id) {
    const prev = milestones
    setMilestones(ms => ms.filter(m => m.id !== id))
    const { error: updateError } = await supabase
      .from('timeline_milestones')
      .update({ status: 'done' })
      .eq('id', id)
    if (updateError) {
      setMilestones(prev)
      return
    }
    // Re-fetch regardless of realtime so the next pending item backfills immediately.
    setMilestones(await fetchPendingMilestones())
  }

  const daysOut = daysBetween(TODAY, WEDDING_DATE)
  const venueCap = targets.hardCap
  const overCap = Math.max(0, projectedGuests - venueCap)
  const overTarget = Math.max(0, projectedGuests - targets.target)
  const capStatus = headcountStatus(projectedGuests, targets)

  if (loading) {
    return (
      <div style={{ background: PAGE_BG, minHeight: 'calc(100vh - 56px)', padding: 32 }}>
        <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ background: PAGE_BG, minHeight: 'calc(100vh - 56px)', padding: 32 }}>
        <div style={{ color: 'var(--red)' }}>Error loading dashboard: {error}</div>
      </div>
    )
  }

  return (
    <div style={{ background: PAGE_BG, minHeight: 'calc(100vh - 56px)', padding: '24px 24px 64px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: 'DM Sans', fontSize: 11, letterSpacing: '0.18em',
            color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 4,
          }}>
            La Valencia Hotel · 3.27.27
          </div>
          <h1 style={{ margin: 0, fontSize: 28, color: 'var(--text)' }}>
            Wedding HQ
          </h1>
          <div className="deco-divider" style={{ maxWidth: 260, marginTop: 8 }}>◆</div>
          <div style={{
            color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: 13, marginTop: 6,
          }}>
            {daysOut} days out · Kerwin &amp; Dani
          </div>
        </div>

        {/* ── Top row: Budget + Guest Slider ──────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* Budget headline card */}
          <div className="card-gatsby" style={{ padding: 20 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12,
            }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Projected total
                </div>
                <div style={{ fontFamily: 'Playfair Display', fontSize: 36, color: statusColor(status), marginTop: 4 }}>
                  {formatUsd(budget?.total)}
                </div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Target {formatUsd(target)} ·{' '}
                  {status === 'green' && <span style={{ color: 'var(--green)' }}>under by {formatUsd(under)}</span>}
                  {status === 'yellow' && <span style={{ color: 'var(--yellow)' }}>over by {formatUsd(over)}</span>}
                  {status === 'red' && <span style={{ color: 'var(--red)' }}>over by {formatUsd(over)}</span>}
                </div>
              </div>
              <button
                onClick={() => navigate('/budget')}
                style={{
                  background: 'transparent', border: '1px solid var(--gold-border)',
                  color: 'var(--gold)', borderRadius: 8, padding: '6px 12px',
                  cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, letterSpacing: '0.05em',
                }}
              >
                Drill down →
              </button>
            </div>

            {/* Burn bar */}
            <div style={{ height: 8, background: 'var(--dark3)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, ((budget?.total || 0) / target) * 100)}%`,
                background: statusColor(status),
                transition: 'width 200ms',
              }} />
            </div>

            <div style={{
              marginTop: 14, fontSize: 12, color: 'var(--text-muted)',
              fontFamily: 'DM Sans', display: 'flex', gap: 16, flexWrap: 'wrap',
            }}>
              <span>Subtotal {formatUsd(budget?.subtotal)}</span>
              <span>Marginal {formatUsdPrecise(marginal)}/guest</span>
              <span>Source: La Valencia Winter Special</span>
            </div>
          </div>

          {/* Guest count slider */}
          <div className="card-gatsby" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Guest count
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <div style={{
                fontFamily: 'Playfair Display', fontSize: 36,
                color: CAP_COLORS[capStatus],
              }}>
                {projectedGuests}
              </div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)' }}>
                target {targets.target} · cap {venueCap}
              </div>
            </div>

            {/* Slider track with a solid target marker and a dotted hard-cap
                marker, both positioned from the live goalposts. */}
            <div style={{ position: 'relative', marginTop: 12 }}>
              <input
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                value={projectedGuests}
                onChange={(e) => setProjectedGuests(parseInt(e.target.value, 10))}
                style={{ width: '100%', accentColor: 'var(--gold)', display: 'block' }}
              />
              <div style={{ position: 'relative', height: 14, marginTop: 2 }}>
                <Marker pct={sliderPct(targets.target)} color="var(--green)" label={`${targets.target} target`} />
                <Marker pct={sliderPct(venueCap)} color="var(--red)" label={`${venueCap} cap`} dotted />
              </div>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Sans', marginTop: 12,
            }}>
              <span>{SLIDER_MIN}</span><span>{SLIDER_MAX}</span>
            </div>

            {overCap > 0 ? (
              <div style={{
                marginTop: 12, padding: 8, borderRadius: 6,
                background: 'rgba(224, 112, 112, 0.10)',
                color: 'var(--red)', fontFamily: 'DM Sans', fontSize: 12,
              }}>
                {overCap} over the La Valencia cap of {venueCap} · need to cut or get an exception
              </div>
            ) : overTarget > 0 ? (
              <div style={{
                marginTop: 12, padding: 8, borderRadius: 6,
                background: 'rgba(201, 168, 76, 0.10)',
                color: 'var(--yellow)', fontFamily: 'DM Sans', fontSize: 12,
              }}>
                {overTarget} over the {targets.target} target · {venueCap - projectedGuests === 0
                  ? `at the ${venueCap} cap exactly`
                  : `${venueCap - projectedGuests} left under the ${venueCap} cap`}
              </div>
            ) : (
              <div style={{
                marginTop: 12, padding: 8, borderRadius: 6,
                background: 'rgba(122, 184, 147, 0.10)',
                color: 'var(--green)', fontFamily: 'DM Sans', fontSize: 12,
              }}>
                {targets.target - projectedGuests} under the {targets.target} target
              </div>
            )}
          </div>
        </div>

        {/* ── Extras / second budget (outside the $58k) ──────────────── */}
        <button
          onClick={() => navigate('/budget')}
          className="card-gatsby"
          style={{
            padding: 20, marginBottom: 16, width: '100%', textAlign: 'left',
            cursor: 'pointer', background: 'var(--card)', font: 'inherit', color: 'inherit',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Extras &middot; out-of-pocket
              </div>
              <div style={{ fontFamily: 'Playfair Display', fontSize: 32, color: 'var(--text)', marginTop: 4 }}>
                {formatUsd(extrasSummary.couple)}
              </div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Separate from the {formatUsd(target)} La Valencia budget
              </div>
            </div>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              <MiniStat label="Total extras" value={formatUsd(extrasSummary.total)} />
              <MiniStat label="Parents covering" value={formatUsd(extrasSummary.parents)} />
              <MiniStat
                label="Prices TBD"
                value={extrasSummary.tbdCount ? `${extrasSummary.tbdCount} left` : 'none'}
              />
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'DM Sans' }}>
              Edit expenses, parents&rsquo; share &amp; due dates &rarr;
            </span>
            {nextExtraDue && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                Next payment: {nextExtraDue.name} due {new Date(nextExtraDue.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </button>

        {/* ── Whole-wedding budget by vendor type (core + extras + weekend) ─ */}
        {byCategory.total > 0 && (
          <div className="card-gatsby" style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Whole wedding &middot; by vendor type
              </div>
              <button
                onClick={() => navigate('/weekend')}
                style={{
                  background: 'transparent', border: '1px solid var(--gold-border)',
                  color: 'var(--gold)', borderRadius: 8, padding: '6px 12px',
                  cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, letterSpacing: '0.05em',
                }}
              >
                Weekend hub →
              </button>
            </div>

            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 16 }}>
              <MiniStat label="Projected total" value={formatUsd(byCategory.total)} />
              <MiniStat label="Parents covering" value={formatUsd(byCategory.parents)} />
              <MiniStat label="Out of pocket" value={formatUsd(byCategory.couple)} />
              <MiniStat label="Weekend events" value={formatUsd(weekendSpend.total)} />
            </div>

            <BudgetStackedBar segments={categorySegments} formatValue={formatUsd} />

            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans', margin: '16px 0 6px' }}>
              Who's paying
            </div>
            <BudgetStackedBar segments={payerSegments} formatValue={formatUsd} />
          </div>
        )}

        {/* ── Who's covering it (parent contributions across Extras + Vendors) */}
        {contributions.total > 0 && (
          <div className="card-gatsby" style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Who&rsquo;s covering it
            </div>

            {/* Segmented bar */}
            <div style={{
              display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden',
              background: 'var(--dark3)', marginTop: 12,
            }}>
              {[
                { key: 'dani', color: 'var(--rose)' },
                { key: 'kerwin', color: 'var(--teal)' },
                { key: 'both', color: 'var(--plum)' },
                { key: 'couple', color: 'var(--gold)' },
              ].map(({ key, color }) => {
                const width = (contributions[key] / contributions.total) * 100
                return width > 0 ? (
                  <div key={key} style={{ width: `${width}%`, background: color, transition: 'width 200ms' }} />
                ) : null
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 12 }}>
              <LegendItem color="var(--rose)" label="Dani's parents" value={formatUsd(contributions.dani)} />
              <LegendItem color="var(--teal)" label="Kerwin's parents" value={formatUsd(contributions.kerwin)} />
              {contributions.both > 0 && (
                <LegendItem color="var(--plum)" label="Both sides" value={formatUsd(contributions.both)} />
              )}
              <LegendItem color="var(--gold)" label="Us" value={formatUsd(contributions.couple)} />
            </div>
          </div>
        )}

        {/* ── Bottom row: Vendors + RSVP + Next milestones ────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

          {/* Vendors */}
          <button
            onClick={() => navigate('/vendors')}
            className="card-gatsby"
            style={{
              padding: 18, textAlign: 'left', cursor: 'pointer',
              background: 'var(--card)', font: 'inherit', color: 'inherit',
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Vendors
            </div>
            <div style={{ fontFamily: 'Playfair Display', fontSize: 28, color: 'var(--text)', marginTop: 4 }}>
              {vendorStats.booked}
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}> booked</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
              {vendorStats.needed} needed · {vendorStats.sourcing + vendorStats.contacted + vendorStats.shortlisted} in motion
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--gold)', fontFamily: 'DM Sans' }}>
              Manage →
            </div>
          </button>

          {/* RSVP */}
          <button
            onClick={() => navigate('/guests')}
            className="card-gatsby"
            style={{
              padding: 18, textAlign: 'left', cursor: 'pointer',
              background: 'var(--card)', font: 'inherit', color: 'inherit',
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Guest list
            </div>
            <div style={{ fontFamily: 'Playfair Display', fontSize: 28, color: 'var(--text)', marginTop: 4 }}>
              {guests.filter(g => !g.cut_candidate).reduce((s, g) => s + 1 + (g.plus_one ? 1 : 0), 0)}
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}> towards cap</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
              {rsvpStats.yes} yes · {rsvpStats.no} no · {rsvpStats.maybe} maybe · {rsvpStats.pending} pending
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--gold)', fontFamily: 'DM Sans' }}>
              Manage →
            </div>
          </button>

          {/* Next milestones */}
          <div className="card-gatsby" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Next up
            </div>
            {milestones.length === 0 ? (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-dim)', fontFamily: 'DM Sans' }}>
                Run the 12-month timeline skill to populate milestones.
              </div>
            ) : (
              <ul style={{
                listStyle: 'none', padding: 0, margin: '10px 0 0',
                maxHeight: 220, overflowY: 'auto',
              }}>
                {milestones.map(m => (
                  <li key={m.id} style={{
                    padding: '6px 0', borderBottom: '1px solid var(--border)',
                    fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <button
                        onClick={() => completeMilestone(m.id)}
                        aria-label={`Mark "${m.title}" done`}
                        title="Mark done"
                        className="milestone-check"
                        style={{
                          flexShrink: 0, width: 16, height: 16, borderRadius: 4,
                          border: '1px solid var(--gold-border)', background: 'transparent',
                          cursor: 'pointer', padding: 0, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          color: 'var(--gold)', fontSize: 11, lineHeight: 1,
                        }}
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.title}
                      </span>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>
                      {m.due_date}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function LegendItem({ color, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Playfair Display', fontSize: 20, color: 'var(--text)', marginTop: 2 }}>
        {value}
      </div>
    </div>
  )
}
