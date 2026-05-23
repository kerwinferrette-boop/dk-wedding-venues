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
  const [guestCount, setGuestCount] = useState(170)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [q, m, v] = await Promise.all([
          fetchQuote(),
          fetchProjectMetadata(),
          supabase.from('vendor_pipeline').select('*'),
        ])
        if (cancelled) return
        setQuote(q)
        setMeta(m)
        setVendors(v.data || [])
        setGuestCount(m?.budget_breakdown?.current_guest_list_count ?? m?.target_headcount ?? 170)
      } catch (e) {
        if (!cancelled) setError(e.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const budget = useMemo(() => {
    if (!quote.length) return null
    return computeBudget(quote, guestCount, { vendorCount: 6 })
  }, [quote, guestCount])

  const marginal = useMemo(() => {
    if (!quote.length) return 0
    return computeMarginalCostPerGuest(quote, guestCount, { vendorCount: 6 })
  }, [quote, guestCount])

  const vendorTotal = useMemo(() => {
    // Only count non-La-Valencia vendors so we don't double-count catering/bar.
    return vendors
      .filter(v => !['catering', 'bar'].includes(v.vendor_type))
      .reduce((s, v) => s + (v.actual_cost || v.estimated_cost || 0), 0)
  }, [vendors])

  const target = meta?.budget_target || 58000
  const venueTotal = budget?.total || 0
  const grandTotal = venueTotal + vendorTotal
  const status = budgetStatus(grandTotal, target)
  const venueCap = meta?.budget_breakdown?.venue_cap ?? 170
  const overCap = Math.max(0, guestCount - venueCap)

  // Compare current vs 170 and vs 200 for the cutdown impact view.
  const at170 = useMemo(() => quote.length ? computeBudget(quote, 170, { vendorCount: 6 }).total : 0, [quote])
  const at200 = useMemo(() => quote.length ? computeBudget(quote, 200, { vendorCount: 6 }).total : 0, [quote])

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
          <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Vendor commitments (excluding catering &amp; bar)
          </div>
          {vendors.filter(v => !['catering', 'bar'].includes(v.vendor_type)).length === 0 ? (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-dim)', fontFamily: 'DM Sans' }}>
              No vendor cost data yet. Add estimates on the Vendors page.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans', fontSize: 13, marginTop: 10 }}>
              <tbody>
                {vendors
                  .filter(v => !['catering', 'bar'].includes(v.vendor_type))
                  .map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 0' }}>
                        {v.vendor_type.replace(/_/g, ' ')}
                        {v.vendor_name && (
                          <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>· {v.vendor_name}</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 0', textAlign: 'right', color: v.actual_cost ? 'var(--text)' : 'var(--text-muted)' }}>
                        {formatUsd(v.actual_cost || v.estimated_cost)}
                        {!v.actual_cost && v.estimated_cost ? (
                          <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 4 }}>est</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                <tr>
                  <td style={{ padding: '10px 0', fontWeight: 700 }}>Vendor subtotal</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 700 }}>
                    {formatUsd(vendorTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
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
