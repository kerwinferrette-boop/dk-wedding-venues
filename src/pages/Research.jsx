// Research page — read-only view of everything the vendor researcher has gathered.
// Vendors are grouped by type, with the individual research note kept alongside
// status, price, contact and next step. Reads straight from vendor_pipeline.

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatUsd } from '../lib/budget'

function prettyType(t) {
  return (t || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const STATUS_STYLE = {
  booked:      { bg: 'rgba(93,187,138,0.18)',  fg: '#2f7d55' },
  sourcing:    { bg: 'rgba(201,168,76,0.18)',  fg: '#8a6f1f' },
  contacted:   { bg: 'rgba(42,107,124,0.16)',  fg: '#215663' },
  shortlisted: { bg: 'rgba(42,107,124,0.16)',  fg: '#215663' },
  passed:      { bg: 'rgba(224,112,112,0.16)', fg: '#a34141' },
  needed:      { bg: 'rgba(28,18,8,0.08)',     fg: 'rgba(28,18,8,0.5)' },
}

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.needed
  return (
    <span style={{
      alignSelf: 'flex-start', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 600,
      padding: '3px 10px', borderRadius: 999, textTransform: 'capitalize',
      background: s.bg, color: s.fg,
    }}>
      {status}
    </span>
  )
}

function vendorCost(v) {
  return v.actual_cost || v.estimated_cost || null
}

function isTopPick(v) {
  return /top pick/i.test(v.notes || '')
}

const HEAD = { fontFamily: 'DM Sans', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }
const GRID = '1.4fr 0.8fr 0.7fr 2.2fr'

function VendorRow({ v }) {
  const booked = v.status === 'booked'
  const top = isTopPick(v)
  const accent = booked ? 'var(--green)' : top ? 'var(--gold)' : null
  const cost = vendorCost(v)

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: GRID,
      borderTop: '1px solid var(--border)',
      background: booked ? 'rgba(93,187,138,0.07)' : 'transparent',
    }}>
      {/* Vendor */}
      <div style={{
        padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0,
        boxShadow: accent ? `inset 3px 0 0 ${accent}` : 'none',
      }}>
        {top && (
          <span style={{
            alignSelf: 'flex-start', fontFamily: 'DM Sans', fontSize: 9.5, fontWeight: 700,
            letterSpacing: '0.08em', color: '#8a6f1f', background: 'var(--gold-light)',
            borderRadius: 4, padding: '2px 6px',
          }}>★ TOP PICK</span>
        )}
        <span style={{ fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14, lineHeight: 1.25, color: 'var(--text)' }}>
          {v.vendor_name || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Unnamed</span>}
        </span>
        {(v.contact_name || v.contact_email) && (
          <span style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: 'var(--text-dim)' }}>
            {[v.contact_name, v.contact_email].filter(Boolean).join(' · ')}
          </span>
        )}
        {(v.website_url || v.instagram_url) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
            {v.website_url && (
              <a href={v.website_url} target="_blank" rel="noopener noreferrer" style={linkChip}>Website</a>
            )}
            {v.instagram_url && (
              <a href={v.instagram_url.startsWith('http') ? v.instagram_url : `https://instagram.com/${v.instagram_url.replace('@', '')}`}
                 target="_blank" rel="noopener noreferrer" style={linkChip}>Instagram</a>
            )}
          </div>
        )}
      </div>

      {/* Status */}
      <div style={{ padding: '14px 16px', borderLeft: '1px solid var(--border)' }}>
        <StatusPill status={v.status} />
      </div>

      {/* Cost */}
      <div style={{ padding: '14px 16px', borderLeft: '1px solid var(--border)' }}>
        {cost ? (
          <span style={{ fontFamily: 'DM Sans', fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: v.actual_cost ? 'var(--text)' : 'var(--text-muted)' }}>
            {v.actual_cost && (
              <span style={{ display: 'block', fontSize: 10, fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actual</span>
            )}
            {formatUsd(cost)}
          </span>
        ) : (
          <span style={{ color: 'var(--text-dim)' }}>—</span>
        )}
      </div>

      {/* Research notes */}
      <div style={{ padding: '14px 16px', borderLeft: '1px solid var(--border)', minWidth: 0 }}>
        {v.notes ? (
          <div style={{ fontFamily: 'DM Sans', fontSize: 12.5, lineHeight: 1.55, color: 'rgba(28,18,8,0.72)' }}>{v.notes}</div>
        ) : (
          <div style={{ fontFamily: 'DM Sans', fontSize: 12.5, color: 'var(--text-dim)', fontStyle: 'italic' }}>No research notes yet.</div>
        )}
        {v.next_action && (
          <div style={{ marginTop: 8, fontFamily: 'DM Sans', fontSize: 11.5, color: 'var(--teal)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <b style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 9.5, paddingTop: 1, whiteSpace: 'nowrap' }}>Next</b>
            <span>{v.next_action}{v.next_action_date ? ` · ${v.next_action_date}` : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}

const linkChip = {
  fontFamily: 'DM Sans', fontSize: 11, color: 'var(--teal)', textDecoration: 'none',
  border: '1px solid rgba(42,107,124,0.3)', borderRadius: 999, padding: '2px 8px',
}

function Group({ type, vendors }) {
  const bookedCount = vendors.filter(v => v.status === 'booked').length
  const costs = vendors.map(vendorCost).filter(Boolean)
  const range = costs.length
    ? (Math.min(...costs) === Math.max(...costs)
        ? formatUsd(costs[0])
        : `${formatUsd(Math.min(...costs))}–${formatUsd(Math.max(...costs))}`)
    : null

  const meta = [
    `${vendors.length} sourced`,
    bookedCount ? `${bookedCount} booked` : 'none booked',
    range,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '0 2px 12px' }}>
        <span style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>
          {prettyType(type)}
        </span>
        <span style={{ fontFamily: 'DM Sans', fontSize: 12.5, color: 'var(--text-muted)' }}>{meta}</span>
        <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--gold-border), transparent)' }} />
      </div>

      <div style={{
        background: 'var(--card)', border: '1px solid var(--gold-border)', borderRadius: 16,
        overflow: 'hidden', boxShadow: '0 8px 30px rgba(28,18,8,0.05)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID, background: 'rgba(201,168,76,0.08)' }}>
          <div style={{ ...HEAD, padding: '12px 16px' }}>Vendor</div>
          <div style={{ ...HEAD, padding: '12px 16px' }}>Status</div>
          <div style={{ ...HEAD, padding: '12px 16px' }}>Cost</div>
          <div style={{ ...HEAD, padding: '12px 16px' }}>Research notes</div>
        </div>
        {vendors.map(v => <VendorRow key={v.id} v={v} />)}
      </div>
    </div>
  )
}

// Booked first, then TOP PICK, then by cost desc within a type.
function sortVendors(list) {
  const rank = v => (v.status === 'booked' ? 0 : isTopPick(v) ? 1 : 2)
  return [...list].sort((a, b) => rank(a) - rank(b) || (vendorCost(b) || 0) - (vendorCost(a) || 0))
}

export default function Research() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // 'all' | vendor_type | 'booked'

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('vendor_pipeline').select('*').order('vendor_type')
      if (cancelled) return
      setVendors(data || [])
      setLoading(false)
    }
    load()

    const ch = supabase
      .channel('research-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_pipeline' },
        async () => {
          const { data } = await supabase.from('vendor_pipeline').select('*').order('vendor_type')
          if (!cancelled) setVendors(data || [])
        })
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(ch) }
  }, [])

  const types = useMemo(() => {
    const seen = new Map()
    for (const v of vendors) seen.set(v.vendor_type, (seen.get(v.vendor_type) || 0) + 1)
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }, [vendors])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vendors.filter(v => {
      if (typeFilter === 'booked' && v.status !== 'booked') return false
      if (typeFilter !== 'all' && typeFilter !== 'booked' && v.vendor_type !== typeFilter) return false
      if (!q) return true
      return [v.vendor_name, v.vendor_type, v.notes, v.next_action, v.contact_name, v.contact_email]
        .filter(Boolean).some(s => String(s).toLowerCase().includes(q))
    })
  }, [vendors, search, typeFilter])

  const groups = useMemo(() => {
    const g = {}
    for (const v of filtered) (g[v.vendor_type] ||= []).push(v)
    // Preserve type ordering by group size, then render sorted rows within each.
    return types
      .filter(t => g[t]?.length)
      .map(t => [t, sortVendors(g[t])])
  }, [filtered, types])

  return (
    <div style={{ background: 'var(--dark)', minHeight: 'calc(100vh - 56px)', padding: '24px 24px 64px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--gold)', textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: 4 }}>
            Vendor research
          </div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Research</h1>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)', marginTop: 6, maxWidth: 720 }}>
            Everything the researcher has gathered, grouped by vendor type — the individual research note kept alongside status, price and next step.
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '0 0 26px', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search vendors, notes, cities…"
            style={{
              flex: 1, minWidth: 220, background: 'var(--card)', border: '1px solid var(--gold-border)',
              borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none',
            }}
          />
          {[['all', 'All types'], ...types.map(t => [t, prettyType(t)]), ['booked', 'Booked only']].map(([k, label]) => {
            const on = typeFilter === k
            return (
              <button
                key={k}
                onClick={() => setTypeFilter(k)}
                style={{
                  background: on ? 'var(--gold)' : 'var(--card)',
                  border: `1px solid ${on ? 'var(--gold)' : 'var(--gold-border)'}`,
                  borderRadius: 999, padding: '7px 14px', fontFamily: 'DM Sans', fontSize: 12.5,
                  color: on ? '#1C1208' : 'var(--text-muted)', fontWeight: on ? 600 : 400,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>Loading research…</div>
        ) : groups.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'DM Sans', fontSize: 13 }}>
            No vendors match this search.
          </div>
        ) : (
          groups.map(([type, list]) => <Group key={type} type={type} vendors={list} />)
        )}
      </div>
    </div>
  )
}
