// Timeline page — full CRUD for timeline_milestones + AI assistant panel.
// The AI panel is powered by the 12-month timeline builder skill prompt.

import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import AiPanel from '../components/AiPanel'

const TODAY = new Date()
const WEDDING = new Date('2027-03-27')

const SYSTEM_PROMPT = `You are a wedding planning timeline assistant for Dani & Kerwin's wedding on March 27, 2027 at La Valencia Hotel in La Jolla, CA. You help them stay on track with their 12-month planning timeline.

Your role:
- Track what milestones are overdue, due soon, or upcoming
- Suggest what to prioritize based on the current date and wedding date
- Help them think through dependencies (e.g., venue walkthrough should happen before final seating)
- Draft new milestones when asked
- Give concise, actionable advice — not generic wedding planning tips

Current context will be injected at the start of each conversation with the full milestone list and their statuses. Use that to give specific, not generic, answers.

Be warm but efficient. This is a real wedding with a real date. Help them execute, not just plan.`

const SUGGESTIONS = [
  'What\'s overdue right now?',
  'What should we focus on this month?',
  'What are the top 3 milestones before end of year?',
  'Help me plan the next 90 days',
]

function fmtDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return d }
}

function milestoneStatus(m) {
  if (m.status === 'done') return 'done'
  const due = m.due_date ? new Date(m.due_date) : null
  if (due && due < TODAY) return 'overdue'
  const monthsOut = due ? (due - TODAY) / (1000 * 60 * 60 * 24 * 30) : 99
  if (monthsOut <= 1) return 'soon'
  return 'pending'
}

const STATUS_COLOR = {
  done:    'var(--green)',
  overdue: 'var(--red)',
  soon:    'var(--gold)',
  pending: 'var(--text-muted)',
}

const FILTER_OPTIONS = ['All', 'Pending', 'Soon', 'Overdue', 'Done']

export default function Timeline() {
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [editing, setEditing] = useState({}) // id -> { name, due_date }
  const [adding, setAdding] = useState(false)
  const [newRow, setNewRow] = useState({ name: '', due_date: '', owner: '' })
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('timeline_milestones')
      .select('*')
      .order('due_date', { ascending: true })
    setMilestones(data || [])
    setLoading(false)
  }

  async function toggleDone(m) {
    const newStatus = m.status === 'done' ? 'pending' : 'done'
    setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, status: newStatus } : x))
    await supabase.from('timeline_milestones').update({ status: newStatus }).eq('id', m.id)
  }

  async function saveEdit(id) {
    const patch = editing[id]
    if (!patch) return
    setSavingId(id)
    await supabase.from('timeline_milestones').update(patch).eq('id', id)
    setMilestones(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x))
    setEditing(prev => { const n = { ...prev }; delete n[id]; return n })
    setSavingId(null)
  }

  async function deleteRow(id) {
    setMilestones(prev => prev.filter(x => x.id !== id))
    await supabase.from('timeline_milestones').delete().eq('id', id)
  }

  async function addMilestone() {
    if (!newRow.name.trim()) return
    const { data } = await supabase
      .from('timeline_milestones')
      .insert({ name: newRow.name.trim(), due_date: newRow.due_date || null, owner: newRow.owner || null, status: 'pending' })
      .select()
      .single()
    if (data) setMilestones(prev => [...prev, data].sort((a, b) => (a.due_date || '') > (b.due_date || '') ? 1 : -1))
    setNewRow({ name: '', due_date: '', owner: '' })
    setAdding(false)
  }

  const filtered = useMemo(() => {
    if (filter === 'All') return milestones
    return milestones.filter(m => {
      const s = milestoneStatus(m)
      if (filter === 'Done') return s === 'done'
      if (filter === 'Overdue') return s === 'overdue'
      if (filter === 'Soon') return s === 'soon'
      if (filter === 'Pending') return s === 'pending' || s === 'soon'
      return true
    })
  }, [milestones, filter])

  const aiContext = useMemo(() => {
    const daysLeft = Math.round((WEDDING - TODAY) / (1000 * 60 * 60 * 24))
    const lines = milestones.map(m => {
      const s = milestoneStatus(m)
      return `- [${s.toUpperCase()}] ${m.name}${m.due_date ? ` (due ${fmtDate(m.due_date)})` : ''}${m.owner ? ` — owner: ${m.owner}` : ''}`
    })
    return `Today: ${TODAY.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\nDays until wedding: ${daysLeft}\n\nAll milestones:\n${lines.join('\n')}`
  }, [milestones])

  const inputStyle = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '4px 8px',
    color: 'var(--text)',
    fontFamily: 'DM Sans',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* Data panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text)', fontFamily: 'Cinzel, Georgia, serif', letterSpacing: '0.06em' }}>
            Timeline
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Sans', marginTop: 4 }}>
            {Math.round((WEDDING - TODAY) / (1000 * 60 * 60 * 24))} days until D&K · March 27, 2027
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 12px',
                borderRadius: 999,
                border: `1px solid ${filter === f ? 'var(--gold)' : 'var(--border)'}`,
                background: filter === f ? 'var(--gold)' : 'transparent',
                color: filter === f ? '#fff' : 'var(--text-muted)',
                fontFamily: 'DM Sans',
                fontSize: 11,
                letterSpacing: '0.06em',
                cursor: 'pointer',
                fontWeight: filter === f ? 600 : 400,
              }}
            >
              {f}
            </button>
          ))}
          <button
            onClick={() => setAdding(true)}
            style={{
              marginLeft: 'auto',
              padding: '4px 14px',
              borderRadius: 999,
              border: '1px solid var(--gold)',
              background: 'transparent',
              color: 'var(--gold)',
              fontFamily: 'DM Sans',
              fontSize: 11,
              letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
          >
            + Add milestone
          </button>
        </div>

        {/* Add row */}
        {adding && (
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--gold)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 12,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}>
            <input
              style={{ ...inputStyle, flex: 2 }}
              placeholder="Milestone name"
              value={newRow.name}
              onChange={e => setNewRow(r => ({ ...r, name: e.target.value }))}
              autoFocus
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              type="date"
              value={newRow.due_date}
              onChange={e => setNewRow(r => ({ ...r, due_date: e.target.value }))}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Owner (optional)"
              value={newRow.owner}
              onChange={e => setNewRow(r => ({ ...r, owner: e.target.value }))}
            />
            <button
              onClick={addMilestone}
              style={{ padding: '5px 14px', background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 6, fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer' }}
            >
              Save
            </button>
            <button
              onClick={() => setAdding(false)}
              style={{ padding: '5px 10px', background: 'none', color: 'var(--text-muted)', border: 'none', fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Milestone list */}
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans', padding: '20px 0' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans', padding: '20px 0' }}>No milestones for this filter.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.map(m => {
              const status = milestoneStatus(m)
              const isEditing = !!editing[m.id]
              const editValues = editing[m.id] || {}

              return (
                <div
                  key={m.id}
                  style={{
                    background: 'var(--card)',
                    border: `1px solid ${status === 'overdue' ? 'var(--red)' : status === 'soon' ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
                    borderRadius: 10,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleDone(m)}
                    style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: `2px solid ${STATUS_COLOR[status]}`,
                      background: status === 'done' ? STATUS_COLOR[status] : 'transparent',
                      cursor: 'pointer', flexShrink: 0, padding: 0,
                    }}
                  />

                  {/* Name */}
                  <div style={{ flex: 2, minWidth: 0 }}>
                    {isEditing ? (
                      <input
                        style={{ ...inputStyle }}
                        value={editValues.name ?? m.name}
                        onChange={e => setEditing(prev => ({ ...prev, [m.id]: { ...prev[m.id], name: e.target.value } }))}
                        onBlur={() => saveEdit(m.id)}
                        autoFocus
                      />
                    ) : (
                      <span
                        style={{
                          fontFamily: 'DM Sans', fontSize: 14, color: status === 'done' ? 'var(--text-muted)' : 'var(--text)',
                          textDecoration: status === 'done' ? 'line-through' : 'none',
                          cursor: 'text',
                        }}
                        onDoubleClick={() => setEditing(prev => ({ ...prev, [m.id]: { name: m.name, due_date: m.due_date } }))}
                      >
                        {m.name}
                      </span>
                    )}
                  </div>

                  {/* Due date */}
                  <div style={{ flex: 1, minWidth: 110 }}>
                    {isEditing ? (
                      <input
                        type="date"
                        style={inputStyle}
                        value={editValues.due_date ?? m.due_date ?? ''}
                        onChange={e => setEditing(prev => ({ ...prev, [m.id]: { ...prev[m.id], due_date: e.target.value } }))}
                        onBlur={() => saveEdit(m.id)}
                      />
                    ) : (
                      <span
                        style={{ fontFamily: 'DM Sans', fontSize: 12, color: STATUS_COLOR[status], cursor: 'text' }}
                        onDoubleClick={() => setEditing(prev => ({ ...prev, [m.id]: { name: m.name, due_date: m.due_date } }))}
                      >
                        {fmtDate(m.due_date) || '—'}
                      </span>
                    )}
                  </div>

                  {/* Owner */}
                  {m.owner && (
                    <div style={{
                      padding: '2px 8px', borderRadius: 999,
                      background: 'var(--dark3)', color: 'var(--text-muted)',
                      fontFamily: 'DM Sans', fontSize: 10, letterSpacing: '0.06em',
                      textTransform: 'uppercase', flexShrink: 0,
                    }}>
                      {m.owner}
                    </div>
                  )}

                  {/* Status badge */}
                  {status !== 'pending' && (
                    <div style={{
                      padding: '2px 8px', borderRadius: 999, flexShrink: 0,
                      background: `${STATUS_COLOR[status]}22`,
                      color: STATUS_COLOR[status],
                      border: `1px solid ${STATUS_COLOR[status]}66`,
                      fontFamily: 'DM Sans', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      {status}
                    </div>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => deleteRow(m.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 14, padding: '0 2px', flexShrink: 0 }}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AI Panel */}
      <div style={{ padding: '28px 28px 28px 0', display: 'flex' }}>
        <AiPanel
          label="Timeline Assistant"
          systemPrompt={SYSTEM_PROMPT}
          context={aiContext}
          suggestions={SUGGESTIONS}
          placeholder="Ask about your timeline…"
        />
      </div>
    </div>
  )
}
