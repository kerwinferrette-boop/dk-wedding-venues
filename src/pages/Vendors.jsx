// Vendor pipeline tracker.
//
// Booked vendors (5): photographer, videographer, day-of coordinator,
// catering (La Valencia), bar (La Valencia).
// Open: florist, DJ, live musician, +maybe photographer_2, content_creator, cake.
//
// Pulls from / writes to Supabase `vendor_pipeline`. The vendor inbox tracker
// and the vendor researcher skills both read & write this same table.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatUsd, computeVendorCommitments } from '../lib/budget'

// Order matters: index = how far along the pipeline a status is. Used to pick
// the badge for a whole category and to sort groups by progress.
const STATUSES = ['needed', 'sourcing', 'contacted', 'shortlisted', 'booked', 'passed']
const PRIORITIES = ['must_have', 'nice_to_have']
const OPEN_STATUSES = ['needed', 'sourcing', 'contacted', 'shortlisted']

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

const ACRONYMS = { dj: 'DJ' }

function prettyType(t) {
  return (t || '')
    .split('_')
    .map(w => ACRONYMS[w] || w.replace(/^\w/, c => c.toUpperCase()))
    .join(' ')
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
  // color-mix, not string concatenation: `var(--green)1F` parses as two tokens
  // and silently drops the whole declaration.
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 999,
      fontSize: 10,
      letterSpacing: '0.10em',
      textTransform: 'uppercase',
      background: `color-mix(in srgb, ${color} 14%, transparent)`,
      color,
      border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
      fontFamily: 'DM Sans',
      fontWeight: 600,
    }}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

function VendorCard({ vendor, onUpdate, onDelete }) {
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

// --- Category grouping ------------------------------------------------------

/** What a row actually costs: actual beats estimate; null when unpriced. */
function rowCost(v) {
  const c = v.actual_cost ?? v.estimated_cost
  if (c == null || c === '') return null
  const n = Number(c)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * One badge for a whole category: booked wins outright, otherwise the
 * furthest-along status among options we haven't passed on.
 */
function groupStatus(rows) {
  const live = rows.filter(r => r.status !== 'passed')
  if (!live.length) return 'passed'
  if (live.some(r => r.status === 'booked')) return 'booked'
  return live.reduce(
    (best, r) => (STATUSES.indexOf(r.status) > STATUSES.indexOf(best) ? r.status : best),
    live[0].status,
  )
}

/** "$900–$1,800", "$3,500", or "—" when nothing in the category is priced. */
function priceRange(rows) {
  const costs = rows.filter(r => r.status !== 'passed').map(rowCost).filter(c => c != null)
  if (!costs.length) return '—'
  const min = Math.min(...costs)
  const max = Math.max(...costs)
  return min === max ? formatUsd(min) : `${formatUsd(min)}–${formatUsd(max)}`
}

const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x))

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'var(--gold)' : 'transparent',
        color: active ? 'var(--card)' : 'var(--text-muted)',
        border: `1px solid ${active ? 'var(--gold)' : 'var(--gold-border)'}`,
        borderRadius: 999, padding: '4px 11px', cursor: 'pointer',
        fontFamily: 'DM Sans', fontSize: 11, fontWeight: active ? 600 : 400,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

/** Checkbox dropdown. Used for the category list, which is too long for chips. */
function MultiSelect({ label, options, selected, onChange, format = (x) => x }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const toggle = (o) =>
    onChange(selected.includes(o) ? selected.filter(x => x !== o) : [...selected, o])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: selected.length ? 'var(--gold)' : 'transparent',
          color: selected.length ? 'var(--card)' : 'var(--text-muted)',
          border: `1px solid ${selected.length ? 'var(--gold)' : 'var(--gold-border)'}`,
          borderRadius: 8, padding: '6px 11px', cursor: 'pointer',
          fontFamily: 'DM Sans', fontSize: 12, whiteSpace: 'nowrap',
          fontWeight: selected.length ? 600 : 400,
        }}
      >
        {label}{selected.length ? ` · ${selected.length}` : ''} ▾
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 20,
          background: 'var(--card)', border: '1px solid var(--gold-border)',
          borderRadius: 8, padding: 8, minWidth: 200, maxHeight: 280,
          overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}>
          {options.map(o => (
            <label key={o} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px',
              cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text)',
            }}>
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={() => toggle(o)}
                style={{ accentColor: 'var(--gold)' }}
              />
              {format(o)}
            </label>
          ))}
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              style={{
                marginTop: 6, width: '100%', background: 'transparent',
                border: '1px solid var(--gold-border)', color: 'var(--text-muted)',
                borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                fontFamily: 'DM Sans', fontSize: 11,
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** One collapsed category row; expands to show the competing options inside. */
function CategoryGroup({ group, open, onToggle, onUpdate, onDelete }) {
  const color = STATUS_COLOR[group.status] || 'var(--text-muted)'
  const isBooked = group.status === 'booked'

  return (
    <div
      className="card-gatsby"
      style={{
        padding: 0, overflow: 'visible',
        borderColor: isBooked ? 'var(--green)' : 'var(--gold-border)',
        borderWidth: isBooked ? 2 : 1, borderStyle: 'solid',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'grid', alignItems: 'center', gap: 12, textAlign: 'left',
          gridTemplateColumns: '14px minmax(130px, 1fr) 104px 78px 150px 118px',
          padding: '12px 16px',
        }}
      >
        <span style={{
          color: 'var(--gold)', fontSize: 10, fontFamily: 'DM Sans',
          transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms',
        }}>
          ▶
        </span>

        <span>
          <span style={{ fontFamily: 'Playfair Display', fontSize: 17, color: 'var(--text)' }}>
            {prettyType(group.type)}
          </span>
          {!group.mustHave && (
            <span style={{
              marginLeft: 8, fontFamily: 'DM Sans', fontSize: 10,
              color: 'var(--text-dim)',
            }}>
              {' '}· nice-to-have
            </span>
          )}
        </span>

        <span><StatusBadge status={group.status} /></span>

        <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)' }}>
          {group.count} {group.count === 1 ? 'option' : 'options'}
        </span>

        <span style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text)' }}>
          {group.range}
        </span>

        <span style={{ textAlign: 'right' }}>
          <span style={{ fontFamily: 'DM Sans', fontSize: 13, color: group.committed ? color : 'var(--text-dim)' }}>
            {group.committed ? formatUsd(group.committed) : '—'}
          </span>
          <span style={{ display: 'block', fontSize: 9, color: 'var(--text-dim)', fontFamily: 'DM Sans', letterSpacing: '0.08em' }}>
            IN BUDGET
          </span>
        </span>
      </button>

      {open && (
        <div style={{
          padding: '0 16px 16px', display: 'grid', gap: 12,
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        }}>
          {group.rows.map(v => (
            <VendorCard key={v.id} vendor={v} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Vendors() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [newType, setNewType] = useState('')

  // Filters. Everything below is derived from these - no stored row lists.
  const [query, setQuery] = useState('')
  const [cats, setCats] = useState([])
  const [statusSel, setStatusSel] = useState([])
  const [priority, setPriority] = useState('all')
  const [sort, setSort] = useState('category')
  const [expanded, setExpanded] = useState(() => new Set())

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

  // Everything in this header is computed from the rows - nothing is typed in.
  const stats = useMemo(() => {
    const unbookedMustHaves = new Set(
      vendors.filter(v => v.priority === 'must_have' && v.status !== 'passed')
        .map(v => v.vendor_type),
    )
    for (const v of vendors) {
      if (v.status === 'booked') unbookedMustHaves.delete(v.vendor_type)
    }
    const nextDue = vendors
      .filter(v => v.next_action_date && v.status !== 'passed' && v.status !== 'booked')
      .map(v => v.next_action_date)
      .sort()[0] || null

    return {
      total: vendors.length,
      categories: new Set(vendors.map(v => v.vendor_type)).size,
      booked: vendors.filter(v => v.status === 'booked').length,
      open: vendors.filter(v => v.status !== 'booked' && v.status !== 'passed').length,
      mustHavesOpen: unbookedMustHaves.size,
      nextDue,
      // Group by type so multiple quotes for one category don't stack — count the
      // booked option if any, else the highest estimate per type.
      estTotal: computeVendorCommitments(vendors).total,
    }
  }, [vendors])

  const allTypes = useMemo(
    () => [...new Set(vendors.map(v => v.vendor_type))].filter(Boolean).sort(),
    [vendors],
  )

  // Single source of truth for "what counts toward the budget" — the same
  // function the Budget page uses, so the two pages can never disagree.
  const commitMap = useMemo(() => {
    const m = {}
    for (const r of computeVendorCommitments(vendors).rows) m[r.vendor_type] = r
    return m
  }, [vendors])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return vendors.filter(v => {
      if (cats.length && !cats.includes(v.vendor_type)) return false
      if (statusSel.length && !statusSel.includes(v.status)) return false
      if (priority !== 'all' && v.priority !== priority) return false
      if (!q) return true
      const hay = [
        v.vendor_name, v.vendor_type, v.contact_name,
        v.contact_email, v.notes, v.next_action,
      ].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [vendors, query, cats, statusSel, priority])

  const groups = useMemo(() => {
    const by = {}
    for (const v of matches) (by[v.vendor_type] ||= []).push(v)

    const list = Object.entries(by).map(([type, rows]) => {
      // Inside a category: booked first, then priciest (the real contenders),
      // passed options sink to the bottom.
      const rank = v => (v.status === 'booked' ? 0 : v.status === 'passed' ? 2 : 1)
      const sorted = [...rows].sort((a, b) =>
        rank(a) - rank(b) || (rowCost(b) ?? -1) - (rowCost(a) ?? -1) || a.id - b.id)

      return {
        type,
        rows: sorted,
        status: groupStatus(rows),
        count: rows.length,
        range: priceRange(rows),
        committed: commitMap[type]?.cost ?? 0,
        mustHave: rows.some(r => r.priority === 'must_have'),
        nextDate: rows.map(r => r.next_action_date).filter(Boolean).sort()[0] || null,
      }
    })

    const sorters = {
      cost_desc: (a, b) => b.committed - a.committed,
      cost_asc: (a, b) => a.committed - b.committed,
      status: (a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || a.type.localeCompare(b.type),
      next_action: (a, b) => (a.nextDate || '9999').localeCompare(b.nextDate || '9999'),
      // Default: locked-in work first, then what still needs attention.
      category: (a, b) =>
        (a.status === 'booked' ? 0 : 1) - (b.status === 'booked' ? 0 : 1) ||
        (a.mustHave ? 0 : 1) - (b.mustHave ? 0 : 1) ||
        a.type.localeCompare(b.type),
    }
    return list.sort(sorters[sort] || sorters.category)
  }, [matches, commitMap, sort])

  // Narrowing the list implies you want to see inside it.
  const narrowed = query.trim() !== '' || cats.length > 0
  const isOpen = (type) => narrowed || expanded.has(type)

  function toggleGroup(type) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const preset =
    statusSel.length === 0 ? 'all'
      : sameSet(statusSel, OPEN_STATUSES) ? 'open'
        : sameSet(statusSel, ['booked']) ? 'booked'
          : null

  function applyPreset(k) {
    if (k === 'all') setStatusSel([])
    else if (k === 'open') setStatusSel(OPEN_STATUSES)
    else setStatusSel(['booked'])
  }

  const filtersActive =
    query.trim() !== '' || cats.length > 0 || statusSel.length > 0 || priority !== 'all'

  function clearFilters() {
    setQuery(''); setCats([]); setStatusSel([]); setPriority('all')
  }

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

        {/* Derived header numbers */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 12,
          fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)',
        }}>
          <span><b style={{ color: 'var(--green)' }}>{stats.booked}</b> booked</span>
          <span><b style={{ color: 'var(--gold)' }}>{stats.open}</b> open</span>
          <span><b style={{ color: 'var(--text)' }}>{stats.categories}</b> categories · {stats.total} options</span>
          <span>
            Must-haves unbooked:{' '}
            <b style={{ color: stats.mustHavesOpen ? 'var(--red)' : 'var(--green)' }}>
              {stats.mustHavesOpen}
            </b>
          </span>
          <span>Next action: <b style={{ color: 'var(--text)' }}>{fmtDate(stats.nextDue)}</b></span>
          <span>Vendor cost so far: <b style={{ color: 'var(--text)' }}>{formatUsd(stats.estTotal)}</b></span>
        </div>

        {/* Filter bar */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14,
        }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, contact, notes…"
            style={{
              background: 'var(--card)', border: '1px solid var(--gold-border)',
              borderRadius: 8, padding: '7px 11px', fontFamily: 'DM Sans',
              fontSize: 12, color: 'var(--text)', minWidth: 220,
            }}
          />

          <MultiSelect
            label="Category" options={allTypes} selected={cats}
            onChange={setCats} format={prettyType}
          />
          <MultiSelect
            label="Status" options={STATUSES} selected={statusSel}
            onChange={setStatusSel} format={(s) => STATUS_LABEL[s] || s}
          />

          <div style={{
            display: 'inline-flex', border: '1px solid var(--gold-border)',
            borderRadius: 8, overflow: 'hidden',
          }}>
            {['all', 'open', 'booked'].map(k => (
              <button
                key={k}
                onClick={() => applyPreset(k)}
                style={{
                  background: preset === k ? 'var(--gold)' : 'transparent',
                  color: preset === k ? 'var(--card)' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer', padding: '7px 12px',
                  fontFamily: 'DM Sans', fontSize: 12, textTransform: 'capitalize',
                  fontWeight: preset === k ? 600 : 400,
                }}
              >
                {k}
              </button>
            ))}
          </div>

          {PRIORITIES.map(p => (
            <Chip
              key={p}
              active={priority === p}
              onClick={() => setPriority(priority === p ? 'all' : p)}
            >
              {p === 'must_have' ? 'Must-have' : 'Nice-to-have'}
            </Chip>
          ))}

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              background: 'var(--card)', border: '1px solid var(--gold-border)',
              borderRadius: 8, padding: '7px 10px', fontFamily: 'DM Sans',
              fontSize: 12, color: 'var(--text)', cursor: 'pointer',
            }}
          >
            <option value="category">Sort: Category</option>
            <option value="cost_desc">Sort: Cost (high→low)</option>
            <option value="cost_asc">Sort: Cost (low→high)</option>
            <option value="status">Sort: Status</option>
            <option value="next_action">Sort: Next action</option>
          </select>

          {filtersActive && (
            <button
              onClick={clearFilters}
              style={{
                background: 'transparent', border: '1px solid var(--gold-border)',
                color: 'var(--text-muted)', borderRadius: 8, padding: '7px 11px',
                fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer',
              }}
            >
              Clear filters
            </button>
          )}

          <div style={{ flex: 1 }} />

          <button
            onClick={() => setExpanded(
              expanded.size === groups.length ? new Set() : new Set(groups.map(g => g.type)),
            )}
            style={{
              background: 'transparent', border: '1px solid var(--gold-border)',
              color: 'var(--gold)', borderRadius: 8, padding: '7px 11px',
              fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer',
            }}
          >
            {expanded.size === groups.length ? 'Collapse all' : 'Expand all'}
          </button>

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

        <div style={{ display: 'grid', gap: 10 }}>
          {groups.map(g => (
            <CategoryGroup
              key={g.type}
              group={g}
              open={isOpen(g.type)}
              onToggle={() => toggleGroup(g.type)}
              onUpdate={update}
              onDelete={removeVendor}
            />
          ))}
        </div>

        {groups.length === 0 && (
          <div style={{
            padding: 32, textAlign: 'center', color: 'var(--text-dim)',
            fontFamily: 'DM Sans', fontSize: 13,
          }}>
            No vendors match these filters.
          </div>
        )}
      </div>

    </div>
  )
}
