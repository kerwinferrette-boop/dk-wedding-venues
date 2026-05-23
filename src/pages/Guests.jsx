// Guest list - execution-phase cutdown manager.
//
// Goal: 200 -> 170 (La Valencia cap). This page lets us:
//   - See the full list with the columns from our Google Sheet
//     (side, know_from, has_met_dani, plans_to_meet, rsvp, notes)
//   - Mark guests as "cut candidate" -> live count adjusts
//   - Filter by side / rsvp / cut-candidate / met-dani
//   - Import from .xlsx (the Google Sheet export)
//   - Edit inline; writes flow back to Supabase
//
// IDs are auto-assigned by Postgres (bigint identity); we do NOT generate
// client-side UUIDs on insert.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1JUtOiOq7kjNoVB8JEGysWZ7lm-TpVVlzEvnPNb6Q4z8/edit?gid=0#gid=0'
const TARGET_CAP = 170

const SIDES = ['kerwin', 'dani', 'both', 'other']
const RSVPS = ['yes', 'no', 'maybe', 'pending']

function toBool(v) {
  if (v == null) return false
  if (typeof v === 'boolean') return v
  const s = String(v).trim().toLowerCase()
  return s === 'true' || s === 'yes' || s === 'y' || s === '1' || s === 'x' || s === '✓'
}

// Header name -> guests column name. Loose matching: lowercased + trimmed.
const COLUMN_ALIASES = {
  'name': 'name',
  'guest': 'name',
  'guest name': 'name',
  'side': 'side',
  'whose side': 'side',
  'know from': 'know_from',
  'how do we know': 'know_from',
  'has met dani': 'has_met_dani',
  'met dani': 'has_met_dani',
  'plans to meet': 'plans_to_meet',
  'plans to meet dani': 'plans_to_meet',
  'plus one': 'plus_one',
  'plus 1': 'plus_one',
  '+1': 'plus_one',
  'residence': 'residence',
  'city': 'residence',
  'where do they live': 'residence',
  'rsvp': 'rsvp',
  'email': 'email',
  'phone': 'phone',
  'notes': 'notes',
  'invited engagement': 'invited_engagement',
  'engagement plus one': 'engagement_plus_one',
  'going engagement': 'going_engagement',
}

const BOOLEAN_COLS = new Set([
  'has_met_dani', 'plans_to_meet', 'plus_one', 'cut_candidate',
  'invited_engagement', 'engagement_plus_one', 'going_engagement',
])

function normalizeRsvp(v) {
  if (!v) return null
  const s = String(v).trim().toLowerCase()
  if (['yes', 'y', 'going', 'attending', 'accepted'].includes(s)) return 'yes'
  if (['no', 'n', 'declined', 'not going'].includes(s)) return 'no'
  if (['maybe', 'tentative'].includes(s)) return 'maybe'
  return 'pending'
}

function normalizeSide(v) {
  if (!v) return null
  const s = String(v).trim().toLowerCase()
  if (['kerwin', 'k', 'groom'].includes(s)) return 'kerwin'
  if (['dani', 'd', 'bride'].includes(s)) return 'dani'
  if (['both', 'shared', 'mutual'].includes(s)) return 'both'
  return 'other'
}

function parseGuestsXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  if (!rows.length) return []

  const headers = rows[0].map(h => (h ? String(h).trim().toLowerCase() : ''))
  const dataRows = rows.slice(1)

  return dataRows.map(row => {
    const g = {}
    headers.forEach((h, i) => {
      const col = COLUMN_ALIASES[h]
      if (!col) return
      let val = row[i]
      if (val == null || val === '') return
      if (BOOLEAN_COLS.has(col)) g[col] = toBool(val)
      else if (col === 'rsvp') g[col] = normalizeRsvp(val)
      else if (col === 'side') g[col] = normalizeSide(val)
      else g[col] = String(val).trim()
    })
    if (!g.name) return null
    return g
  }).filter(Boolean)
}

function Pill({ label, value, color = 'var(--text)', sub }) {
  return (
    <div className="card-gatsby" style={{ padding: '12px 16px', minWidth: 120 }}>
      <div style={{
        fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-muted)',
        textTransform: 'uppercase', fontFamily: 'DM Sans',
      }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Playfair Display', fontSize: 24, color, marginTop: 2, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Sans', marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function Check({ checked, onToggle, color = 'var(--green)' }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 18, height: 18, borderRadius: 4,
        border: `1.5px solid ${checked ? color : 'var(--gold-border)'}`,
        background: checked ? color : 'transparent',
        color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: 1,
        cursor: 'pointer', padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
      title={checked ? 'Uncheck' : 'Check'}
    >
      {checked ? '✓' : ''}
    </button>
  )
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      style={{
        background: 'transparent', border: '1px solid var(--gold-border)',
        borderRadius: 6, padding: '4px 8px', fontFamily: 'DM Sans',
        fontSize: 12, color: 'var(--text)', cursor: 'pointer',
      }}
    >
      <option value="">{placeholder || '—'}</option>
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

function InlineText({ value, onChange, placeholder, width = 140 }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const ref = useRef(null)
  useEffect(() => { setDraft(value || '') }, [value])
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  function commit() {
    setEditing(false)
    if (draft !== (value || '')) onChange(draft || null)
  }

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        style={{
          background: 'transparent', border: '1px solid var(--gold-border)',
          borderRadius: 4, padding: '2px 6px', fontFamily: 'DM Sans', fontSize: 12,
          color: 'var(--text)', width,
        }}
      />
    )
  }
  return (
    <button
      onClick={() => setEditing(true)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'DM Sans', fontSize: 12,
        color: value ? 'var(--text)' : 'var(--text-dim)',
        padding: '2px 4px', textAlign: 'left', width,
      }}
      title="Click to edit"
    >
      {value || placeholder || '—'}
    </button>
  )
}

export default function Guests() {
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)

  const [filterSide, setFilterSide] = useState('')
  const [filterRsvp, setFilterRsvp] = useState('')
  const [filterCut, setFilterCut] = useState('')   // '', 'cut', 'keep'
  const [search, setSearch] = useState('')

  const fileInputRef = useRef(null)

  // Load guests + subscribe.
  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (error) setError(error.message)
      else setGuests(data || [])
      setLoading(false)
    }
    load()

    const ch = supabase
      .channel('guests-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' },
        async () => {
          const { data } = await supabase.from('guests').select('*').order('created_at')
          if (!cancelled) setGuests(data || [])
        })
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(ch) }
  }, [])

  const stats = useMemo(() => {
    const total = guests.length
    const cut = guests.filter(g => g.cut_candidate).length
    const kept = total - cut
    const rsvpYes = guests.filter(g => g.rsvp === 'yes').length
    const rsvpNo = guests.filter(g => g.rsvp === 'no').length
    const rsvpMaybe = guests.filter(g => g.rsvp === 'maybe').length
    const rsvpPending = total - rsvpYes - rsvpNo - rsvpMaybe
    return { total, cut, kept, rsvpYes, rsvpNo, rsvpMaybe, rsvpPending }
  }, [guests])

  const filtered = useMemo(() => {
    return guests.filter(g => {
      if (filterSide && g.side !== filterSide) return false
      if (filterRsvp && (g.rsvp || 'pending') !== filterRsvp) return false
      if (filterCut === 'cut' && !g.cut_candidate) return false
      if (filterCut === 'keep' && g.cut_candidate) return false
      if (search) {
        const s = search.toLowerCase()
        const hay = `${g.name || ''} ${g.know_from || ''} ${g.residence || ''} ${g.notes || ''}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [guests, filterSide, filterRsvp, filterCut, search])

  async function update(id, patch) {
    setGuests(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g))
    const { error } = await supabase.from('guests').update(patch).eq('id', id)
    if (error) {
      setError(`Update failed: ${error.message}`)
    }
  }

  async function deleteGuest(id) {
    if (!confirm('Remove this guest from the list?')) return
    const prev = guests
    setGuests(g => g.filter(x => x.id !== id))
    const { error } = await supabase.from('guests').delete().eq('id', id)
    if (error) {
      setError(`Delete failed: ${error.message}`)
      setGuests(prev)
    }
  }

  async function addBlank() {
    const blank = {
      name: 'New guest',
      status: 'bubble',
      side: null,
      rsvp: null,
      cut_candidate: false,
    }
    const { data, error } = await supabase.from('guests').insert(blank).select().single()
    if (error) setError(`Insert failed: ${error.message}`)
    else if (data) setGuests(g => [...g, data])
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const parsed = parseGuestsXlsx(buffer)
      if (!parsed.length) {
        setError('No rows parsed from the file.')
        return
      }
      // Skip rows whose name already exists (case-insensitive).
      const existing = new Set(guests.map(g => (g.name || '').trim().toLowerCase()))
      const toInsert = parsed.filter(g => !existing.has(g.name.toLowerCase()))
      if (!toInsert.length) {
        setError(`Parsed ${parsed.length} rows; all names already on the list.`)
        return
      }
      const { data, error } = await supabase.from('guests').insert(toInsert).select()
      if (error) setError(`Import failed: ${error.message}`)
      else setGuests(g => [...g, ...(data || [])])
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const overTarget = stats.kept - TARGET_CAP

  if (loading) {
    return (
      <div style={{ background: 'var(--dark)', minHeight: 'calc(100vh - 56px)', padding: 32 }}>
        <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>Loading guests...</div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--dark)', minHeight: 'calc(100vh - 56px)', padding: '24px 24px 64px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11, letterSpacing: '0.18em', color: 'var(--gold)',
            textTransform: 'uppercase', fontFamily: 'DM Sans', marginBottom: 4,
          }}>
            200 → 170 cutdown
          </div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Guest list</h1>
          <div className="deco-divider" style={{ maxWidth: 220, marginTop: 6 }}>◆</div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <Pill
            label="On list"
            value={stats.total}
            sub={`${stats.kept} keep · ${stats.cut} cut`}
          />
          <Pill
            label="Toward cap"
            value={stats.kept}
            color={overTarget > 0 ? 'var(--red)' : 'var(--green)'}
            sub={overTarget > 0
              ? `${overTarget} over ${TARGET_CAP}`
              : `${Math.abs(overTarget)} under ${TARGET_CAP}`}
          />
          <Pill label="Yes" value={stats.rsvpYes} color="var(--green)" />
          <Pill label="Maybe" value={stats.rsvpMaybe} color="var(--yellow)" />
          <Pill label="No" value={stats.rsvpNo} color="var(--red)" />
          <Pill label="Pending" value={stats.rsvpPending} />
        </div>

        {/* Actions row */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16,
        }}>
          <input
            placeholder="Search name / city / how we know..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: '1 1 240px', minWidth: 200, background: 'var(--card)',
              border: '1px solid var(--gold-border)', borderRadius: 8,
              padding: '8px 12px', fontFamily: 'DM Sans', fontSize: 13,
              color: 'var(--text)',
            }}
          />
          <Select value={filterSide} onChange={setFilterSide} options={SIDES} placeholder="All sides" />
          <Select value={filterRsvp} onChange={setFilterRsvp} options={RSVPS} placeholder="Any rsvp" />
          <Select value={filterCut} onChange={setFilterCut} options={['cut', 'keep']} placeholder="Cut status" />

          <div style={{ flex: 1 }} />

          <a
            href={GOOGLE_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'transparent', border: '1px solid var(--gold-border)',
              color: 'var(--gold)', borderRadius: 8, padding: '8px 12px',
              fontFamily: 'DM Sans', fontSize: 12, textDecoration: 'none',
              letterSpacing: '0.04em',
            }}
          >
            Open Google Sheet ↗
          </a>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            style={{
              background: 'transparent', border: '1px solid var(--gold-border)',
              color: 'var(--gold)', borderRadius: 8, padding: '8px 12px',
              fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer',
            }}
          >
            {importing ? 'Importing...' : 'Import xlsx'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
          <button
            onClick={addBlank}
            style={{
              background: 'var(--gold)', border: 'none',
              color: 'var(--card)', borderRadius: 8, padding: '8px 12px',
              fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            + Add guest
          </button>
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
            >
              dismiss
            </button>
          </div>
        )}

        {/* Table */}
        <div className="card-gatsby" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontFamily: 'DM Sans', fontSize: 13,
            }}>
              <thead>
                <tr style={{
                  background: 'var(--dark2)',
                  borderBottom: '1px solid var(--gold-border)',
                }}>
                  <Th>Name</Th>
                  <Th center>Cut?</Th>
                  <Th>Side</Th>
                  <Th>Know from</Th>
                  <Th>Residence</Th>
                  <Th center>Met Dani</Th>
                  <Th center>Plans to</Th>
                  <Th center>+1</Th>
                  <Th>RSVP</Th>
                  <Th>Notes</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{
                      padding: 32, textAlign: 'center', color: 'var(--text-dim)',
                    }}>
                      {guests.length === 0
                        ? 'No guests yet. Import the .xlsx from your Google Sheet or add manually.'
                        : 'No matches for the current filters.'}
                    </td>
                  </tr>
                ) : filtered.map(g => (
                  <tr key={g.id} style={{
                    borderBottom: '1px solid var(--border)',
                    background: g.cut_candidate ? 'rgba(224, 112, 112, 0.05)' : 'transparent',
                    opacity: g.cut_candidate ? 0.7 : 1,
                  }}>
                    <td style={{ padding: '8px 10px' }}>
                      <InlineText
                        value={g.name}
                        onChange={(v) => update(g.id, { name: v })}
                        placeholder="name"
                        width={180}
                      />
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <Check
                        checked={!!g.cut_candidate}
                        onToggle={() => update(g.id, { cut_candidate: !g.cut_candidate })}
                        color="var(--red)"
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <Select
                        value={g.side}
                        onChange={(v) => update(g.id, { side: v })}
                        options={SIDES}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <InlineText
                        value={g.know_from}
                        onChange={(v) => update(g.id, { know_from: v })}
                        placeholder="—"
                        width={140}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <InlineText
                        value={g.residence}
                        onChange={(v) => update(g.id, { residence: v })}
                        placeholder="—"
                        width={120}
                      />
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <Check
                        checked={!!g.has_met_dani}
                        onToggle={() => update(g.id, { has_met_dani: !g.has_met_dani })}
                      />
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <Check
                        checked={!!g.plans_to_meet}
                        onToggle={() => update(g.id, { plans_to_meet: !g.plans_to_meet })}
                        color="var(--gold)"
                      />
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <Check
                        checked={!!g.plus_one}
                        onToggle={() => update(g.id, { plus_one: !g.plus_one })}
                        color="var(--teal)"
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <Select
                        value={g.rsvp}
                        onChange={(v) => update(g.id, { rsvp: v })}
                        options={RSVPS}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <InlineText
                        value={g.notes}
                        onChange={(v) => update(g.id, { notes: v })}
                        placeholder="—"
                        width={180}
                      />
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <button
                        onClick={() => deleteGuest(g.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-dim)', fontSize: 14, padding: 4,
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{
          marginTop: 10, fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Sans',
        }}>
          Showing {filtered.length} of {guests.length} · Edits save automatically · Live with the Google Sheet via import
        </div>
      </div>
    </div>
  )
}

function Th({ children, center = false }) {
  return (
    <th style={{
      textAlign: center ? 'center' : 'left',
      padding: '10px 10px',
      fontFamily: 'DM Sans',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.12em',
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </th>
  )
}
