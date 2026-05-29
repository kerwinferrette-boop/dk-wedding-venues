// Vendor pipeline tracker.
//
// Booked vendors (5): photographer, videographer, day-of coordinator,
// catering (La Valencia), bar (La Valencia).
// Open: florist, DJ, live musician, +maybe photographer_2, content_creator, cake.
//
// Pulls from / writes to Supabase `vendor_pipeline`. The vendor inbox tracker
// and the vendor researcher skills both read & write this same table.

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatUsd } from '../lib/budget'

const STATUSES = ['needed', 'sourcing', 'contacted', 'shortlisted', 'booked', 'passed']
const PRIORITIES = ['must_have', 'nice_to_have']

const STATUS_COLOR = {
  needed:      'var(--text-muted)',
  sourcing:    'var(--teal)',
  contacted:   'var(--gold)',
  shortlisted: 'var(--gold)',
  booked:      'var(--green)',
  passed:      'var(--red)',
}

const STATUS_LABEL = {
  needed:      'Needed',
  sourcing:    'Sourcing',
  contacted:   'Contacted',
  shortlisted: 'Shortlisted',
  booked:      'Booked',
  passed:      'Passed',
}

function prettyType(t) {
  return (t || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  catch { return d }
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{
        fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)',
        textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: 2,
      }}>
        {label}
      </div>
      <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text)' }}>
        {children || <span style={{ color: 'var(--text-dim)' }}>—</span>}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || 'var(--text-muted)'
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 999,
      fontSize: 10,
      letterSpacing: '0.10em',
      textTransform: 'uppercase',
      background: `${color}1F`,
      color,
      border: `1px solid ${color}66`,
      fontFamily: 'DM Sans',
      fontWeight: 600,
    }}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

function CompareModal({ vendors, onClose, onChoose }) {
  const prices = vendors.map(v => v.actual_cost || v.estimated_cost).filter(Boolean)
  const minPrice = prices.length ? Math.min(...prices) : null

  const dim = { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Sans' }
  const cellBase = {
    padding: '10px 14px', borderBottom: '1px solid var(--border)',
    fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text)', verticalAlign: 'top',
  }
  const labelCell = { ...cellBase, color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', width: 110 }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)', borderRadius: 12,
          border: '1px solid var(--gold-border)',
          maxWidth: Math.min(vendors.length * 280 + 140, 1100),
          width: '100%', maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--gold)', textTransform: 'uppercase', fontFamily: 'DM Sans' }}>
              Comparing
            </div>
            <div style={{ fontFamily: 'Playfair Display', fontSize: 20, color: 'var(--text)', marginTop: 2 }}>
              {prettyType(vendors[0]?.vendor_type)} · {vendors.length} options
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid var(--gold-border)',
              color: 'var(--text-muted)', borderRadius: 6, padding: '4px 10px',
              fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Comparison table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...labelCell, background: 'transparent' }} />
                {vendors.map(v => (
                  <th key={v.id} style={{
                    ...cellBase, textAlign: 'left',
                    fontFamily: 'Playfair Display', fontSize: 16,
                    color: 'var(--text)', fontWeight: 400,
                  }}>
                    {v.vendor_name || <span style={{ color: 'var(--text-dim)' }}>Unnamed</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Est. Cost */}
              <tr>
                <td style={labelCell}>Est. Cost</td>
                {vendors.map(v => {
                  const price = v.actual_cost || v.estimated_cost
                  const isMin = minPrice !== null && price === minPrice
                  return (
                    <td key={v.id} style={{
                      ...cellBase,
                      color: isMin ? 'var(--green)' : 'var(--text)',
                      fontWeight: isMin ? 600 : 400,
                    }}>
                      {formatUsd(v.estimated_cost)}
                      {isMin && <span style={{ marginLeft: 6, fontSize: 10 }}>✓ lowest</span>}
                    </td>
                  )
                })}
              </tr>
              {/* Actual Cost */}
              <tr>
                <td style={labelCell}>Actual Cost</td>
                {vendors.map(v => (
                  <td key={v.id} style={cellBase}>
                    {v.actual_cost ? formatUsd(v.actual_cost) : <span style={dim}>—</span>}
                  </td>
                ))}
              </tr>
              {/* Status */}
              <tr>
                <td style={labelCell}>Status</td>
                {vendors.map(v => (
                  <td key={v.id} style={cellBase}>
                    <StatusBadge status={v.status} />
                  </td>
                ))}
              </tr>
              {/* Contact */}
              <tr>
                <td style={labelCell}>Contact</td>
                {vendors.map(v => (
                  <td key={v.id} style={cellBase}>
                    {v.contact_name && <div>{v.contact_name}</div>}
                    {v.contact_email
                      ? <a href={`mailto:${v.contact_email}`} style={{ color: 'var(--gold)', fontSize: 12 }}>{v.contact_email}</a>
                      : !v.contact_name && <span style={dim}>—</span>}
                  </td>
                ))}
              </tr>
              {/* Website */}
              <tr>
                <td style={labelCell}>Website</td>
                {vendors.map(v => (
                  <td key={v.id} style={cellBase}>
                    {v.website_url
                      ? <a href={v.website_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>site ↗</a>
                      : <span style={dim}>—</span>}
                  </td>
                ))}
              </tr>
              {/* Instagram */}
              <tr>
                <td style={labelCell}>Instagram</td>
                {vendors.map(v => (
                  <td key={v.id} style={cellBase}>
                    {v.instagram_url
                      ? <a href={v.instagram_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>ig ↗</a>
                      : <span style={dim}>—</span>}
                  </td>
                ))}
              </tr>
              {/* Notes */}
              <tr>
                <td style={labelCell}>Notes</td>
                {vendors.map(v => (
                  <td key={v.id} style={{ ...cellBase, maxWidth: 260, whiteSpace: 'pre-wrap', fontSize: 12 }}>
                    {v.notes || <span style={dim}>—</span>}
                  </td>
                ))}
              </tr>
              {/* Choose this */}
              <tr>
                <td style={{ ...labelCell, borderBottom: 'none' }} />
                {vendors.map(v => (
                  <td key={v.id} style={{ ...cellBase, borderBottom: 'none', paddingTop: 16 }}>
                    <button
                      onClick={() => onChoose(v.id)}
                      disabled={v.status === 'booked'}
                      style={{
                        background: v.status === 'shortlisted' ? 'var(--gold)' : 'transparent',
                        border: '1px solid var(--gold)',
                        color: v.status === 'shortlisted' ? 'var(--card)' : 'var(--gold)',
                        borderRadius: 6, padding: '6px 14px',
                        fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600,
                        cursor: v.status === 'booked' ? 'not-allowed' : 'pointer',
                        opacity: v.status === 'booked' ? 0.5 : 1,
                      }}
                    >
                      {v.status === 'booked' ? 'Booked' : v.status === 'shortlisted' ? 'Shortlisted ✓' : 'Choose this'}
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function VendorCard({ vendor, onUpdate, onDelete, showCompare, onCompare }) {
  const [expanded, setExpanded] = useState(false)
  const [edit, setEdit] = useState(vendor)

  useEffect(() => { setEdit(vendor) }, [vendor])

  function commit() {
    const patch = {}
    const fields = [
      'vendor_type', 'vendor_name', 'priority', 'estimated_cost', 'actual_cost',
      'deposit_amount',
      'contact_name', 'contact_email', 'contact_phone',
      'website_url', 'instagram_url',
      'next_action', 'next_action_date', 'last_contact_date', 'notes',
    ]
    for (const f of fields) {
      if (edit[f] !== vendor[f]) patch[f] = edit[f] === '' ? null : edit[f]
    }
    if (Object.keys(patch).length > 0) onUpdate(vendor.id, patch)
  }

  const borderColor = vendor.is_locked_in
    ? 'var(--green)'
    : vendor.status === 'booked'
      ? 'var(--green)'
      : 'var(--gold-border)'

  return (
    <div
      className="card-gatsby"
      style={{
        padding: 16,
        borderColor,
        borderWidth: vendor.is_locked_in ? 2 : 1,
        borderStyle: 'solid',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.14em', color: 'var(--gold)',
            textTransform: 'uppercase', fontFamily: 'DM Sans',
          }}>
            {prettyType(vendor.vendor_type)}
            {vendor.priority === 'nice_to_have' && (
              <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>· nice-to-have</span>
            )}
          </div>
          <div style={{ fontFamily: 'Playfair Display', fontSize: 20, color: 'var(--text)', marginTop: 2 }}>
            {vendor.vendor_name || <span style={{ color: 'var(--text-dim)' }}>Not selected</span>}
          </div>
        </div>
        <StatusBadge status={vendor.status} />
      </div>

      <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
        <Field label="Est. cost">{formatUsd(vendor.estimated_cost)}</Field>
        <Field label="Actual">{vendor.actual_cost ? formatUsd(vendor.actual_cost) : '—'}</Field>
        <Field label="Deposit">
          {vendor.deposit_amount
            ? `${formatUsd(vendor.deposit_amount)} ${vendor.deposit_paid ? '· paid' : '· unpaid'}`
            : '—'}
        </Field>
        <Field label="Contract">
          {vendor.contract_signed
            ? <span style={{ color: 'var(--green)' }}>signed</span>
            : <span style={{ color: 'var(--text-muted)' }}>unsigned</span>}
        </Field>
        <Field label="Next action">
          {vendor.next_action
            ? `${vendor.next_action}${vendor.next_action_date ? ` · ${fmtDate(vendor.next_action_date)}` : ''}`
            : '—'}
        </Field>
      </div>

      <div style={{
        display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background: 'transparent', border: '1px solid var(--gold-border)',
            color: 'var(--gold)', borderRadius: 6, padding: '4px 10px',
            fontFamily: 'DM Sans', fontSize: 11, cursor: 'pointer',
          }}
        >
          {expanded ? 'Close' : 'Edit'}
        </button>
        {showCompare && (
          <button
            onClick={onCompare}
            style={{
              background: 'transparent', border: '1px solid var(--gold-border)',
              color: 'var(--gold)', borderRadius: 6, padding: '4px 10px',
              fontFamily: 'DM Sans', fontSize: 11, cursor: 'pointer',
            }}
          >
            Compare
          </button>
        )}
        {vendor.website_url && (
          <a href={vendor.website_url} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--gold)' }}>
            site ↗
          </a>
        )}
        {vendor.instagram_url && (
          <a href={vendor.instagram_url} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--gold)' }}>
            ig ↗
          </a>
        )}
        {vendor.contact_email && (
          <a href={`mailto:${vendor.contact_email}`}
            style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--gold)' }}>
            {vendor.contact_email}
          </a>
        )}
      </div>

      {expanded && (
        <div style={{
          marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
        }}>
          <EditField label="Category (vendor type)" value={edit.vendor_type}
            onChange={(v) => setEdit(e => ({ ...e, vendor_type: v }))} onBlur={commit} />
          <EditField label="Vendor name" value={edit.vendor_name}
            onChange={(v) => setEdit(e => ({ ...e, vendor_name: v }))} onBlur={commit} />
          <EditSelect label="Status" value={edit.status} options={STATUSES} labels={STATUS_LABEL}
            onChange={(v) => { setEdit(e => ({ ...e, status: v })); onUpdate(vendor.id, { status: v }) }} />
          <EditSelect label="Priority" value={edit.priority} options={PRIORITIES}
            onChange={(v) => { setEdit(e => ({ ...e, priority: v })); onUpdate(vendor.id, { priority: v }) }} />
          <EditNumber label="Est. cost ($)" value={edit.estimated_cost}
            onChange={(v) => setEdit(e => ({ ...e, estimated_cost: v }))} onBlur={commit} />
          <EditNumber label="Actual cost ($)" value={edit.actual_cost}
            onChange={(v) => setEdit(e => ({ ...e, actual_cost: v }))} onBlur={commit} />
          <EditNumber label="Deposit ($)" value={edit.deposit_amount}
            onChange={(v) => setEdit(e => ({ ...e, deposit_amount: v }))} onBlur={commit} />
          <EditCheck label="Deposit paid" value={edit.deposit_paid}
            onChange={(v) => onUpdate(vendor.id, { deposit_paid: v })} />
          <EditCheck label="Contract signed" value={edit.contract_signed}
            onChange={(v) => onUpdate(vendor.id, { contract_signed: v })} />
          <EditField label="Contact name" value={edit.contact_name}
            onChange={(v) => setEdit(e => ({ ...e, contact_name: v }))} onBlur={commit} />
          <EditField label="Contact email" value={edit.contact_email}
            onChange={(v) => setEdit(e => ({ ...e, contact_email: v }))} onBlur={commit} />
          <EditField label="Contact phone" value={edit.contact_phone}
            onChange={(v) => setEdit(e => ({ ...e, contact_phone: v }))} onBlur={commit} />
          <EditField label="Website" value={edit.website_url}
            onChange={(v) => setEdit(e => ({ ...e, website_url: v }))} onBlur={commit} />
          <EditField label="Instagram" value={edit.instagram_url}
            onChange={(v) => setEdit(e => ({ ...e, instagram_url: v }))} onBlur={commit} />
          <EditField label="Next action" value={edit.next_action}
            onChange={(v) => setEdit(e => ({ ...e, next_action: v }))} onBlur={commit} />
          <EditField label="Next action date" value={edit.next_action_date} type="date"
            onChange={(v) => setEdit(e => ({ ...e, next_action_date: v }))} onBlur={commit} />
          <EditField label="Last contact date" value={edit.last_contact_date} type="date"
            onChange={(v) => setEdit(e => ({ ...e, last_contact_date: v }))} onBlur={commit} />
          <div style={{ gridColumn: '1 / -1' }}>
            <EditField label="Notes" value={edit.notes} multiline
              onChange={(v) => setEdit(e => ({ ...e, notes: v }))} onBlur={commit} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => onDelete(vendor.id)}
              style={{
                background: 'transparent', border: '1px solid var(--red)',
                color: 'var(--red)', borderRadius: 6, padding: '4px 10px',
                fontFamily: 'DM Sans', fontSize: 11, cursor: 'pointer',
              }}
            >
              Remove vendor
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function EditField({ label, value, onChange, onBlur, type = 'text', multiline = false }) {
  const sharedStyle = {
    width: '100%',
    background: 'transparent', border: '1px solid var(--gold-border)',
    borderRadius: 6, padding: '6px 8px', fontFamily: 'DM Sans',
    fontSize: 12, color: 'var(--text)',
  }
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: 2 }}>
        {label}
      </div>
      {multiline
        ? <textarea
            rows={2}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            style={sharedStyle}
          />
        : <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            style={sharedStyle}
          />}
    </label>
  )
}

function EditNumber({ label, value, onChange, onBlur }) {
  return (
    <EditField
      label={label}
      type="number"
      value={value ?? ''}
      onChange={(v) => onChange(v === '' ? null : Number(v))}
      onBlur={onBlur}
    />
  )
}

function EditSelect({ label, value, options, labels = {}, onChange }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: 2 }}>
        {label}
      </div>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', background: 'transparent', border: '1px solid var(--gold-border)',
          borderRadius: 6, padding: '6px 8px', fontFamily: 'DM Sans',
          fontSize: 12, color: 'var(--text)', cursor: 'pointer',
        }}
      >
        {options.map(o => <option key={o} value={o}>{labels[o] || o}</option>)}
      </select>
    </label>
  )
}

function EditCheck({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 14 }}>
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: 'var(--gold)' }} />
      <span style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'DM Sans' }}>{label}</span>
    </label>
  )
}

export default function Vendors() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')   // 'all' | 'open' | 'booked'
  const [adding, setAdding] = useState(false)
  const [newType, setNewType] = useState('')
  const [compareType, setCompareType] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('vendor_pipeline')
        .select('*')
        .order('id', { ascending: true })
      if (cancelled) return
      if (error) setError(error.message)
      else setVendors(data || [])
      setLoading(false)
    }
    load()

    const ch = supabase
      .channel('vendors-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_pipeline' },
        async () => {
          const { data } = await supabase.from('vendor_pipeline').select('*').order('id')
          if (!cancelled) setVendors(data || [])
        })
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(ch) }
  }, [])

  const typeCount = useMemo(() =>
    vendors.reduce((acc, v) => {
      acc[v.vendor_type] = (acc[v.vendor_type] || 0) + 1
      return acc
    }, {}),
  [vendors])

  const stats = useMemo(() => {
    return {
      total: vendors.length,
      booked: vendors.filter(v => v.status === 'booked').length,
      open: vendors.filter(v => v.status !== 'booked' && v.status !== 'passed').length,
      passed: vendors.filter(v => v.status === 'passed').length,
      estTotal: vendors.reduce((s, v) => s + (v.actual_cost || v.estimated_cost || 0), 0),
    }
  }, [vendors])

  const filtered = useMemo(() => {
    if (filter === 'open') return vendors.filter(v => v.status !== 'booked' && v.status !== 'passed')
    if (filter === 'booked') return vendors.filter(v => v.status === 'booked')
    return vendors
  }, [vendors, filter])

  async function update(id, patch) {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v))
    const { error } = await supabase.from('vendor_pipeline').update(patch).eq('id', id)
    if (error) setError(`Update failed: ${error.message}`)
  }

  async function removeVendor(id) {
    if (!confirm('Remove this vendor row?')) return
    const prev = vendors
    setVendors(v => v.filter(x => x.id !== id))
    const { error } = await supabase.from('vendor_pipeline').delete().eq('id', id)
    if (error) {
      setError(`Delete failed: ${error.message}`)
      setVendors(prev)
    }
  }

  async function chooseVendor(id) {
    const vendor = vendors.find(v => v.id === id)
    if (!vendor) return
    const siblings = vendors.filter(v => v.vendor_type === vendor.vendor_type)
    await Promise.all(siblings.map(v => update(v.id, {
      status: v.id === id
        ? (v.status === 'booked' ? 'booked' : 'shortlisted')
        : (v.status === 'booked' ? 'booked' : 'contacted'),
    })))
    setCompareType(null)
  }

  async function addVendor() {
    if (!newType.trim()) return
    const row = {
      vendor_type: newType.trim().toLowerCase().replace(/\s+/g, '_'),
      status: 'needed',
      priority: 'nice_to_have',
    }
    const { data, error } = await supabase.from('vendor_pipeline').insert(row).select().single()
    if (error) setError(`Insert failed: ${error.message}`)
    else if (data) {
      setVendors(v => [...v, data])
      setNewType('')
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--dark)', minHeight: 'calc(100vh - 56px)', padding: 32 }}>
        <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>Loading vendors...</div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--dark)', minHeight: 'calc(100vh - 56px)', padding: '24px 24px 64px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11, letterSpacing: '0.18em', color: 'var(--gold)',
            textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: 4,
          }}>
            Vendor pipeline
          </div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Vendors</h1>
          <div className="deco-divider" style={{ maxWidth: 220, marginTop: 6 }}>◆</div>
        </div>

        {/* Stats + filter strip */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', gap: 16, fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)' }}>
            <span><b style={{ color: 'var(--green)' }}>{stats.booked}</b> booked</span>
            <span><b style={{ color: 'var(--gold)' }}>{stats.open}</b> open</span>
            <span><b style={{ color: 'var(--text)' }}>{stats.total}</b> total</span>
            <span>Vendor cost so far: <b style={{ color: 'var(--text)' }}>{formatUsd(stats.estTotal)}</b></span>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{
            display: 'inline-flex', border: '1px solid var(--gold-border)', borderRadius: 8, overflow: 'hidden',
          }}>
            {['all', 'open', 'booked'].map(k => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                style={{
                  background: filter === k ? 'var(--gold)' : 'transparent',
                  color: filter === k ? 'var(--card)' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer', padding: '6px 12px',
                  fontFamily: 'DM Sans', fontSize: 12, textTransform: 'capitalize',
                  fontWeight: filter === k ? 600 : 400,
                }}
              >
                {k}
              </button>
            ))}
          </div>

          {adding ? (
            <div style={{ display: 'inline-flex', gap: 6 }}>
              <input
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                placeholder="vendor type, e.g. cake"
                onKeyDown={(e) => e.key === 'Enter' && addVendor()}
                style={{
                  background: 'var(--card)', border: '1px solid var(--gold-border)',
                  borderRadius: 6, padding: '6px 10px', fontFamily: 'DM Sans', fontSize: 12,
                }}
              />
              <button
                onClick={addVendor}
                style={{
                  background: 'var(--gold)', border: 'none', color: 'var(--card)',
                  borderRadius: 6, padding: '6px 10px', fontFamily: 'DM Sans', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >Add</button>
              <button
                onClick={() => { setAdding(false); setNewType('') }}
                style={{
                  background: 'transparent', border: '1px solid var(--gold-border)',
                  color: 'var(--text-muted)', borderRadius: 6, padding: '6px 10px',
                  fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer',
                }}
              >Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              style={{
                background: 'transparent', border: '1px solid var(--gold-border)',
                color: 'var(--gold)', borderRadius: 8, padding: '8px 12px',
                fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer',
              }}
            >+ Vendor type</button>
          )}
        </div>

        {error && (
          <div style={{
            marginBottom: 12, padding: 10, borderRadius: 8,
            background: 'rgba(224, 112, 112, 0.10)', color: 'var(--red)',
            fontFamily: 'DM Sans', fontSize: 12,
          }}>
            {error}
            <button
              onClick={() => setError(null)}
              style={{ marginLeft: 8, background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer' }}
            >dismiss</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
          {filtered.map(v => (
            <VendorCard
              key={v.id}
              vendor={v}
              onUpdate={update}
              onDelete={removeVendor}
              showCompare={typeCount[v.vendor_type] >= 2}
              onCompare={() => setCompareType(v.vendor_type)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{
            padding: 32, textAlign: 'center', color: 'var(--text-dim)',
            fontFamily: 'DM Sans', fontSize: 13,
          }}>
            No vendors match this filter.
          </div>
        )}
      </div>

      {compareType && (
        <CompareModal
          vendors={vendors.filter(v => v.vendor_type === compareType)}
          onClose={() => setCompareType(null)}
          onChoose={chooseVendor}
        />
      )}
    </div>
  )
}
