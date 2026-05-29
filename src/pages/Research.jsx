// Research page — per-vendor research notes + outreach drafts + AI assistant.
// Surfaces vendors with status: needed, sourcing, contacted.
// Research data stored in vendor_research table.

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import AiPanel from '../components/AiPanel'

const SYSTEM_PROMPT = `You are a wedding vendor researcher and outreach specialist for Dani & Kerwin's wedding on March 27, 2027 at La Valencia Hotel in La Jolla, CA.

Your role:
- Help research specific vendor types (florists, DJs, live musicians, photographers, content creators, cake bakers, etc.) in the San Diego / La Jolla area
- Draft professional, warm outreach emails to vendors — personalized to their specific style and offerings
- Compare vendors based on pricing, style, reviews, and availability
- Suggest questions to ask vendors during consultations
- Help evaluate quotes and proposals

Wedding style: Mediterranean Deco — warm, elegant, intimate. La Valencia is a historic Spanish-Mediterranean hotel on the cliffs of La Jolla. The vibe is sophisticated but personal, not stuffy.

Budget context: Total budget ~$150K. Venue (La Valencia) and catering are booked. Still need: florist, DJ, live musician, content creator, cake.

When drafting outreach emails:
- Keep them short (3-4 paragraphs)
- Be specific about the date, venue, and guest count (~150 guests)
- Mention the Mediterranean Deco aesthetic
- Ask for availability confirmation and a general price range
- Sign as Dani & Kerwin

Context with the selected vendor's details will be injected at the start.`

const SUGGESTIONS = [
  'Draft an inquiry email to this vendor',
  'What questions should I ask at a consultation?',
  'Research florists in La Jolla / San Diego',
  'Compare these vendor options for me',
]

const ACTIVE_STATUSES = ['needed', 'sourcing', 'contacted']

function prettyType(t) {
  return (t || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const STATUS_COLOR = {
  needed:      'var(--text-muted)',
  sourcing:    'var(--teal)',
  contacted:   'var(--gold)',
  shortlisted: 'var(--gold)',
  booked:      'var(--green)',
  passed:      'var(--red)',
}

export default function Research() {
  const [vendors, setVendors] = useState([])
  const [research, setResearch] = useState({}) // vendor_id -> { id, research_notes, outreach_draft }
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [vRes, rRes] = await Promise.all([
      supabase.from('vendor_pipeline').select('*').in('status', ACTIVE_STATUSES).order('vendor_type'),
      supabase.from('vendor_research').select('*'),
    ])
    setVendors(vRes.data || [])
    const map = {}
    for (const r of (rRes.data || [])) map[r.vendor_id] = r
    setResearch(map)
    setLoading(false)
  }

  const saveResearch = useCallback(async (vendorId, field, value) => {
    setSaving(vendorId)
    const existing = research[vendorId]
    if (existing) {
      await supabase.from('vendor_research').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', existing.id)
      setResearch(prev => ({ ...prev, [vendorId]: { ...prev[vendorId], [field]: value } }))
    } else {
      const { data } = await supabase.from('vendor_research').insert({ vendor_id: vendorId, [field]: value }).select().single()
      if (data) setResearch(prev => ({ ...prev, [vendorId]: data }))
    }
    setSaving(null)
  }, [research])

  const filtered = useMemo(() => {
    if (!search.trim()) return vendors
    const q = search.toLowerCase()
    return vendors.filter(v =>
      (v.name || '').toLowerCase().includes(q) ||
      (v.vendor_type || '').toLowerCase().includes(q)
    )
  }, [vendors, search])

  const aiContext = useMemo(() => {
    if (!selected) return null
    const v = vendors.find(x => x.id === selected)
    if (!v) return null
    const r = research[selected]
    return [
      `Vendor: ${v.name || 'Unknown'}`,
      `Type: ${prettyType(v.vendor_type)}`,
      `Status: ${v.status}`,
      v.contact_name && `Contact: ${v.contact_name}`,
      v.contact_email && `Email: ${v.contact_email}`,
      v.website && `Website: ${v.website}`,
      v.estimated_cost && `Estimated cost: $${v.estimated_cost.toLocaleString()}`,
      v.notes && `Notes: ${v.notes}`,
      r?.research_notes && `Research notes: ${r.research_notes}`,
      r?.outreach_draft && `Existing outreach draft: ${r.outreach_draft}`,
    ].filter(Boolean).join('\n')
  }, [selected, vendors, research])

  const textareaStyle = {
    width: '100%',
    background: 'var(--dark2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 10px',
    color: 'var(--text)',
    fontFamily: 'DM Sans',
    fontSize: 12,
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.5,
    minHeight: 80,
    boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* Data panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text)', fontFamily: 'Cinzel, Georgia, serif', letterSpacing: '0.06em' }}>
            Research
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Sans', marginTop: 4 }}>
            Vendor research notes &amp; outreach drafts
          </div>
        </div>

        {/* Search */}
        <input
          style={{
            width: '100%', maxWidth: 360, background: 'var(--card)',
            border: '1px solid var(--border)', borderRadius: 8,
            padding: '8px 12px', color: 'var(--text)', fontFamily: 'DM Sans',
            fontSize: 13, outline: 'none', marginBottom: 20, boxSizing: 'border-box',
          }}
          placeholder="Search vendors…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>No active vendors found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(v => {
              const r = research[v.id] || {}
              const isExpanded = expanded === v.id
              const isSelected = selected === v.id
              const statusColor = STATUS_COLOR[v.status] || 'var(--text-muted)'

              return (
                <div
                  key={v.id}
                  style={{
                    background: 'var(--card)',
                    border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                    borderRadius: 12,
                    overflow: 'hidden',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {/* Card header */}
                  <div
                    style={{
                      padding: '12px 16px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      const next = isExpanded ? null : v.id
                      setExpanded(next)
                      if (next) setSelected(next)
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                        {v.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unnamed {prettyType(v.vendor_type)}</span>}
                      </div>
                      <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {prettyType(v.vendor_type)}
                        {v.contact_email && <span style={{ marginLeft: 8, color: 'var(--text-dim)' }}>· {v.contact_email}</span>}
                      </div>
                    </div>

                    <span style={{
                      padding: '2px 8px', borderRadius: 999, flexShrink: 0,
                      background: `${statusColor}22`, color: statusColor,
                      border: `1px solid ${statusColor}66`,
                      fontFamily: 'DM Sans', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      {v.status}
                    </span>

                    {r.research_notes && (
                      <span style={{ fontSize: 10, color: 'var(--teal)', fontFamily: 'DM Sans' }}>has notes</span>
                    )}

                    <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Research notes */}
                        <div>
                          <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'DM Sans', marginBottom: 6 }}>
                            Research Notes
                          </div>
                          <textarea
                            style={textareaStyle}
                            placeholder="Add research notes, pricing info, links, impressions…"
                            defaultValue={r.research_notes || ''}
                            onBlur={e => saveResearch(v.id, 'research_notes', e.target.value)}
                          />
                        </div>

                        {/* Outreach draft */}
                        <div>
                          <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'DM Sans', marginBottom: 6 }}>
                            Outreach Draft
                          </div>
                          <textarea
                            style={{ ...textareaStyle, minHeight: 120 }}
                            placeholder="Outreach email draft (write manually or use AI →)"
                            defaultValue={r.outreach_draft || ''}
                            onBlur={e => saveResearch(v.id, 'outreach_draft', e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              setSelected(v.id)
                            }}
                            style={{
                              padding: '6px 14px',
                              background: 'var(--gold)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              fontFamily: 'DM Sans',
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            Draft outreach with AI →
                          </button>
                          {saving === v.id && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>Saving…</span>
                          )}
                          {v.contact_email && (
                            <a
                              href={`mailto:${v.contact_email}`}
                              style={{ fontSize: 11, color: 'var(--teal)', fontFamily: 'DM Sans' }}
                            >
                              Open email ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AI Panel */}
      <div style={{ padding: '28px 28px 28px 0', display: 'flex' }}>
        <AiPanel
          label="Vendor Research"
          systemPrompt={SYSTEM_PROMPT}
          context={aiContext}
          suggestions={SUGGESTIONS}
          placeholder="Research or draft outreach…"
        />
      </div>
    </div>
  )
}
