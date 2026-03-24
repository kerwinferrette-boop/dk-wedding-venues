import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, USERS } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'locked', label: 'Locked In', color: '#22c55e', desc: 'Definite yes' },
  { id: 'bubble', label: 'The Bubble', color: '#f59e0b', desc: 'Likely' },
  { id: 'squad', label: 'Practice Squad', color: '#64748b', desc: 'Maybe' },
]

const EST_PP = 185 // rough per-person placeholder

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGuest(name, status, addedBy) {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    status,
    plusOne: false,
    addedBy,
    createdAt: new Date().toISOString(),
  }
}

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem('wos_guests') || '[]')
  } catch {
    return []
  }
}

function saveLocal(guests) {
  localStorage.setItem('wos_guests', JSON.stringify(guests))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ on, onChange, color }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: on ? color : 'var(--border)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 18 : 2,
          width: 16,
          height: 16,
          background: '#fff',
          borderRadius: '50%',
          transition: 'left 0.2s',
          display: 'block',
        }}
      />
    </button>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span
        style={{
          fontSize: '0.6rem',
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 1,
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '1.1rem',
          color,
          fontFamily: 'Playfair Display, serif',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function GuestCard({ guest, globalPlusOne, colColor, onTogglePlusOne, onRemove, onDragStart, onDragEnd }) {
  const showPlus = globalPlusOne || guest.plusOne
  const addedByMeta = USERS[guest.addedBy]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '9px 12px',
        marginBottom: 6,
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        userSelect: 'none',
      }}
    >
      {/* Drag handle */}
      <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', lineHeight: 1, flexShrink: 0, marginRight: 2 }}>⠿</span>

      {/* Name + added-by dot */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '0.875rem',
            color: 'var(--text)',
            fontFamily: 'DM Sans, sans-serif',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {guest.name}
        </div>
        {addedByMeta && (
          <div style={{ fontSize: '0.65rem', color: addedByMeta.color, marginTop: 1, fontFamily: 'DM Sans, sans-serif' }}>
            added by {addedByMeta.label}
          </div>
        )}
      </div>

      {/* +1 badge */}
      {showPlus && (
        <span
          style={{
            fontSize: '0.65rem',
            color: colColor,
            background: `${colColor}18`,
            padding: '1px 5px',
            borderRadius: 99,
            fontFamily: 'DM Sans, sans-serif',
            flexShrink: 0,
          }}
        >
          +1
        </span>
      )}

      {/* +1 toggle */}
      <button
        onClick={onTogglePlusOne}
        title={guest.plusOne ? 'Remove +1' : 'Add +1'}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.75rem',
          color: guest.plusOne ? colColor : 'var(--text-dim)',
          padding: '2px 3px',
          fontFamily: 'DM Sans, sans-serif',
          flexShrink: 0,
          opacity: globalPlusOne ? 0.3 : 1,
        }}
        disabled={globalPlusOne}
      >
        +1
      </button>

      {/* Remove */}
      <button
        onClick={onRemove}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1rem',
          color: 'var(--text-dim)',
          padding: '0 2px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </motion.div>
  )
}

function Column({ col, guests, globalPlusOne, userMeta, addingTo, setAddingTo, newName, setNewName, inputRef, onAdd, onTogglePlusOne, onRemove, onDragStart, onDragEnd, dragOver, onDragOver, onDrop, onDragLeave }) {
  const isDragTarget = dragOver === col.id
  const colGuests = guests.filter(g => g.status === col.id)

  return (
    <div
      onDragOver={e => onDragOver(e, col.id)}
      onDrop={() => onDrop(col.id)}
      onDragLeave={onDragLeave}
      style={{
        background: isDragTarget ? `${col.color}08` : 'var(--card)',
        border: `1px solid ${isDragTarget ? col.color + '55' : 'var(--border)'}`,
        borderRadius: 12,
        padding: 14,
        minHeight: 300,
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: col.color,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '0.9rem',
              color: 'var(--text)',
            }}
          >
            {col.label}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}>
            {col.desc}
          </div>
        </div>
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
            background: '#ffffff10',
            padding: '2px 8px',
            borderRadius: 99,
          }}
        >
          {colGuests.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ flex: 1 }}>
        <AnimatePresence>
          {colGuests.map(g => (
            <GuestCard
              key={g.id}
              guest={g}
              globalPlusOne={globalPlusOne}
              colColor={col.color}
              onTogglePlusOne={() => onTogglePlusOne(g.id)}
              onRemove={() => onRemove(g.id)}
              onDragStart={() => onDragStart(g.id)}
              onDragEnd={onDragEnd}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Add input or button */}
      {addingTo === col.id ? (
        <div style={{ marginTop: 4 }}>
          <input
            ref={inputRef}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onAdd()
              if (e.key === 'Escape') { setAddingTo(null); setNewName('') }
            }}
            placeholder="Guest name…"
            style={{
              width: '100%',
              background: 'var(--dark)',
              border: `1px solid ${userMeta.color}`,
              borderRadius: 8,
              padding: '8px 12px',
              color: 'var(--text)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.875rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button
              onClick={onAdd}
              style={{
                flex: 1,
                background: userMeta.color,
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '7px 0',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Add
            </button>
            <button
              onClick={() => { setAddingTo(null); setNewName('') }}
              style={{
                background: 'none',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '7px 12px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingTo(col.id)}
          style={{
            width: '100%',
            marginTop: 6,
            background: 'none',
            border: '1px dashed var(--border)',
            borderRadius: 8,
            padding: '8px 0',
            color: 'var(--text-dim)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = col.color; e.currentTarget.style.color = col.color }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)' }}
        >
          + Add guest
        </button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Guests({ user, onSwitchUser }) {
  const navigate = useNavigate()
  const userMeta = USERS[user]

  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingTo, setAddingTo] = useState(null)
  const [newName, setNewName] = useState('')
  const [globalPlusOne, setGlobalPlusOne] = useState(false)
  const [draggingId, setDraggingId] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const inputRef = useRef(null)

  // Focus input when adding
  useEffect(() => {
    if (addingTo) inputRef.current?.focus()
  }, [addingTo])

  // Load guests
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('guests')
          .select('*')
          .order('created_at', { ascending: true })
        if (error) throw error
        const mapped = data.map(r => ({
          id: r.id,
          name: r.name,
          status: r.status,
          plusOne: r.plus_one,
          addedBy: r.added_by,
          createdAt: r.created_at,
        }))
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
        supabase
          .from('guests')
          .select('*')
          .order('created_at', { ascending: true })
          .then(({ data }) => {
            if (data) {
              const mapped = data.map(r => ({
                id: r.id,
                name: r.name,
                status: r.status,
                plusOne: r.plus_one,
                addedBy: r.added_by,
                createdAt: r.created_at,
              }))
              setGuests(mapped)
              saveLocal(mapped)
            }
          })
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  // ─── Mutations ──────────────────────────────────────────────────────────────

  async function persist(updated) {
    setGuests(updated)
    saveLocal(updated)
  }

  async function addGuest() {
    if (!newName.trim()) return
    const g = makeGuest(newName, addingTo, user)
    const updated = [...guests, g]
    persist(updated)
    setNewName('')
    setAddingTo(null)
    try {
      await supabase.from('guests').insert({
        id: g.id,
        name: g.name,
        status: g.status,
        plus_one: g.plusOne,
        added_by: g.addedBy,
      })
    } catch {}
  }

  async function removeGuest(id) {
    persist(guests.filter(g => g.id !== id))
    try { await supabase.from('guests').delete().eq('id', id) } catch {}
  }

  async function togglePlusOne(id) {
    const updated = guests.map(g => g.id === id ? { ...g, plusOne: !g.plusOne } : g)
    persist(updated)
    const g = updated.find(g => g.id === id)
    try { await supabase.from('guests').update({ plus_one: g.plusOne }).eq('id', id) } catch {}
  }

  async function moveGuest(id, newStatus) {
    const updated = guests.map(g => g.id === id ? { ...g, status: newStatus } : g)
    persist(updated)
    try { await supabase.from('guests').update({ status: newStatus }).eq('id', id) } catch {}
  }

  // ─── Drag ───────────────────────────────────────────────────────────────────

  function onDragOver(e, colId) {
    e.preventDefault()
    if (dragOver !== colId) setDragOver(colId)
  }

  function onDrop(colId) {
    if (draggingId) moveGuest(draggingId, colId)
    setDraggingId(null)
    setDragOver(null)
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const locked = guests.filter(g => g.status === 'locked')
  const lockedHeads = locked.reduce((acc, g) => acc + 1 + (globalPlusOne || g.plusOne ? 1 : 0), 0)
  const totalGuests = guests.length
  const fmt = n => `$${(n / 1000).toFixed(0)}k`

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--dark)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            border: `2px solid ${userMeta.color}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', fontFamily: 'DM Sans, sans-serif' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#111',
          borderBottom: '1px solid var(--border)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 18,
            padding: '0 4px',
            display: 'flex',
            alignItems: 'center',
            lineHeight: 1,
          }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.2rem',
              color: 'var(--text)',
              margin: 0,
            }}
          >
            Guest Draft Board
          </h1>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {totalGuests} names · {locked.length} locked
          </p>
        </div>
        <button
          onClick={onSwitchUser}
          style={{
            background: `${userMeta.color}22`,
            color: userMeta.color,
            border: `1px solid ${userMeta.color}44`,
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          {userMeta.label}
        </button>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#111',
          borderBottom: '1px solid var(--border)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          flexWrap: 'wrap',
        }}
      >
        <StatPill label="Locked headcount" value={lockedHeads} color={userMeta.color} />
        <StatPill label="Est. locked cost" value={fmt(lockedHeads * EST_PP)} color={userMeta.color} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Global +1</span>
          <Toggle on={globalPlusOne} onChange={() => setGlobalPlusOne(p => !p)} color={userMeta.color} />
        </div>
      </div>

      {/* ── Board ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          padding: '20px',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        {COLUMNS.map(col => (
          <Column
            key={col.id}
            col={col}
            guests={guests}
            globalPlusOne={globalPlusOne}
            userMeta={userMeta}
            addingTo={addingTo}
            setAddingTo={setAddingTo}
            newName={newName}
            setNewName={setNewName}
            inputRef={inputRef}
            onAdd={addGuest}
            onTogglePlusOne={togglePlusOne}
            onRemove={removeGuest}
            onDragStart={id => setDraggingId(id)}
            onDragEnd={() => { setDraggingId(null); setDragOver(null) }}
            dragOver={dragOver}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragLeave={() => setDragOver(null)}
          />
        ))}
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 640px) {
          .guest-board-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
