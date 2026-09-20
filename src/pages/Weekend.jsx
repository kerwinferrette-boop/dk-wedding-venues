// Wedding Weekend Hub - Venue Tracker + Itinerary for the Wed 3/24-Sun 3/28,
// 2027 side events (Welcome Party, Ceremony Rehearsal, Rehearsal Dinner,
// Wedding, After Party, Egg Hunt).
//
// Pulls from / writes to Supabase `weekend_venues` and `weekend_itinerary`.
// Weekend spend NEVER gets mirrored into extras_budget - it lives only here,
// and rolls into the whole-wedding budget exactly once via computeWeekendSpend.

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  formatUsd,
  fetchWeekendVenues,
  fetchWeekendItinerary,
  computeWeekendVenueCommitments,
  computeWeekendSpend,
  computeBudgetByCategory,
} from '../lib/budget'
import { BUDGET_CATEGORIES, categoryLabel, categoryColor } from '../lib/budgetCategories'
import BudgetStackedBar from '../components/BudgetStackedBar'

const EVENT_TYPES = ['welcome_party', 'ceremony_rehearsal', 'rehearsal_dinner', 'after_party', 'egg_hunt']

const EVENT_LABEL = {
  welcome_party: 'Welcome Party',
  ceremony_rehearsal: 'Ceremony Rehearsal',
  rehearsal_dinner: 'Rehearsal Dinner',
  after_party: 'After Party',
  egg_hunt: 'Egg Hunt',
}

const STATUSES = ['sourcing', 'quoted', 'toured', 'booked', 'passed', 'in_progress']

const STATUS_COLOR = {
  sourcing: 'var(--teal)',
  quoted: 'var(--gold)',
  toured: 'var(--gold)',
  booked: 'var(--green)',
  passed: 'var(--red)',
  in_progress: 'var(--teal)',
}

const STATUS_LABEL = {
  sourcing: 'Sourcing',
  quoted: 'Quoted',
  toured: 'Toured',
  booked: 'Booked',
  passed: 'Passed',
  in_progress: 'In Progress',
}

const PARENT_SIDES = ['dani', 'kerwin', 'both']
const PARENT_SIDE_LABEL = { dani: "Dani's parents", kerwin: "Kerwin's parents", both: 'Both families' }

const AUDIENCES = ['all_guests', 'wedding_party', 'family', 'couple']
const AUDIENCE_LABEL = {
  all_guests: 'All guests', wedding_party: 'Wedding party', family: 'Family', couple: 'Couple',
}

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }
  catch { return d }
}

function fmtQuoteRange(v) {
  if (v.quote_low != null && v.quote_high != null) {
    return v.quote_low === v.quote_high ? formatUsd(v.quote_low) : `${formatUsd(v.quote_low)}–${formatUsd(v.quote_high)}`
  }
  if (v.quote_low != null) return formatUsd(v.quote_low)
  if (v.quote_high != null) return formatUsd(v.quote_high)
  return '—'
}

function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || 'var(--text-muted)'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 10,
      letterSpacing: '0.10em', textTransform: 'uppercase', background: `${color}1F`,
      color, border: `1px solid ${color}66`, fontFamily: 'DM Sans', fontWeight: 600,
    }}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text)' }}>
        {children || <span style={{ color: 'var(--text-dim)' }}>—</span>}
      </div>
    </div>
  )
}

const editShared = {
  width: '100%', background: 'transparent', border: '1px solid var(--gold-border)',
  borderRadius: 6, padding: '6px 8px', fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text)',
}

function EditField({ label, value, onChange, onBlur, type = 'text', multiline = false, disabled = false }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: 2 }}>
        {label}
      </div>
      {multiline
        ? <textarea rows={2} value={value || ''} onChange={e => onChange(e.target.value)} onBlur={onBlur}
            style={editShared} disabled={disabled} />
        : <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} onBlur={onBlur}
            style={{ ...editShared, opacity: disabled ? 0.4 : 1 }} disabled={disabled} />}
    </label>
  )
}

function EditNumber({ label, value, onChange, onBlur, disabled = false }) {
  return (
    <EditField label={label} type="number" value={value ?? ''} disabled={disabled}
      onChange={v => onChange(v === '' ? null : Number(v))} onBlur={onBlur} />
  )
}

function EditSelect({ label, value, options, labels = {}, onChange, disabled = false }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: 2 }}>
        {label}
      </div>
      <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled}
        style={{ ...editShared, cursor: 'pointer', opacity: disabled ? 0.4 : 1 }}>
        <option value="">—</option>
        {options.map(o => <option key={o} value={o}>{labels[o] || o}</option>)}
      </select>
    </label>
  )
}

function EditCheck({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 14 }}>
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
      <span style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'DM Sans' }}>{label}</span>
    </label>
  )
}

function VenueCard({ venue, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [edit, setEdit] = useState(venue)
  useEffect(() => { setEdit(venue) }, [venue])

  function commit() {
    const patch = {}
    const fields = [
      'name', 'status', 'contact_name', 'contact_email', 'contact_phone', 'website_url', 'photo_url',
      'quote_low', 'quote_high', 'quote_basis', 'capacity', 'expected_headcount',
      'distance_miles', 'distance_note', 'vibe', 'pros', 'cons',
      'deposit_amount', 'deposit_due', 'balance_due', 'notes', 'category', 'parents_amount', 'parents_side',
    ]
    for (const f of fields) {
      if (edit[f] !== venue[f]) patch[f] = edit[f] === '' ? null : edit[f]
    }
    if (Object.keys(patch).length > 0) onUpdate(venue.id, patch)
  }

  const borderColor = venue.status === 'booked' ? 'var(--green)' : 'var(--gold-border)'

  return (
    <div className="card-gatsby" style={{ padding: 16, borderColor, borderWidth: venue.status === 'booked' ? 2 : 1, borderStyle: 'solid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Playfair Display', fontSize: 19, color: 'var(--text)' }}>{venue.name}</div>
          {venue.category && (
            <div style={{ fontSize: 10, color: categoryColor(venue.category), fontFamily: 'DM Sans', marginTop: 2 }}>
              {categoryLabel(venue.category)}
            </div>
          )}
        </div>
        <StatusBadge status={venue.status} />
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
        <Field label="Quote">{fmtQuoteRange(venue)}</Field>
        <Field label="Capacity">{venue.capacity ?? '—'}</Field>
        <Field label="Distance">{venue.distance_note || (venue.distance_miles ? `${venue.distance_miles} mi` : '—')}</Field>
        <Field label="Deposit due">{fmtDate(venue.deposit_due)}</Field>
      </div>

      {(venue.vibe || venue.pros || venue.cons || venue.quote_basis) && (
        <div style={{ marginTop: 10, fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {venue.quote_basis && <div style={{ fontStyle: 'italic', marginBottom: 4 }}>{venue.quote_basis}</div>}
          {venue.vibe && <div>{venue.vibe}</div>}
        </div>
      )}

      {venue.parents_covering && (
        <div style={{ marginTop: 8, fontFamily: 'DM Sans', fontSize: 11, color: 'var(--gold)' }}>
          Parents covering {formatUsd(venue.parents_amount)}{venue.parents_side ? ` (${PARENT_SIDE_LABEL[venue.parents_side]})` : ''}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setExpanded(e => !e)} style={{
          background: 'transparent', border: '1px solid var(--gold-border)', color: 'var(--gold)',
          borderRadius: 6, padding: '4px 10px', fontFamily: 'DM Sans', fontSize: 11, cursor: 'pointer',
        }}>{expanded ? 'Close' : 'Edit'}</button>
        {venue.website_url && (
          <a href={venue.website_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--gold)' }}>site ↗</a>
        )}
        {venue.contact_email && (
          <a href={`mailto:${venue.contact_email}`} style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--gold)' }}>{venue.contact_email}</a>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <EditField label="Name" value={edit.name} onChange={v => setEdit(e => ({ ...e, name: v }))} onBlur={commit} />
          <EditSelect label="Status" value={edit.status} options={STATUSES} labels={STATUS_LABEL}
            onChange={v => { setEdit(e => ({ ...e, status: v })); onUpdate(venue.id, { status: v }) }} />
          <EditSelect label="Category" value={edit.category} options={BUDGET_CATEGORIES.map(c => c.key)} labels={Object.fromEntries(BUDGET_CATEGORIES.map(c => [c.key, c.label]))}
            onChange={v => { setEdit(e => ({ ...e, category: v })); onUpdate(venue.id, { category: v || null }) }} />
          <EditNumber label="Capacity" value={edit.capacity} onChange={v => setEdit(e => ({ ...e, capacity: v }))} onBlur={commit} />
          <EditNumber label="Quote low ($)" value={edit.quote_low} onChange={v => setEdit(e => ({ ...e, quote_low: v }))} onBlur={commit} />
          <EditNumber label="Quote high ($)" value={edit.quote_high} onChange={v => setEdit(e => ({ ...e, quote_high: v }))} onBlur={commit} />
          <EditField label="Quote basis" value={edit.quote_basis} onChange={v => setEdit(e => ({ ...e, quote_basis: v }))} onBlur={commit} />
          <EditNumber label="Expected headcount" value={edit.expected_headcount} onChange={v => setEdit(e => ({ ...e, expected_headcount: v }))} onBlur={commit} />
          <EditNumber label="Distance (miles)" value={edit.distance_miles} onChange={v => setEdit(e => ({ ...e, distance_miles: v }))} onBlur={commit} />
          <EditField label="Distance note" value={edit.distance_note} onChange={v => setEdit(e => ({ ...e, distance_note: v }))} onBlur={commit} />
          <EditField label="Contact name" value={edit.contact_name} onChange={v => setEdit(e => ({ ...e, contact_name: v }))} onBlur={commit} />
          <EditField label="Contact email" value={edit.contact_email} onChange={v => setEdit(e => ({ ...e, contact_email: v }))} onBlur={commit} />
          <EditField label="Contact phone" value={edit.contact_phone} onChange={v => setEdit(e => ({ ...e, contact_phone: v }))} onBlur={commit} />
          <EditField label="Website" value={edit.website_url} onChange={v => setEdit(e => ({ ...e, website_url: v }))} onBlur={commit} />
          <EditNumber label="Deposit ($)" value={edit.deposit_amount} onChange={v => setEdit(e => ({ ...e, deposit_amount: v }))} onBlur={commit} />
          <EditField label="Deposit due" type="date" value={edit.deposit_due} onChange={v => setEdit(e => ({ ...e, deposit_due: v }))} onBlur={commit} />
          <EditField label="Balance due" type="date" value={edit.balance_due} onChange={v => setEdit(e => ({ ...e, balance_due: v }))} onBlur={commit} />
          <EditCheck label="In Extras Budget doc" value={edit.in_extras_budget}
            onChange={v => { setEdit(e => ({ ...e, in_extras_budget: v })); onUpdate(venue.id, { in_extras_budget: v }) }} />

          <div style={{ gridColumn: '1 / -1' }}>
            <EditField label="Vibe" value={edit.vibe} multiline onChange={v => setEdit(e => ({ ...e, vibe: v }))} onBlur={commit} />
          </div>
          <EditField label="Pros" value={edit.pros} multiline onChange={v => setEdit(e => ({ ...e, pros: v }))} onBlur={commit} />
          <EditField label="Cons" value={edit.cons} multiline onChange={v => setEdit(e => ({ ...e, cons: v }))} onBlur={commit} />

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 14, alignItems: 'flex-end', padding: '8px 0', borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <EditCheck label="Parents covering" value={edit.parents_covering}
              onChange={v => { setEdit(e => ({ ...e, parents_covering: v })); onUpdate(venue.id, { parents_covering: v }) }} />
            <div style={{ width: 140 }}>
              <EditNumber label="Amount ($)" value={edit.parents_amount} disabled={!edit.parents_covering}
                onChange={v => setEdit(e => ({ ...e, parents_amount: v }))} onBlur={commit} />
            </div>
            <div style={{ width: 160 }}>
              <EditSelect label="Which side" value={edit.parents_side} options={PARENT_SIDES} labels={PARENT_SIDE_LABEL}
                disabled={!edit.parents_covering} onChange={v => { setEdit(e => ({ ...e, parents_side: v })); onUpdate(venue.id, { parents_side: v || null }) }} />
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <EditField label="Notes" value={edit.notes} multiline onChange={v => setEdit(e => ({ ...e, notes: v }))} onBlur={commit} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => onDelete(venue.id)} style={{
              background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)',
              borderRadius: 6, padding: '4px 10px', fontFamily: 'DM Sans', fontSize: 11, cursor: 'pointer',
            }}>Remove candidate</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ItineraryRow({ row, venues, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [edit, setEdit] = useState(row)
  useEffect(() => { setEdit(row) }, [row])

  function commit() {
    const patch = {}
    const fields = [
      'day', 'start_time', 'end_time', 'title', 'venue_id', 'location_text', 'distance_note',
      'audience', 'dress_code', 'cost_estimate', 'status', 'notes', 'category', 'parents_amount', 'parents_side',
    ]
    for (const f of fields) {
      if (edit[f] !== row[f]) patch[f] = edit[f] === '' ? null : edit[f]
    }
    if (Object.keys(patch).length > 0) onUpdate(row.id, patch)
  }

  const venue = venues.find(v => v.id === row.venue_id)

  return (
    <div className="card-gatsby" style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontFamily: 'Playfair Display', fontSize: 17, color: 'var(--text)' }}>{row.title}</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {row.start_time ? row.start_time.slice(0, 5) : 'Time TBD'}
            {row.end_time ? `–${row.end_time.slice(0, 5)}` : ''}
            {(venue?.name || row.location_text) && ` · ${venue?.name || row.location_text}`}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text)' }}>
            {row.cost_estimate != null ? formatUsd(row.cost_estimate) : '—'}
          </span>
          {row.audience && (
            <span style={{ fontFamily: 'DM Sans', fontSize: 10, color: 'var(--text-muted)' }}>{AUDIENCE_LABEL[row.audience]}</span>
          )}
        </div>
      </div>

      <button onClick={() => setExpanded(e => !e)} style={{
        background: 'transparent', border: '1px solid var(--gold-border)', color: 'var(--gold)',
        borderRadius: 6, padding: '4px 10px', fontFamily: 'DM Sans', fontSize: 11, cursor: 'pointer', marginTop: 10,
      }}>{expanded ? 'Close' : 'Edit'}</button>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <EditField label="Title" value={edit.title} onChange={v => setEdit(e => ({ ...e, title: v }))} onBlur={commit} />
          <EditField label="Day" type="date" value={edit.day} onChange={v => setEdit(e => ({ ...e, day: v }))} onBlur={commit} />
          <EditField label="Start time" type="time" value={edit.start_time} onChange={v => setEdit(e => ({ ...e, start_time: v }))} onBlur={commit} />
          <EditField label="End time" type="time" value={edit.end_time} onChange={v => setEdit(e => ({ ...e, end_time: v }))} onBlur={commit} />
          <EditSelect label="Venue (from candidates)" value={edit.venue_id} options={venues.map(v => v.id)} labels={Object.fromEntries(venues.map(v => [v.id, v.name]))}
            onChange={v => { const vid = v === '' ? null : Number(v); setEdit(e => ({ ...e, venue_id: vid })); onUpdate(row.id, { venue_id: vid }) }} />
          <EditField label="Location text" value={edit.location_text} onChange={v => setEdit(e => ({ ...e, location_text: v }))} onBlur={commit} />
          <EditField label="Distance note" value={edit.distance_note} onChange={v => setEdit(e => ({ ...e, distance_note: v }))} onBlur={commit} />
          <EditSelect label="Audience" value={edit.audience} options={AUDIENCES} labels={AUDIENCE_LABEL}
            onChange={v => { setEdit(e => ({ ...e, audience: v })); onUpdate(row.id, { audience: v || null }) }} />
          <EditField label="Dress code" value={edit.dress_code} onChange={v => setEdit(e => ({ ...e, dress_code: v }))} onBlur={commit} />
          <EditNumber label="Cost estimate ($)" value={edit.cost_estimate} onChange={v => setEdit(e => ({ ...e, cost_estimate: v }))} onBlur={commit} />
          <EditSelect label="Status" value={edit.status} options={['idea', 'planned', 'confirmed']} labels={{ idea: 'Idea', planned: 'Planned', confirmed: 'Confirmed' }}
            onChange={v => { setEdit(e => ({ ...e, status: v })); onUpdate(row.id, { status: v }) }} />
          <EditSelect label="Category" value={edit.category} options={BUDGET_CATEGORIES.map(c => c.key)} labels={Object.fromEntries(BUDGET_CATEGORIES.map(c => [c.key, c.label]))}
            onChange={v => { setEdit(e => ({ ...e, category: v })); onUpdate(row.id, { category: v || null }) }} />

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 14, alignItems: 'flex-end', padding: '8px 0', borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <EditCheck label="Parents covering" value={edit.parents_covering}
              onChange={v => { setEdit(e => ({ ...e, parents_covering: v })); onUpdate(row.id, { parents_covering: v }) }} />
            <div style={{ width: 140 }}>
              <EditNumber label="Amount ($)" value={edit.parents_amount} disabled={!edit.parents_covering}
                onChange={v => setEdit(e => ({ ...e, parents_amount: v }))} onBlur={commit} />
            </div>
            <div style={{ width: 160 }}>
              <EditSelect label="Which side" value={edit.parents_side} options={PARENT_SIDES} labels={PARENT_SIDE_LABEL}
                disabled={!edit.parents_covering} onChange={v => { setEdit(e => ({ ...e, parents_side: v })); onUpdate(row.id, { parents_side: v || null }) }} />
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <EditField label="Notes" value={edit.notes} multiline onChange={v => setEdit(e => ({ ...e, notes: v }))} onBlur={commit} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => onDelete(row.id)} style={{
              background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)',
              borderRadius: 6, padding: '4px 10px', fontFamily: 'DM Sans', fontSize: 11, cursor: 'pointer',
            }}>Remove item</button>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, color = 'var(--text)' }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Playfair Display', fontSize: 22, color }}>{value}</div>
    </div>
  )
}

export default function Weekend() {
  const [venues, setVenues] = useState([])
  const [itinerary, setItinerary] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('venues')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [v, i] = await Promise.all([fetchWeekendVenues(), fetchWeekendItinerary()])
        if (cancelled) return
        setVenues(v)
        setItinerary(i)
      } catch (e) {
        if (!cancelled) setError(e.message)
      }
      if (!cancelled) setLoading(false)
    }
    load()

    const ch1 = supabase.channel('weekend-venues-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekend_venues' },
        async () => { const v = await fetchWeekendVenues(); if (!cancelled) setVenues(v) })
      .subscribe()
    const ch2 = supabase.channel('weekend-itinerary-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekend_itinerary' },
        async () => { const i = await fetchWeekendItinerary(); if (!cancelled) setItinerary(i) })
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  }, [])

  async function updateVenue(id, patch) {
    setVenues(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v))
    const { error } = await supabase.from('weekend_venues').update(patch).eq('id', id)
    if (error) setError(`Update failed: ${error.message}`)
  }

  async function deleteVenue(id) {
    if (!confirm('Remove this venue candidate?')) return
    const prev = venues
    setVenues(v => v.filter(x => x.id !== id))
    const { error } = await supabase.from('weekend_venues').delete().eq('id', id)
    if (error) { setError(`Delete failed: ${error.message}`); setVenues(prev) }
  }

  async function addVenue(eventType) {
    const row = { event_type: eventType, name: 'New candidate', status: 'sourcing' }
    const { data, error } = await supabase.from('weekend_venues').insert(row).select().single()
    if (error) setError(`Insert failed: ${error.message}`)
    else if (data) setVenues(v => [...v, data])
  }

  async function updateItinerary(id, patch) {
    setItinerary(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    const { error } = await supabase.from('weekend_itinerary').update(patch).eq('id', id)
    if (error) setError(`Update failed: ${error.message}`)
  }

  async function deleteItinerary(id) {
    if (!confirm('Remove this itinerary item?')) return
    const prev = itinerary
    setItinerary(r => r.filter(x => x.id !== id))
    const { error } = await supabase.from('weekend_itinerary').delete().eq('id', id)
    if (error) { setError(`Delete failed: ${error.message}`); setItinerary(prev) }
  }

  async function addItinerary() {
    const row = { title: 'New item', status: 'idea' }
    const { data, error } = await supabase.from('weekend_itinerary').insert(row).select().single()
    if (error) setError(`Insert failed: ${error.message}`)
    else if (data) setItinerary(r => [...r, data])
  }

  const venueGroups = useMemo(() => {
    const groups = Object.fromEntries(EVENT_TYPES.map(t => [t, []]))
    for (const v of venues) (groups[v.event_type] ||= []).push(v)
    return groups
  }, [venues])

  const dayGroups = useMemo(() => {
    const groups = {}
    for (const r of itinerary) {
      const key = r.day || 'tbd'
      ;(groups[key] ||= []).push(r)
    }
    return Object.entries(groups).sort(([a], [b]) => (a === 'tbd' ? 1 : b === 'tbd' ? -1 : a.localeCompare(b)))
  }, [itinerary])

  const weekendSpend = useMemo(() => computeWeekendSpend(venues, itinerary), [venues, itinerary])
  const venueCommitments = useMemo(() => computeWeekendVenueCommitments(venues), [venues])

  const byCategory = useMemo(() => computeBudgetByCategory({ weekend: weekendSpend.rows }), [weekendSpend])
  const categorySegments = byCategory.categories.map(c => ({
    key: c.category, label: categoryLabel(c.category), color: categoryColor(c.category), value: c.total,
  }))
  const payerSegments = [
    { key: 'parents', label: 'Parents covering', color: 'var(--gold)', value: weekendSpend.parents },
    { key: 'couple', label: 'Out of pocket', color: 'var(--teal)', value: weekendSpend.couple },
  ]

  if (loading) {
    return (
      <div style={{ background: 'var(--dark)', minHeight: 'calc(100vh - 56px)', padding: 32 }}>
        <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>Loading weekend hub...</div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--dark)', minHeight: 'calc(100vh - 56px)', padding: '24px 24px 64px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--gold)', textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: 4 }}>
            Wed 3/24 – Sun 3/28, 2027
          </div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Wedding Weekend Hub</h1>
          <div className="deco-divider" style={{ maxWidth: 220, marginTop: 6 }}>◆</div>
        </div>

        {error && (
          <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: 'rgba(224, 112, 112, 0.10)', color: 'var(--red)', fontFamily: 'DM Sans', fontSize: 12 }}>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>dismiss</button>
          </div>
        )}

        {/* Weekend spend summary */}
        <div className="card-gatsby" style={{ padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 16 }}>
            <MiniStat label="Weekend projected total" value={formatUsd(weekendSpend.total)} color="var(--gold)" />
            <MiniStat label="Parents covering" value={formatUsd(weekendSpend.parents)} />
            <MiniStat label="Out of pocket" value={formatUsd(weekendSpend.couple)} />
          </div>

          <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: 6 }}>
            By vendor type
          </div>
          <BudgetStackedBar segments={categorySegments} formatValue={formatUsd} />

          <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Sans', margin: '16px 0 6px' }}>
            Who's paying
          </div>
          <BudgetStackedBar segments={payerSegments} formatValue={formatUsd} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'inline-flex', border: '1px solid var(--gold-border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          {[['venues', 'Venue Tracker'], ['itinerary', 'Itinerary']].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              background: tab === k ? 'var(--gold)' : 'transparent',
              color: tab === k ? 'var(--card)' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer', padding: '8px 16px',
              fontFamily: 'DM Sans', fontSize: 12, fontWeight: tab === k ? 600 : 400,
            }}>{label}</button>
          ))}
        </div>

        {tab === 'venues' && (
          <div>
            {EVENT_TYPES.map(type => {
              const list = venueGroups[type] || []
              const commit = venueCommitments.rows.find(r => r.event_type === type)
              return (
                <div key={type} style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'Playfair Display', color: 'var(--text)' }}>{EVENT_LABEL[type]}</h2>
                    {commit && <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)' }}>~{formatUsd(commit.cost)}</span>}
                    <div style={{ flex: 1 }} />
                    <button onClick={() => addVenue(type)} style={{
                      background: 'transparent', border: '1px solid var(--gold-border)', color: 'var(--gold)',
                      borderRadius: 6, padding: '4px 10px', fontFamily: 'DM Sans', fontSize: 11, cursor: 'pointer',
                    }}>+ Candidate</button>
                  </div>
                  {list.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                      {list.map(v => <VenueCard key={v.id} venue={v} onUpdate={updateVenue} onDelete={deleteVenue} />)}
                    </div>
                  ) : (
                    <div style={{ padding: 16, color: 'var(--text-dim)', fontFamily: 'DM Sans', fontSize: 12, border: '1px dashed var(--border)', borderRadius: 8 }}>
                      No candidates yet.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'itinerary' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button onClick={addItinerary} style={{
                background: 'transparent', border: '1px solid var(--gold-border)', color: 'var(--gold)',
                borderRadius: 6, padding: '6px 12px', fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer',
              }}>+ Itinerary item</button>
            </div>
            {dayGroups.map(([day, rows]) => (
              <div key={day} style={{ marginBottom: 24 }}>
                <h2 style={{ margin: '0 0 10px', fontSize: 16, fontFamily: 'Playfair Display', color: 'var(--gold)' }}>
                  {day === 'tbd' ? 'Date TBD' : fmtDate(day)}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {rows.map(r => (
                    <ItineraryRow key={r.id} row={r} venues={venues} onUpdate={updateItinerary} onDelete={deleteItinerary} />
                  ))}
                </div>
              </div>
            ))}
            {dayGroups.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'DM Sans', fontSize: 13 }}>
                No itinerary items yet.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
