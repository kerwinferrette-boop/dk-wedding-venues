import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx'
import { supabase, USERS } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS = { best_man: 'BM', groomsman: 'GM' }
const ROLE_COLORS = { best_man: '#A51C30', groomsman: '#2D6A4F' }

const BOOL_COLS = [
  { key: 'plusOne',             label: '+1',          short: '+1'  },
  { key: 'hasMetDani',          label: 'Met Dani',    short: 'MD'  },
  { key: 'plansToMeet',         label: 'Plans Meet',  short: 'PM'  },
  { key: 'invitedEngagement',   label: 'Eng. Invite', short: 'EI'  },
  { key: 'engagementPlusOne',   label: 'Eng. +1',     short: 'E+1' },
  { key: 'goingEngagement',     label: 'Going Eng.',  short: 'GE'  },
]

const TEXT_COLS = [
  { key: 'knowFrom',  label: 'Know From', width: 130 },
  { key: 'residence', label: 'City',      width: 110 },
]

// XLSX column header → field key mapping (case-insensitive)
const XLSX_MAP = {
  'names':                        'name',
  'name':                         'name',
  'best man':                     'role:best_man',
  'groomsmen':                    'role:groomsman',
  'groomsman':                    'role:groomsman',
  'plus one':                     'plusOne',
  '+1':                           'plusOne',
  'know from:':                   'knowFrom',
  'know from':                    'knowFrom',
  'has met dani':                 'hasMetDani',
  'place of residence':           'residence',
  'residence':                    'residence',
  'city':                         'residence',
  'plans to meet dani':           'plansToMeet',
  'plans to meet':                'plansToMeet',
  'invited to engagement party':  'invitedEngagement',
  'engagement party +1':          'engagementPlusOne',
  'engagement +1':                'engagementPlusOne',
  'going to engagement party':    'goingEngagement',
  'going to engagement':          'goingEngagement',
  'notes':                        'notes',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toBool(v) {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v === 1
  if (typeof v === 'string') return ['true', 'yes', '1', 'x', '✓'].includes(v.toLowerCase().trim())
  return false
}

function makeGuest(fields, addedBy) {
  return {
    id: crypto.randomUUID(),
    name: (fields.name || '').trim(),
    status: fields.role ? 'locked' : (fields.status || 'bubble'),
    plusOne: false,
    addedBy,
    role: fields.role || null,
    knowFrom: fields.knowFrom || '',
    hasMetDani: fields.hasMetDani || false,
    residence: fields.residence || '',
    plansToMeet: fields.plansToMeet || false,
    invitedEngagement: fields.invitedEngagement || false,
    engagementPlusOne: fields.engagementPlusOne || false,
    goingEngagement: fields.goingEngagement || false,
    notes: fields.notes || '',
    rsvp: null,
    createdAt: new Date().toISOString(),
  }
}

function dbToGuest(r) {
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    plusOne: r.plus_one,
    addedBy: r.added_by,
    role: r.role || null,
    knowFrom: r.know_from || '',
    hasMetDani: r.has_met_dani || false,
    residence: r.residence || '',
    plansToMeet: r.plans_to_meet || false,
    invitedEngagement: r.invited_engagement || false,
    engagementPlusOne: r.engagement_plus_one || false,
    goingEngagement: r.going_engagement || false,
    notes: r.notes || '',
    rsvp: r.rsvp || null,
    createdAt: r.created_at,
  }
}

function guestToDb(g) {
  return {
    id: g.id,
    name: g.name,
    status: g.status,
    plus_one: g.plusOne,
    added_by: g.addedBy,
    role: g.role,
    know_from: g.knowFrom,
    has_met_dani: g.hasMetDani,
    residence: g.residence,
    plans_to_meet: g.plansToMeet,
    invited_engagement: g.invitedEngagement,
    engagement_plus_one: g.engagementPlusOne,
    going_engagement: g.goingEngagement,
    notes: g.notes,
    rsvp: g.rsvp,
  }
}

function loadLocal() {
  try { return JSON.parse(localStorage.getItem('wos_guests') || '[]') } catch { return [] }
}
function saveLocal(guests) {
  localStorage.setItem('wos_guests', JSON.stringify(guests))
}

function parseXLSX(buffer, addedBy) {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
  if (!rows.length) return []

  const headers = rows[0].map(h => String(h || '').trim())
  const dataRows = rows.slice(1)

  return dataRows.map(row => {
    const fields = {}
    headers.forEach((h, i) => {
      const mapped = XLSX_MAP[h.toLowerCase()]
      if (!mapped) return
      const val = row[i]
      if (mapped.startsWith('role:')) {
        if (toBool(val)) fields.role = mapped.split(':')[1]
      } else if (['plusOne','hasMetDani','plansToMeet','invitedEngagement','engagementPlusOne','goingEngagement'].includes(mapped)) {
        fields[mapped] = toBool(val)
      } else {
        fields[mapped] = val != null ? String(val).trim() : ''
      }
    })
    if (!fields.name) return null
    return makeGuest(fields, addedBy)
  }).filter(Boolean)
}

function parseCSV(text, addedBy) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (!lines.length) return []
  const firstLower = lines[0].toLowerCase()
  const hasHeader = firstLower.includes('name') || firstLower.includes('guest')
  const dataLines = hasHeader ? lines.slice(1) : lines
  return dataLines.map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
    if (!cols[0]) return null
    return makeGuest({ name: cols[0], status: cols[1] || 'bubble' }, addedBy)
  }).filter(Boolean)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CheckCell({ value, onChange, color }) {
  return (
    <td
      onClick={onChange}
      style={{
        textAlign: 'center',
        cursor: 'pointer',
        padding: '0 4px',
        width: 44,
        fontSize: '0.85rem',
        color: value ? color : 'var(--border)',
        transition: 'color 0.15s',
        userSelect: 'none',
      }}
      title={value ? 'Click to uncheck' : 'Click to check'}
    >
      {value ? '✓' : '·'}
    </td>
  )
}

function TextCell({ value, onChange, width }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  function commit() {
    setEditing(false)
    if (draft !== value) onChange(draft)
  }

  if (editing) {
    return (
      <td style={{ padding: '2px 6px', width }}>
        <input
          ref={ref}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
          style={{
            width: '100%',
            background: 'var(--dark)',
            border: '1px solid var(--accent)',
            borderRadius: 4,
            padding: '3px 6px',
            color: 'var(--text)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.8rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </td>
    )
  }

  return (
    <td
      onClick={() => setEditing(true)}
      style={{
        padding: '0 8px',
        width,
        fontSize: '0.8rem',
        color: value ? 'var(--text)' : 'var(--border)',
        cursor: 'text',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: width,
      }}
    >
      {value || '—'}
    </td>
  )
}

function ExpandedRow({ guest, colSpan, userMeta, onUpdate, onRemove }) {
  const [notes, setNotes] = useState(guest.notes || '')

  function saveNotes() {
    if (notes !== guest.notes) onUpdate({ notes })
  }

  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0 }}>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            background: `${userMeta.color}08`,
            borderLeft: `3px solid ${userMeta.color}`,
            padding: '12px 20px',
            display: 'flex',
            gap: 24,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 4, fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes</div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Add notes…"
              rows={2}
              style={{
                width: '100%',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '6px 10px',
                color: 'var(--text)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.8rem',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'locked', label: 'Locked In',       color: '#22c55e' },
                { id: 'bubble', label: 'The Bubble',      color: '#f59e0b' },
                { id: 'squad',  label: 'Practice Squad',  color: '#64748b' },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => onUpdate({ status: s.id })}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 99,
                    border: `1px solid ${guest.status === s.id ? s.color : 'var(--border)'}`,
                    background: guest.status === s.id ? `${s.color}22` : 'none',
                    color: guest.status === s.id ? s.color : 'var(--text-dim)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    transition: 'all 0.15s',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Role</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { id: 'best_man',   label: 'Best Man'  },
                { id: 'groomsman',  label: 'Groomsman' },
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => onUpdate({ role: guest.role === r.id ? null : r.id })}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 99,
                    border: `1px solid ${guest.role === r.id ? '#A51C30' : 'var(--border)'}`,
                    background: guest.role === r.id ? '#A51C3022' : 'none',
                    color: guest.role === r.id ? '#A51C30' : 'var(--text-dim)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    transition: 'all 0.15s',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onRemove}
            style={{
              marginLeft: 'auto',
              alignSelf: 'flex-start',
              background: 'none',
              border: '1px solid #ef444440',
              borderRadius: 6,
              padding: '5px 12px',
              color: '#ef4444',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Remove guest
          </button>
        </motion.div>
      </td>
    </tr>
  )
}

function GuestRow({ guest, userMeta, onToggleBool, onUpdateText, onUpdate, onRemove, isExpanded, onToggleExpand }) {
  const addedByMeta = USERS[guest.addedBy]
  const totalCols = 2 + BOOL_COLS.length + TEXT_COLS.length + 1 // name + status + bools + texts + expand

  return (
    <>
      <tr
        style={{
          borderBottom: '1px solid var(--border)',
          background: isExpanded ? `${userMeta.color}06` : 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'var(--card)' }}
        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}
      >
        {/* Name cell */}
        <td
          style={{
            padding: '10px 12px',
            minWidth: 160,
            position: 'sticky',
            left: 0,
            background: isExpanded ? `${userMeta.color}06` : 'var(--dark)',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {/* Added-by stripe */}
            <span style={{ width: 3, height: 28, borderRadius: 2, background: addedByMeta?.color || 'var(--border)', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {guest.name}
                </span>
                {guest.role && (
                  <span style={{
                    fontSize: '0.6rem',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 700,
                    color: '#fff',
                    background: ROLE_COLORS[guest.role] || '#A51C30',
                    padding: '1px 5px',
                    borderRadius: 3,
                    letterSpacing: '0.05em',
                    flexShrink: 0,
                  }}>
                    {ROLE_LABELS[guest.role]}
                  </span>
                )}
                {!guest.hasMetDani && (
                  <span title="Hasn't met Dani yet" style={{ fontSize: '0.65rem', color: '#f59e0b', flexShrink: 0 }}>★</span>
                )}
              </div>
              <div style={{ fontSize: '0.62rem', color: addedByMeta?.color || 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', marginTop: 1 }}>
                {addedByMeta?.label || guest.addedBy}
              </div>
            </div>
          </div>
        </td>

        {/* Status cell */}
        <td style={{ padding: '0 8px', width: 100 }}>
          <span style={{
            fontSize: '0.7rem',
            fontFamily: 'DM Sans, sans-serif',
            color: guest.status === 'locked' ? '#22c55e' : guest.status === 'bubble' ? '#f59e0b' : '#64748b',
            background: guest.status === 'locked' ? '#22c55e18' : guest.status === 'bubble' ? '#f59e0b18' : '#64748b18',
            padding: '2px 8px',
            borderRadius: 99,
            whiteSpace: 'nowrap',
          }}>
            {guest.status === 'locked' ? 'Locked In' : guest.status === 'bubble' ? 'Bubble' : 'Squad'}
          </span>
        </td>

        {/* Boolean columns */}
        {BOOL_COLS.map(col => (
          <CheckCell
            key={col.key}
            value={guest[col.key]}
            onChange={() => onToggleBool(guest.id, col.key)}
            color={userMeta.color}
          />
        ))}

        {/* Text columns */}
        {TEXT_COLS.map(col => (
          <TextCell
            key={col.key}
            value={guest[col.key]}
            onChange={val => onUpdateText(guest.id, col.key, val)}
            width={col.width}
          />
        ))}

        {/* Expand toggle */}
        <td style={{ width: 32, textAlign: 'center', padding: '0 4px' }}>
          <button
            onClick={() => onToggleExpand(guest.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isExpanded ? userMeta.color : 'var(--text-dim)',
              fontSize: '0.7rem',
              padding: 4,
              lineHeight: 1,
              transition: 'color 0.15s, transform 0.15s',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▾
          </button>
        </td>
      </tr>

      <AnimatePresence>
        {isExpanded && (
          <ExpandedRow
            key={`exp-${guest.id}`}
            guest={guest}
            colSpan={totalCols}
            userMeta={userMeta}
            onUpdate={fields => onUpdate(guest.id, fields)}
            onRemove={() => onRemove(guest.id)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function SectionHeader({ label, count, plusOnes, kCount, dCount, colSpan }) {
  const kPct = count > 0 ? Math.round((kCount / count) * 100) : 50
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          padding: '12px 16px 8px',
          background: 'var(--dark)',
          position: 'sticky',
          left: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.9rem', color: 'var(--text)' }}>
            {label}
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {count} guest{count !== 1 ? 's' : ''}{plusOnes > 0 ? ` · ${count - plusOnes} + ${plusOnes} (+1s)` : ''}
          </span>
          {/* K/D bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.7rem', color: '#A51C30', fontFamily: 'DM Sans, sans-serif' }}>K {kCount}</span>
            <div style={{ width: 80, height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ width: `${kPct}%`, height: '100%', background: '#A51C30', borderRadius: 99, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: '0.7rem', color: '#2D6A4F', fontFamily: 'DM Sans, sans-serif' }}>D {dCount}</span>
          </div>
        </div>
      </td>
    </tr>
  )
}

function AddGuestRow({ user, userMeta, onAdd, colSpan }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const ref = useRef(null)

  useEffect(() => { if (open) ref.current?.focus() }, [open])

  function submit() {
    if (!name.trim()) return
    onAdd(name.trim())
    setName('')
    setOpen(false)
  }

  if (!open) {
    return (
      <tr>
        <td colSpan={colSpan} style={{ padding: '6px 12px' }}>
          <button
            onClick={() => setOpen(true)}
            style={{
              background: 'none',
              border: '1px dashed var(--border)',
              borderRadius: 7,
              padding: '7px 16px',
              color: 'var(--text-dim)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              transition: 'border-color 0.15s, color 0.15s',
              width: '100%',
              textAlign: 'left',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = userMeta.color; e.currentTarget.style.color = userMeta.color }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)' }}
          >
            + Add guest to {userMeta.label}'s list
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: '6px 12px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={ref}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setOpen(false); setName('') } }}
            placeholder="Guest name…"
            style={{
              flex: 1,
              background: 'var(--card)',
              border: `1px solid ${userMeta.color}`,
              borderRadius: 7,
              padding: '7px 12px',
              color: 'var(--text)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          <button onClick={submit} style={{ background: userMeta.color, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Add</button>
          <button onClick={() => { setOpen(false); setName('') }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 12px', color: 'var(--text-dim)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>×</button>
        </div>
      </td>
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Guests({ user }) {
  const userMeta = USERS[user]

  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef(null)

  // Load
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase.from('guests').select('*').order('created_at', { ascending: true })
        if (error) throw error
        const mapped = data.map(dbToGuest)
        setGuests(mapped)
        saveLocal(mapped)
      } catch {
        setGuests(loadLocal())
      }
      setLoading(false)
    }
    load()
  }, [])

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel('guests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, () => {
        supabase.from('guests').select('*').order('created_at', { ascending: true }).then(({ data }) => {
          if (data) { const m = data.map(dbToGuest); setGuests(m); saveLocal(m) }
        })
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  // ─── Mutations ──────────────────────────────────────────────────────────────

  function optimistic(updated) { setGuests(updated); saveLocal(updated) }

  async function addGuest(name, addedBy = user) {
    const g = makeGuest({ name }, addedBy)
    setGuests(prev => { const updated = [...prev, g]; saveLocal(updated); return updated })
    try {
      await supabase.from('guests').insert(guestToDb(g))
    } catch (err) {
      console.error('addGuest error:', err)
    }
  }

  async function removeGuest(id) {
    optimistic(guests.filter(g => g.id !== id))
    setExpanded(null)
    try { await supabase.from('guests').delete().eq('id', id) } catch {}
  }

  async function toggleBool(id, field) {
    const dbField = {
      plusOne: 'plus_one', hasMetDani: 'has_met_dani', plansToMeet: 'plans_to_meet',
      invitedEngagement: 'invited_engagement', engagementPlusOne: 'engagement_plus_one', goingEngagement: 'going_engagement',
    }[field]
    const updated = guests.map(g => g.id === id ? { ...g, [field]: !g[field] } : g)
    optimistic(updated)
    const g = updated.find(g => g.id === id)
    try { await supabase.from('guests').update({ [dbField]: g[field] }).eq('id', id) } catch {}
  }

  async function updateText(id, field, val) {
    const dbField = { knowFrom: 'know_from', residence: 'residence' }[field]
    optimistic(guests.map(g => g.id === id ? { ...g, [field]: val } : g))
    try { await supabase.from('guests').update({ [dbField]: val }).eq('id', id) } catch {}
  }

  async function updateGuest(id, fields) {
    const dbFields = {}
    const mapping = {
      status: 'status', role: 'role', notes: 'notes',
      plusOne: 'plus_one', hasMetDani: 'has_met_dani',
      plansToMeet: 'plans_to_meet', invitedEngagement: 'invited_engagement',
      engagementPlusOne: 'engagement_plus_one', goingEngagement: 'going_engagement',
      knowFrom: 'know_from', residence: 'residence', rsvp: 'rsvp',
    }
    Object.entries(fields).forEach(([k, v]) => { if (mapping[k]) dbFields[mapping[k]] = v })
    optimistic(guests.map(g => g.id === id ? { ...g, ...fields } : g))
    try { await supabase.from('guests').update(dbFields).eq('id', id) } catch (err) {
      console.error('updateGuest error:', err)
    }
  }

  // ─── Import ─────────────────────────────────────────────────────────────────

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)

    try {
      let newGuests = []
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buf = await file.arrayBuffer()
        newGuests = parseXLSX(new Uint8Array(buf), user)
      } else {
        const text = await file.text()
        newGuests = parseCSV(text, user)
      }

      if (!newGuests.length) { setImporting(false); return }
      const updated = [...guests, ...newGuests]
      optimistic(updated)
      await supabase.from('guests').insert(newGuests.map(guestToDb))
    } catch (err) {
      console.error('Import failed:', err)
    }
    setImporting(false)
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────

  const kGuests = guests.filter(g => g.addedBy === 'kerwin')
  const dGuests = guests.filter(g => g.addedBy === 'dani')
  const totalHeads = guests.reduce((acc, g) => acc + 1 + (g.plusOne ? 1 : 0), 0)
  const plusOnes = guests.filter(g => g.plusOne).length

  // ─── Table columns count ─────────────────────────────────────────────────────

  const totalCols = 2 + BOOL_COLS.length + TEXT_COLS.length + 1

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: `2px solid ${userMeta.color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--dark)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 20px',
        position: 'sticky',
        top: 56,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', color: 'var(--text)', margin: 0 }}>
            Guest Draft Board
          </h1>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {guests.length} names · {totalHeads} heads total · {plusOnes} +1s
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {importing && <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Importing…</span>}
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 7,
              padding: '5px 12px',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = userMeta.color; e.currentTarget.style.color = userMeta.color }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            ↑ Import XLSX / CSV
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,text/csv" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 1, fontFamily: 'DM Sans, sans-serif' }}>Total Guests</span>
          <span style={{ fontSize: '1.1rem', color: userMeta.color, fontFamily: 'Playfair Display, serif' }}>{guests.length}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 1, fontFamily: 'DM Sans, sans-serif' }}>Total Heads</span>
          <span style={{ fontSize: '1.1rem', color: userMeta.color, fontFamily: 'Playfair Display, serif' }}>{totalHeads}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 1, fontFamily: 'DM Sans, sans-serif' }}>+1s</span>
          <span style={{ fontSize: '1.1rem', color: userMeta.color, fontFamily: 'Playfair Display, serif' }}>{plusOnes}</span>
        </div>
        {/* K/D bar */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.75rem', color: '#A51C30', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>K {kGuests.length}</span>
          <div style={{ width: 100, height: 8, borderRadius: 99, background: 'var(--border)', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${guests.length > 0 ? (kGuests.length / guests.length) * 100 : 50}%`, background: '#A51C30', transition: 'width 0.3s' }} />
            <div style={{ flex: 1, background: '#2D6A4F', transition: 'flex 0.3s' }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: '#2D6A4F', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>D {dGuests.length}</span>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto', padding: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>

          {/* Sticky column headers */}
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{
                textAlign: 'left',
                padding: '8px 12px',
                fontSize: '0.65rem',
                color: 'var(--text-dim)',
                fontFamily: 'DM Sans, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
                position: 'sticky',
                left: 0,
                background: 'var(--dark)',
                zIndex: 3,
                minWidth: 160,
              }}>
                Name
              </th>
              <th style={{ padding: '8px 8px', fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, width: 100, whiteSpace: 'nowrap' }}>Status</th>
              {BOOL_COLS.map(col => (
                <th key={col.key} style={{ padding: '8px 4px', fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, width: 44, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {col.short}
                </th>
              ))}
              {TEXT_COLS.map(col => (
                <th key={col.key} style={{ padding: '8px 8px', fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, width: col.width, textAlign: 'left' }}>
                  {col.label}
                </th>
              ))}
              <th style={{ width: 32 }} />
            </tr>
          </thead>

          <tbody>
            {/* Kerwin's section */}
            <SectionHeader
              label="Kerwin's Guests"
              count={kGuests.length}
              plusOnes={kGuests.filter(g => g.plusOne).length}
              kCount={kGuests.length}
              dCount={0}
              colSpan={totalCols}
            />
            <AnimatePresence>
              {kGuests.map(g => (
                <GuestRow
                  key={g.id}
                  guest={g}
                  userMeta={USERS.kerwin}
                  onToggleBool={toggleBool}
                  onUpdateText={updateText}
                  onUpdate={updateGuest}
                  onRemove={removeGuest}
                  isExpanded={expanded === g.id}
                  onToggleExpand={id => setExpanded(expanded === id ? null : id)}
                />
              ))}
            </AnimatePresence>
            <AddGuestRow user="kerwin" userMeta={USERS.kerwin} onAdd={addGuest} colSpan={totalCols} />

            {/* Spacer */}
            <tr><td colSpan={totalCols} style={{ height: 24 }} /></tr>

            {/* Dani's section */}
            <SectionHeader
              label="Dani's Guests"
              count={dGuests.length}
              plusOnes={dGuests.filter(g => g.plusOne).length}
              kCount={0}
              dCount={dGuests.length}
              colSpan={totalCols}
            />
            <AnimatePresence>
              {dGuests.map(g => (
                <GuestRow
                  key={g.id}
                  guest={g}
                  userMeta={USERS.dani}
                  onToggleBool={toggleBool}
                  onUpdateText={updateText}
                  onUpdate={updateGuest}
                  onRemove={removeGuest}
                  isExpanded={expanded === g.id}
                  onToggleExpand={id => setExpanded(expanded === id ? null : id)}
                />
              ))}
            </AnimatePresence>
            <AddGuestRow user="dani" userMeta={USERS.dani} onAdd={name => addGuest(name, 'dani')} colSpan={totalCols} />

            {/* Unassigned guests (imported without addedBy) */}
            {guests.filter(g => g.addedBy !== 'kerwin' && g.addedBy !== 'dani').length > 0 && (
              <>
                <tr><td colSpan={totalCols} style={{ height: 24 }} /></tr>
                <SectionHeader
                  label="Unassigned"
                  count={guests.filter(g => g.addedBy !== 'kerwin' && g.addedBy !== 'dani').length}
                  plusOnes={guests.filter(g => g.addedBy !== 'kerwin' && g.addedBy !== 'dani' && g.plusOne).length}
                  kCount={0}
                  dCount={0}
                  colSpan={totalCols}
                />
                <AnimatePresence>
                  {guests.filter(g => g.addedBy !== 'kerwin' && g.addedBy !== 'dani').map(g => (
                    <GuestRow
                      key={g.id}
                      guest={g}
                      userMeta={userMeta}
                      onToggleBool={toggleBool}
                      onUpdateText={updateText}
                      onUpdate={updateGuest}
                      onRemove={removeGuest}
                      isExpanded={expanded === g.id}
                      onToggleExpand={id => setExpanded(expanded === id ? null : id)}
                    />
                  ))}
                </AnimatePresence>
              </>
            )}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
