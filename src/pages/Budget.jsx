// Budget drill-down.
//
// Shows the La Valencia quote line by line, lets you slide the guest count,
// and lays the vendor pipeline costs on top so you see total commitment, not
// just venue. All math goes through src/lib/budget.js to stay consistent
// with the Dashboard.

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchQuote,
  fetchProjectMetadata,
  computeBudget,
  computeMarginalCostPerGuest,
  computeVendorCommitments,
  fetchExtras,
  computeExtras,
  budgetStatus,
  formatUsd,
  formatUsdPrecise,
} from '../lib/budget'

function statusColor(s) {
  if (s === 'green') return 'var(--green)'
  if (s === 'yellow') return 'var(--yellow)'
  if (s === 'red') return 'var(--red)'
  return 'var(--text-muted)'
}

function pct(n) {
  return `${(n * 100).toFixed(2)}%`
}

function lineLabel(line) {
  if (line.applies_to_subtotal && line.rate != null) {
    return `${line.name} (${pct(line.rate)})`
  }
  if (line.scales_with === 'guest_count' && line.per_person_amount != null) {
    return `${line.name} (${formatUsdPrecise(line.per_person_amount)} / guest)`
  }
  if (line.scales_with === 'vendor_count' && line.per_person_amount != null) {
    return `${line.name} (${formatUsdPrecise(line.per_person_amount)} / vendor)`
  }
  return line.name
}

export default function Budget() {
  const [quote, setQuote] = useState([])
  const [meta, setMeta] = useState(null)
  const [vendors, setVendors] = useState([])
  const [guests, setGuests] = useState([])
  const [extras, setExtras] = useState([])
  const [guestCount, setGuestCount] = useState(170)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [q, m, v, g, x] = await Promise.all([
          fetchQuote(),
          fetchProjectMetadata(),
          supabase.from('vendor_pipeline').select('*'),
          supabase.from('guests').select('id, plus_one, cut_candidate'),
          fetchExtras(),
        ])
        if (cancelled) return
        setQuote(q)
        setMeta(m)
        setVendors(v.data || [])
        setGuests(g.data || [])
        setExtras(x)
      } catch (e) {
        if (!cancelled) setError(e.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    const ch = supabase
      .channel('budget-guests-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' },
        async () => {
          const { data } = await supabase.from('guests').select('id, plus_one, cut_candidate')
          if (!cancelled) setGuests(data || [])
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'extras_budget' },
        async () => {
          const data = await fetchExtras()
          if (!cancelled) setExtras(data)
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_pipeline' },
        async () => {
          const { data } = await supabase.from('vendor_pipeline').select('*')
          if (!cancelled) setVendors(data || [])
        })
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(ch) }
  }, [])

  const towardCap = useMemo(() =>
    guests.filter(g => !g.cut_candidate).reduce((s, g) => s + 1 + (g.plus_one ? 1 : 0), 0),
  [guests])

  useEffect(() => {
    if (towardCap > 0) setGuestCount(towardCap)
  }, [towardCap])

  const budget = useMemo(() => {
    if (!quote.length) return null
    return computeBudget(quote, guestCount, { vendorCount: 6 })
  }, [quote, guestCount])

  const marginal = useMemo(() => {
    if (!quote.length) return 0
    return computeMarginalCostPerGuest(quote, guestCount, { vendorCount: 6 })
  }, [quote, guestCount])

  const vendorCommitments = useMemo(() =>
    // Group by vendor_type so multiple quotes for the same category collapse to
    // one representative cost (booked vendor if any, else highest estimate).
    // Exclude catering/bar since those are already in the La Valencia quote.
    computeVendorCommitments(vendors, { exclude: ['catering', 'bar'] }),
  [vendors])
  const vendorTotal = vendorCommitments.total

  const extrasSummary = useMemo(() => computeExtras(extras), [extras])

  const target = meta?.budget_target || 58000
  const venueTotal = budget?.total || 0
  const grandTotal = venueTotal + vendorTotal
  const status = budgetStatus(grandTotal, target)
  const venueCap = meta?.budget_breakdown?.venue_cap ?? 170
  const overCap = Math.max(0, guestCount - venueCap)

  // Compare current vs 170 and vs 200 for the cutdown impact view.
  const at170 = useMemo(() => quote.length ? computeBudget(quote, 170, { vendorCount: 6 }).total : 0, [quote])
  const at200 = useMemo(() => quote.length ? computeBudget(quote, 200, { vendorCount: 6 }).total : 0, [quote])

  // --- Extras editing (writes straight to Supabase extras_budget) -----------
  // Two helpers so typing doesn't thrash the database: setLocalExtra updates
  // only React state on each keystroke; saveExtra persists (on blur, or
  // immediately for checkboxes / date pickers). The realtime subscription above
  // keeps both partners' views in sync after a save lands.
  function setLocalExtra(id, patch) {
    setExtras(prev => prev.map(x => (x.id === id ? { ...x, ...patch } : x)))
  }
  async function saveExtra(id, patch) {
    setExtras(prev => prev.map(x => (x.id === id ? { ...x, ...patch } : x)))
    const { error: e } = await supabase.from('extras_budget').update(patch).eq('id', id)
    if (e) setError(`Save failed: ${e.message}`)
  }
  async function addExtra() {
    const nextOrder = extras.length ? Math.max(...extras.map(e => e.display_order || 0)) + 1 : 0
    const row = {
      slug: `extra-${Date.now()}`,
      name: 'New expense',
      role: null,
      budget_group: 'Other',
      total_cost: 0,
      parents_amount: 0,
      parents_covering: false,
      tbd: false,
      display_order: nextOrder,
    }
    const { data, error: e } = await supabase.from('extras_budget').insert(row).select().single()
    if (e) setError(`Add failed: ${e.message}`)
    else if (data) setExtras(x => [...x, data])
  }
  async function removeExtra(id) {
    if (!window.confirm('Remove this expense from the extras budget?')) return
    const prev = extras
    setExtras(x => x.filter(e => e.id !== id))
    const { error: e } = await supabase.from('extras_budget').delete().eq('id', id)
    if (e) { setError(`Delete failed: ${e.message}`); setExtras(prev) }
  }

  const extraInput = {
    width: '100%', background: 'var(--dark2)', border: '1px solid var(--border)',
    color: 'var(--text)', borderRadius: 6, padding: '6px 8px', fontFamily: 'DM Sans',
    fontSize: 13, boxSizing: 'border-box',
  }

  // --- Vendor parent-contribution editing (writes to vendor_pipeline) -------
  // Same pattern as extras: setLocalVendor updates state per keystroke,
  // saveVendor persists. Rows shown are the "chosen" vendor per type from
  // computeVendorCommitments, so `id` is that specific vendor_pipeline row.
  function setLocalVendor(id, patch) {
    setVendors(prev => prev.map(v => (v.id === id ? { ...v, ...patch } : v)))
  }
  async function saveVendor(id, patch) {
    setLocalVendor(id, patch)
    const { error: e } = await supabase.from('vendor_pipeline').update(patch).eq('id', id)
    if (e) setError(`Save failed: ${e.message}`)
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--dark)', minHeight: 'calc(100vh - 56px)', padding: 32 }}>
        <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>Loading budget...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ background: 'var(--dark)', minHeight: 'calc(100vh - 56px)', padding: 32 }}>
        <div style={{ color: 'var(--red)' }}>{error}</div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--dark)', minHeight: 'calc(100vh - 56px)', padding: '24px 24px 64px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11, letterSpacing: '0.18em', color: 'var(--gold)',
            textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: 4,
          }}>
            La Valencia · Saturday Select · Winter Special
          </div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Budget</h1>
          <div className="deco-divider" style={{ maxWidth: 220, marginTop: 6 }}>◆</div>
        </div>

        {/* Headline + slider */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="card-gatsby" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Venue total
            </div>
            <div style={{ fontFamily: 'Playfair Display', fontSize: 32, color: 'var(--text)', marginTop: 4 }}>
              {formatUsd(venueTotal)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Sans', marginTop: 4 }}>
              + {formatUsd(vendorTotal)} vendor costs ={' '}
              <span style={{ color: statusColor(status), fontWeight: 600 }}>
                {formatUsd(grandTotal)} grand total
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Sans', marginTop: 6 }}>
              Target {formatUsd(target)} · marginal {formatUsdPrecise(marginal)} per added guest
            </div>
          </div>

          <div className="card-gatsby" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Guest count
            </div>
            <div style={{ fontFamily: 'Playfair Display', fontSize: 32, color: 'var(--text)', marginTop: 4 }}>
              {guestCount} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>of {venueCap} cap</span>
            </div>
            <input
              type="range"
              min={100}
              max={210}
              value={guestCount}
              onChange={(e) => setGuestCount(parseInt(e.target.value, 10))}
              style={{ width: '100%', marginTop: 10, accentColor: 'var(--gold)' }}
            />
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Sans',
            }}>
              <span>100</span><span>170 cap</span><span>210</span>
            </div>
            {overCap > 0 && (
              <div style={{
                marginTop: 10, padding: 8, borderRadius: 6,
                background: 'rgba(224, 112, 112, 0.10)',
                color: 'var(--red)', fontFamily: 'DM Sans', fontSize: 12,
              }}>
                {overCap} over venue cap
              </div>
            )}
          </div>
        </div>

        {/* 200 vs 170 cutdown impact */}
        <div className="card-gatsby" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Cutdown impact
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 10,
          }}>
            <Stat label="At 200 (today)" value={formatUsd(at200)} color="var(--red)" />
            <Stat label="At 170 (cap)" value={formatUsd(at170)} color="var(--green)" />
            <Stat label="Savings" value={formatUsd(at200 - at170)} color="var(--gold)" sub="30 guests removed" />
          </div>
        </div>

        {/* Line items */}
        <div className="card-gatsby" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--dark2)', borderBottom: '1px solid var(--gold-border)' }}>
                <Th>Line item</Th>
                <Th right>Amount</Th>
                <Th right>Running</Th>
              </tr>
            </thead>
            <tbody>
              {budget && budget.lines.map(line => (
                <tr key={line.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div>{lineLabel(line)}</div>
                    {line.notes && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {line.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    {formatUsdPrecise(line.amount)}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)' }}>
                    {formatUsdPrecise(line.runningTotal)}
                  </td>
                </tr>
              ))}
              <tr style={{ background: 'var(--dark2)' }}>
                <td style={{ padding: '12px 14px', fontWeight: 700 }}>Venue total</td>
                <td />
                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                  {formatUsdPrecise(budget?.total || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Vendor costs add-on */}
        <div className="card-gatsby" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Vendor commitments (excluding catering &amp; bar)
            </div>
            {vendorCommitments.parents > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Sans' }}>
                Out-of-pocket <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{formatUsd(vendorCommitments.couple)}</span>
                {' '}&middot; parents {formatUsd(vendorCommitments.parents)}
              </div>
            )}
          </div>

          {vendorCommitments.rows.length === 0 ? (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-dim)', fontFamily: 'DM Sans' }}>
              No vendor cost data yet. Add estimates on the Vendors page.
            </div>
          ) : (
            <>
              {/* Column headers (hidden on narrow screens where rows stack) */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1.5fr 100px 170px 130px 96px',
                gap: 10, marginTop: 12, paddingBottom: 6, borderBottom: '1px solid var(--gold-border)',
              }}>
                <ExtraHead>Vendor</ExtraHead>
                <ExtraHead right>Cost</ExtraHead>
                <ExtraHead>Parent contribution</ExtraHead>
                <ExtraHead>Side</ExtraHead>
                <ExtraHead right>Out&#8209;of&#8209;pocket</ExtraHead>
              </div>

              {vendorCommitments.rows.map(r => (
                <div key={r.vendor_type} style={{
                  display: 'grid', gridTemplateColumns: '1.5fr 100px 170px 130px 96px',
                  gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)',
                }}>
                  {/* Name */}
                  <div>
                    {r.vendor_type.replace(/_/g, ' ')}
                    {r.vendor_name && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>· {r.vendor_name}</span>
                    )}
                    {r.optionCount > 1 && (
                      <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 6 }}>
                        top of {r.optionCount} options
                      </span>
                    )}
                  </div>

                  {/* Cost */}
                  <div style={{ textAlign: 'right', color: r.isBooked ? 'var(--text)' : 'var(--text-muted)' }}>
                    {formatUsd(r.cost)}
                    {!r.isBooked ? (
                      <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 4 }}>est</span>
                    ) : null}
                  </div>

                  {/* Parent contribution: toggle + amount */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!r.parent_contribution}
                      onChange={e => saveVendor(r.id, { parent_contribution: e.target.checked })}
                      style={{ accentColor: 'var(--gold)' }}
                      title="A parent is contributing to this vendor"
                    />
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: 8, top: 6, fontSize: 12, color: 'var(--text-dim)' }}>$</span>
                      <input
                        type="number"
                        min="0"
                        disabled={!r.parent_contribution}
                        style={{ ...extraInput, paddingLeft: 18, textAlign: 'right', opacity: r.parent_contribution ? 1 : 0.4 }}
                        value={r.parent_contribution_amount ?? ''}
                        placeholder="0"
                        onChange={e => setLocalVendor(r.id, { parent_contribution_amount: e.target.value })}
                        onBlur={e => saveVendor(r.id, { parent_contribution_amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Which side */}
                  <div>
                    <select
                      value={r.parent_contribution_side || ''}
                      disabled={!r.parent_contribution}
                      style={{ ...extraInput, opacity: r.parent_contribution ? 1 : 0.4 }}
                      onChange={e => saveVendor(r.id, { parent_contribution_side: e.target.value || null })}
                    >
                      <option value="">Side&hellip;</option>
                      <option value="dani">Dani&rsquo;s parents</option>
                      <option value="kerwin">Kerwin&rsquo;s parents</option>
                      <option value="both">Both</option>
                    </select>
                  </div>

                  {/* Out-of-pocket (computed) */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>{formatUsd(r.couple)}</span>
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text)' }}>
                  Vendor subtotal <span style={{ fontWeight: 700 }}>{formatUsd(vendorTotal)}</span>
                </div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text)' }}>
                  Vendor out-of-pocket{' '}
                  <span style={{ fontWeight: 700, color: 'var(--gold)', marginLeft: 4 }}>{formatUsd(vendorCommitments.couple)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Extras / second budget - outside the $58k. Editable: totals, parents
            contribution, and a payment due date that the scheduled task turns
            into a calendar reminder + 7-day heads-up. */}
        <div className="card-gatsby" style={{ padding: 18, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Extras &middot; outside the {formatUsd(target)} budget
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Sans' }}>
              Out-of-pocket <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{formatUsd(extrasSummary.couple)}</span>
              {' '}&middot; total {formatUsd(extrasSummary.total)}
              {extrasSummary.parents > 0 && <> &middot; parents {formatUsd(extrasSummary.parents)}</>}
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Sans', marginTop: 6 }}>
            Your own spend, separate from the venue budget. Check &ldquo;Parents&rdquo; to log their contribution; set a due date and it lands on the calendar with a one-week reminder.
          </div>

          {/* Column headers (hidden on narrow screens where rows stack) */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.4fr 100px 190px 150px 96px 26px',
            gap: 10, marginTop: 12, paddingBottom: 6, borderBottom: '1px solid var(--gold-border)',
          }}>
            <ExtraHead>Expense</ExtraHead>
            <ExtraHead right>Total</ExtraHead>
            <ExtraHead>Parents cover</ExtraHead>
            <ExtraHead>Payment due</ExtraHead>
            <ExtraHead right>Out&#8209;of&#8209;pocket</ExtraHead>
            <ExtraHead />
          </div>

          {extras.map(r => {
            const rowTotal = Number(r.total_cost) || 0
            const rowParents = r.parents_covering ? (Number(r.parents_amount) || 0) : 0
            const rowCouple = Math.max(0, rowTotal - rowParents)
            return (
              <div key={r.id} style={{
                display: 'grid', gridTemplateColumns: '1.4fr 100px 190px 150px 96px 26px',
                gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)',
              }}>
                {/* Name + role */}
                <div>
                  <input
                    style={extraInput}
                    value={r.name || ''}
                    onChange={e => setLocalExtra(r.id, { name: e.target.value })}
                    onBlur={e => saveExtra(r.id, { name: e.target.value })}
                  />
                  <input
                    style={{ ...extraInput, marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}
                    placeholder="role / note (optional)"
                    value={r.role || ''}
                    onChange={e => setLocalExtra(r.id, { role: e.target.value })}
                    onBlur={e => saveExtra(r.id, { role: e.target.value || null })}
                  />
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Sans' }}>
                    <input
                      type="checkbox"
                      checked={!!r.tbd}
                      onChange={e => saveExtra(r.id, { tbd: e.target.checked })}
                      style={{ accentColor: 'var(--gold)' }}
                    />
                    Price TBD
                  </label>
                </div>

                {/* Total */}
                <div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 8, top: 6, fontSize: 12, color: 'var(--text-dim)' }}>$</span>
                    <input
                      type="number"
                      min="0"
                      disabled={!!r.tbd}
                      style={{ ...extraInput, paddingLeft: 18, textAlign: 'right', opacity: r.tbd ? 0.4 : 1 }}
                      value={r.tbd ? '' : (r.total_cost ?? '')}
                      placeholder={r.tbd ? 'TBD' : '0'}
                      onChange={e => setLocalExtra(r.id, { total_cost: e.target.value })}
                      onBlur={e => saveExtra(r.id, { total_cost: e.target.value === '' ? 0 : Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Parents cover: toggle + amount + side */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!r.parents_covering}
                      onChange={e => saveExtra(r.id, { parents_covering: e.target.checked })}
                      style={{ accentColor: 'var(--gold)' }}
                      title="Parents are covering part of this"
                    />
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: 8, top: 6, fontSize: 12, color: 'var(--text-dim)' }}>$</span>
                      <input
                        type="number"
                        min="0"
                        disabled={!r.parents_covering}
                        style={{ ...extraInput, paddingLeft: 18, textAlign: 'right', opacity: r.parents_covering ? 1 : 0.4 }}
                        value={r.parents_amount ?? ''}
                        placeholder="0"
                        onChange={e => setLocalExtra(r.id, { parents_amount: e.target.value })}
                        onBlur={e => saveExtra(r.id, { parents_amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <select
                    value={r.parents_side || ''}
                    disabled={!r.parents_covering}
                    style={{ ...extraInput, marginTop: 4, opacity: r.parents_covering ? 1 : 0.4 }}
                    onChange={e => saveExtra(r.id, { parents_side: e.target.value || null })}
                  >
                    <option value="">Side&hellip;</option>
                    <option value="dani">Dani&rsquo;s parents</option>
                    <option value="kerwin">Kerwin&rsquo;s parents</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                {/* Payment due date */}
                <div>
                  <input
                    type="date"
                    style={extraInput}
                    value={r.due_date || ''}
                    onChange={e => saveExtra(r.id, { due_date: e.target.value || null })}
                  />
                </div>

                {/* Out-of-pocket (computed) */}
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {r.tbd ? (
                    <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: 12 }}>TBD</span>
                  ) : (
                    <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>{formatUsd(rowCouple)}</span>
                  )}
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeExtra(r.id)}
                  title="Remove expense"
                  style={{
                    background: 'transparent', border: 'none', color: 'var(--text-dim)',
                    cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2,
                  }}
                >
                  &times;
                </button>
              </div>
            )
          })}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
            <button
              onClick={addExtra}
              style={{
                background: 'transparent', border: '1px dashed var(--gold-border)', color: 'var(--gold)',
                borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12,
              }}
            >
              + Add expense
            </button>
            <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text)' }}>
              Extras out-of-pocket{' '}
              <span style={{ fontWeight: 700, color: 'var(--gold)', marginLeft: 4 }}>{formatUsd(extrasSummary.couple)}</span>
              {extrasSummary.tbdCount > 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 6 }}>
                  {extrasSummary.tbdCount} still TBD
                </span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function Stat({ label, value, color, sub }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Playfair Display', fontSize: 22, color: color || 'var(--text)', marginTop: 2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Sans', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function ExtraHead({ children, right = false }) {
  return (
    <div style={{
      fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
      color: 'var(--text-muted)', textTransform: 'uppercase',
      textAlign: right ? 'right' : 'left',
    }}>
      {children}
    </div>
  )
}

function Th({ children, right = false }) {
  return (
    <th style={{
      textAlign: right ? 'right' : 'left',
      padding: '10px 14px',
      fontFamily: 'DM Sans',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.12em',
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
    }}>
      {children}
    </th>
  )
}
