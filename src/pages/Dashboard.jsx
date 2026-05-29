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
  budgetStatus,
  formatUsd,
  formatUsdPrecise,
} from '../lib/budget'

const PAGE_BG = 'var(--dark)'
const TODAY = new Date('2026-05-21')
const WEDDING_DATE = new Date('2027-03-27')

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Guest count slider state - initialized to current_guest_list_count once meta loads.
  const [projectedGuests, setProjectedGuests] = useState(170)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [q, m, v, t, g] = await Promise.all([
          fetchQuote(),
          fetchProjectMetadata(),
          supabase.from('vendor_pipeline').select('*').order('priority', { ascending: true }),
          supabase
            .from('timeline_milestones')
            .select('*')
            .eq('status', 'pending')
            .order('due_date', { ascending: true })
            .limit(5),
          supabase.from('guests').select('id, rsvp, plus_one, cut_candidate'),
        ])
        if (cancelled) return
        setQuote(q)
        setMeta(m)
        setVendors(v.data || [])
        setMilestones(t.data || [])
        setGuests(g.data || [])
        const towardCap = (g.data || [])
          .filter(guest => !guest.cut_candidate)
          .reduce((sum, guest) => sum + 1 + (guest.plus_one ? 1 : 0), 0)
        setProjectedGuests(towardCap || (m?.budget_breakdown?.current_guest_list_count ?? 170))
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
        async () => {
          const { data } = await supabase.from('timeline_milestones').select('*')
            .eq('status', 'pending').order('due_date').limit(5)
          setMilestones(data || [])
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' },
        async () => {
          const { data } = await supabase.from('guests').select('id, rsvp')
          setGuests(data || [])
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const budget = useMemo(() => {
    if (!quote.length) return null
    return computeBudget(quote, projectedGuests, { vendorCount: 6 })
  }, [quote, projectedGuests])

  const marginal = useMemo(() => {
    if (!quote.length) return 0
    return computeMarginalCostPerGuest(quote, projectedGuests, { vendorCount: 6 })
  }, [quote, projectedGuests])

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

  const daysOut = daysBetween(TODAY, WEDDING_DATE)
  const venueCap = meta?.budget_breakdown?.venue_cap ?? 170
  const overCap = Math.max(0, projectedGuests - venueCap)

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
              <div style={{ fontFamily: 'Playfair Display', fontSize: 36, color: 'var(--text)' }}>
                {projectedGuests}
              </div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)' }}>
                of {venueCap} cap
              </div>
            </div>

            <input
              type="range"
              min={100}
              max={210}
              value={projectedGuests}
              onChange={(e) => setProjectedGuests(parseInt(e.target.value, 10))}
              style={{ width: '100%', marginTop: 12, accentColor: 'var(--gold)' }}
            />
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Sans',
            }}>
              <span>100</span><span>170 cap</span><span>210</span>
            </div>

            {overCap > 0 && (
              <div style={{
                marginTop: 12, padding: 8, borderRadius: 6,
                background: 'rgba(224, 112, 112, 0.10)',
                color: 'var(--red)', fontFamily: 'DM Sans', fontSize: 12,
              }}>
                {overCap} over La Valencia cap · need to cut or get exception
              </div>
            )}
          </div>
        </div>

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
              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
                {milestones.map(m => (
                  <li key={m.id} style={{
                    padding: '6px 0', borderBottom: '1px solid var(--border)',
                    fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text)',
                    display: 'flex', justifyContent: 'space-between', gap: 8,
                  }}>
                    <span>{m.title}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
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
