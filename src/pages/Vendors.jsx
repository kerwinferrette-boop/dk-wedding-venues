import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, USERS } from '../lib/supabase'

const TABS = [
  { id: 'music',        label: 'Music',        table: 'musicians',          icon: '🎵' },
  { id: 'catering',     label: 'Catering',      table: 'caterers',           icon: '🍽️' },
  { id: 'bar',          label: 'Bar',           table: 'bar_options',        icon: '🍾' },
  { id: 'cinema',       label: 'Cinema',        table: 'cinematographers',   icon: '🎬' },
  { id: 'florals',      label: 'Florals',       table: 'florists',           icon: '💐' },
  { id: 'extras',       label: 'Extras',        table: 'extras',             icon: '✨' },
  { id: 'rehearsal',    label: 'Rehearsal',     table: 'rehearsal_options',  icon: '🥂' },
]

const SEL_KEY = 'wos_vendor_selections'

function loadSelections() {
  try { return JSON.parse(localStorage.getItem(SEL_KEY) || '{}') } catch { return {} }
}
function saveSelections(sel) {
  localStorage.setItem(SEL_KEY, JSON.stringify(sel))
}

// ─── shared styles ────────────────────────────────────────────────────────────
const PAGE_STYLE = {
  minHeight: '100vh',
  background: 'var(--dark)',
  fontFamily: '"DM Sans", sans-serif',
  color: 'var(--text)',
}

const CARD_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '18px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

function Badge({ label, color = 'var(--text-dim)' }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
      background: color + '22', color, borderRadius: 6,
      padding: '2px 8px', whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function SelectBtn({ selected, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        marginTop: 'auto', padding: '8px 16px', borderRadius: 8,
        border: selected ? 'none' : '1px solid var(--border)',
        background: selected ? color : 'transparent',
        color: selected ? '#fff' : 'var(--text-muted)',
        fontFamily: '"DM Sans", sans-serif', fontWeight: 600, fontSize: 13,
        cursor: 'pointer', transition: 'all .15s',
      }}
    >{selected ? '✓ Selected' : 'Select'}</button>
  )
}

// ─── category card renderers ───────────────────────────────────────────────────

function MusicCard({ v, selected, color, onToggle }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...CARD_STYLE, outline: selected ? `2px solid ${color}` : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontFamily: '"Playfair Display", serif', fontSize: 17, fontWeight: 700 }}>{v.name}</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {v.category && <Badge label={v.category} color="#a78bfa" />}
          {v.hip_hop && <Badge label="Hip-Hop" color="#f59e0b" />}
        </div>
      </div>
      {v.price_estimate && (
        <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 14 }}>${v.price_estimate.toLocaleString()}</span>
      )}
      {(v.instagram_url || v.tiktok_url) && (
        <div style={{ display: 'flex', gap: 8 }}>
          {v.instagram_url && <a href={v.instagram_url} target="_blank" rel="noreferrer"
            style={{ color: 'var(--text-muted)', fontSize: 12, textDecoration: 'underline' }}>Instagram</a>}
          {v.tiktok_url && <a href={v.tiktok_url} target="_blank" rel="noreferrer"
            style={{ color: 'var(--text-muted)', fontSize: 12, textDecoration: 'underline' }}>TikTok</a>}
        </div>
      )}
      <SelectBtn selected={selected} color={color} onClick={onToggle} />
    </motion.div>
  )
}

function CateringCard({ v, selected, color, onToggle }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...CARD_STYLE, outline: selected ? `2px solid ${color}` : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontFamily: '"Playfair Display", serif', fontSize: 17, fontWeight: 700 }}>{v.name}</span>
        {v.status && <Badge label={v.status} color={v.status === 'booked' ? '#22c55e' : '#f59e0b'} />}
      </div>
      {v.cuisine && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{v.cuisine}</span>}
      {v.price_pp && (
        <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 14 }}>${v.price_pp} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>/ person</span></span>
      )}
      <SelectBtn selected={selected} color={color} onClick={onToggle} />
    </motion.div>
  )
}

function BarCard({ v, selected, color, onToggle }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...CARD_STYLE, outline: selected ? `2px solid ${color}` : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontFamily: '"Playfair Display", serif', fontSize: 17, fontWeight: 700 }}>{v.provider || v.name}</span>
        {v.open_bar && <Badge label="Open Bar" color="#a78bfa" />}
      </div>
      {v.price_pp && (
        <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 14 }}>${v.price_pp} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>/ person</span></span>
      )}
      <SelectBtn selected={selected} color={color} onClick={onToggle} />
    </motion.div>
  )
}

function CinemaCard({ v, selected, color, onToggle, locked, onLock }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...CARD_STYLE, outline: selected ? `2px solid ${color}` : 'none' }}>
      <span style={{ fontFamily: '"Playfair Display", serif', fontSize: 17, fontWeight: 700 }}>{v.name}</span>
      {v.price && (
        <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 14 }}>${v.price.toLocaleString()}</span>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {v.drone && <Badge label="Drone" color="#38bdf8" />}
        {v.highlight_reel && <Badge label="Highlight Reel" color="#a78bfa" />}
        {v.confessional && <Badge label="Confessional Cam" color="#f59e0b" />}
      </div>
      <SelectBtn selected={selected} color={color} onClick={onToggle} />
      <button
        onClick={onLock}
        style={{
          marginTop: 4, padding: '6px 14px', borderRadius: 8,
          border: `1px solid ${locked ? '#C9932A' : 'rgba(255,255,255,0.15)'}`,
          background: locked ? 'rgba(201,147,42,0.12)' : 'transparent',
          color: locked ? '#C9932A' : 'var(--text-muted)',
          fontFamily: '"DM Sans", sans-serif', fontWeight: 600, fontSize: 12,
          cursor: 'pointer',
        }}
      >
        {locked ? '🔒 Confirmed' : '🔓 Lock In'}
      </button>
    </motion.div>
  )
}

function FloralCard({ v, selected, color, onToggle }) {
  const includes = [
    v.includes_arch && 'Arch',
    v.includes_bouquet && 'Bouquet',
    v.includes_centerpieces && 'Centerpieces',
    v.includes_aisle && 'Aisle',
  ].filter(Boolean)

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...CARD_STYLE, outline: selected ? `2px solid ${color}` : 'none' }}>
      <span style={{ fontFamily: '"Playfair Display", serif', fontSize: 17, fontWeight: 700 }}>{v.name}</span>
      {v.price_estimate && (
        <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 14 }}>${v.price_estimate.toLocaleString()}</span>
      )}
      {v.style_tags && (
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{Array.isArray(v.style_tags) ? v.style_tags.join(', ') : v.style_tags}</span>
      )}
      {includes.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {includes.map(i => <Badge key={i} label={i} color="#f9a8d4" />)}
        </div>
      )}
      <SelectBtn selected={selected} color={color} onClick={onToggle} />
    </motion.div>
  )
}

function ExtrasCard({ v, selected, color, onToggle, multi }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...CARD_STYLE, outline: selected ? `2px solid ${color}` : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontFamily: '"Playfair Display", serif', fontSize: 17, fontWeight: 700 }}>{v.name}</span>
        {v.category && <Badge label={v.category} color="#a78bfa" />}
      </div>
      {v.price_estimate && (
        <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 14 }}>
          ${v.price_estimate.toLocaleString()}
          {v.pricing_type && <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> {v.pricing_type}</span>}
        </span>
      )}
      <button
        onClick={onToggle}
        style={{
          marginTop: 'auto', padding: '8px 16px', borderRadius: 8,
          border: selected ? 'none' : '1px solid var(--border)',
          background: selected ? color : 'transparent',
          color: selected ? '#fff' : 'var(--text-muted)',
          fontFamily: '"DM Sans", sans-serif', fontWeight: 600, fontSize: 13,
          cursor: 'pointer', transition: 'all .15s',
        }}
      >{selected ? '✓ Added' : '+ Add'}</button>
    </motion.div>
  )
}

function RehearsalCard({ v, selected, color, onToggle }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...CARD_STYLE, outline: selected ? `2px solid ${color}` : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontFamily: '"Playfair Display", serif', fontSize: 17, fontWeight: 700 }}>{v.name}</span>
        {v.private_room && <Badge label="Private Room" color="#22c55e" />}
      </div>
      {v.price_estimate && (
        <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 14 }}>${v.price_estimate.toLocaleString()}</span>
      )}
      <SelectBtn selected={selected} color={color} onClick={onToggle} />
    </motion.div>
  )
}

// ─── tab content ──────────────────────────────────────────────────────────────

function TabContent({ tab, data, loading, selections, onToggle, userColor, lockedCinemaId, onLockCinema }) {
  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>
    )
  }
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
        No options yet — add some to the <code style={{ background: 'var(--card)', padding: '2px 6px', borderRadius: 4 }}>{tab.table}</code> table.
      </div>
    )
  }

  const isMulti = tab.id === 'extras'
  const sel = selections[tab.id]

  const isSelected = (v) => {
    if (isMulti) return Array.isArray(sel) && sel.includes(v.id)
    return sel === v.id
  }

  const grid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
  }

  return (
    <motion.div style={grid} layout>
      {data.map(v => {
        const props = {
          key: v.id, v, selected: isSelected(v),
          color: userColor, onToggle: () => onToggle(tab.id, v.id, isMulti),
        }
        if (tab.id === 'music')     return <MusicCard    {...props} />
        if (tab.id === 'catering')  return <CateringCard {...props} />
        if (tab.id === 'bar')       return <BarCard      {...props} />
        if (tab.id === 'cinema')    return <CinemaCard   {...props} locked={lockedCinemaId === v.id} onLock={() => onLockCinema(v.id)} />
        if (tab.id === 'florals')   return <FloralCard   {...props} />
        if (tab.id === 'extras')    return <ExtrasCard   {...props} multi />
        if (tab.id === 'rehearsal') return <RehearsalCard {...props} />
        return null
      })}
    </motion.div>
  )
}

// ─── shared modal styles ─────────────────────────────────────────────────────

const MODAL_INPUT = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid var(--border)',
  background: 'var(--dark)', color: 'var(--text)',
  fontFamily: '"DM Sans", sans-serif', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
}
const MODAL_LABEL = {
  fontFamily: '"DM Sans", sans-serif', fontSize: 12,
  fontWeight: 600, color: 'var(--text-muted)',
  display: 'block', marginBottom: 4,
}

function buildVendorPayload(tabId, form) {
  if (tabId === 'music') return { name: form.name?.trim(), category: form.category || null, price_estimate: form.price_estimate ? Number(form.price_estimate) : null, hip_hop: !!form.hip_hop, instagram_url: form.instagram_url?.trim() || null, tiktok_url: form.tiktok_url?.trim() || null }
  if (tabId === 'catering') return { name: form.name?.trim(), cuisine: form.cuisine?.trim() || null, price_pp: form.price_pp ? Number(form.price_pp) : null, status: form.status || 'considering' }
  if (tabId === 'bar') return { provider: (form.provider || form.name)?.trim(), price_pp: form.price_pp ? Number(form.price_pp) : null, open_bar: !!form.open_bar }
  if (tabId === 'cinema') return { name: form.name?.trim(), price: form.price ? Number(form.price) : null, drone: !!form.drone, highlight_reel: !!form.highlight_reel, confessional: !!form.confessional }
  if (tabId === 'florals') { const tags = form.style_tags ? (Array.isArray(form.style_tags) ? form.style_tags : form.style_tags.split(',').map(t => t.trim()).filter(Boolean)) : null; return { name: form.name?.trim(), price_estimate: form.price_estimate ? Number(form.price_estimate) : null, style_tags: tags, includes_arch: !!form.includes_arch, includes_bouquet: !!form.includes_bouquet, includes_centerpieces: !!form.includes_centerpieces, includes_aisle: !!form.includes_aisle } }
  if (tabId === 'extras') return { name: form.name?.trim(), category: form.category?.trim() || null, price_estimate: form.price_estimate ? Number(form.price_estimate) : null, pricing_type: form.pricing_type || null }
  if (tabId === 'rehearsal') return { name: form.name?.trim(), price_estimate: form.price_estimate ? Number(form.price_estimate) : null, private_room: !!form.private_room }
  return { name: form.name?.trim() }
}

function VendorFormFields({ tabId, form, set }) {
  const inp = MODAL_INPUT
  const lbl = MODAL_LABEL
  if (tabId === 'music') return (
    <>
      <div><label style={lbl}>Category</label>
        <select style={inp} value={form.category || ''} onChange={e => set('category', e.target.value)}>
          <option value="">Select…</option>
          <option value="DJ">DJ</option>
          <option value="Band">Band</option>
          <option value="Solo Artist">Solo Artist</option>
        </select>
      </div>
      <div><label style={lbl}>Price Estimate ($)</label>
        <input type="number" style={inp} placeholder="e.g. 3500" value={form.price_estimate || ''} onChange={e => set('price_estimate', e.target.value)} />
      </div>
      <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!form.hip_hop} onChange={e => set('hip_hop', e.target.checked)} /> Hip-Hop set
      </label>
      <div><label style={lbl}>Instagram URL</label>
        <input style={inp} placeholder="https://instagram.com/…" value={form.instagram_url || ''} onChange={e => set('instagram_url', e.target.value)} />
      </div>
      <div><label style={lbl}>TikTok URL</label>
        <input style={inp} placeholder="https://tiktok.com/…" value={form.tiktok_url || ''} onChange={e => set('tiktok_url', e.target.value)} />
      </div>
    </>
  )
  if (tabId === 'catering') return (
    <>
      <div><label style={lbl}>Cuisine</label>
        <input style={inp} placeholder="e.g. Caribbean, Mediterranean" value={form.cuisine || ''} onChange={e => set('cuisine', e.target.value)} />
      </div>
      <div><label style={lbl}>Price per Person ($)</label>
        <input type="number" style={inp} placeholder="e.g. 85" value={form.price_pp || ''} onChange={e => set('price_pp', e.target.value)} />
      </div>
      <div><label style={lbl}>Status</label>
        <select style={inp} value={form.status || 'considering'} onChange={e => set('status', e.target.value)}>
          <option value="considering">Considering</option>
          <option value="booked">Booked</option>
        </select>
      </div>
    </>
  )
  if (tabId === 'bar') return (
    <>
      <div><label style={lbl}>Price per Person ($)</label>
        <input type="number" style={inp} placeholder="e.g. 55" value={form.price_pp || ''} onChange={e => set('price_pp', e.target.value)} />
      </div>
      <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!form.open_bar} onChange={e => set('open_bar', e.target.checked)} /> Open Bar
      </label>
    </>
  )
  if (tabId === 'cinema') return (
    <>
      <div><label style={lbl}>Price ($)</label>
        <input type="number" style={inp} placeholder="e.g. 4500" value={form.price || ''} onChange={e => set('price', e.target.value)} />
      </div>
      {[['drone', 'Drone'], ['highlight_reel', 'Highlight Reel'], ['confessional', 'Confessional Cam']].map(([k, l]) => (
        <label key={k} style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} /> {l}
        </label>
      ))}
    </>
  )
  if (tabId === 'florals') return (
    <>
      <div><label style={lbl}>Price Estimate ($)</label>
        <input type="number" style={inp} placeholder="e.g. 8000" value={form.price_estimate || ''} onChange={e => set('price_estimate', e.target.value)} />
      </div>
      <div><label style={lbl}>Style Tags (comma-separated)</label>
        <input style={inp} placeholder="garden, whimsical, lush" value={Array.isArray(form.style_tags) ? form.style_tags.join(', ') : (form.style_tags || '')} onChange={e => set('style_tags', e.target.value)} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {[['includes_arch', 'Arch'], ['includes_bouquet', 'Bouquet'], ['includes_centerpieces', 'Centerpieces'], ['includes_aisle', 'Aisle']].map(([k, l]) => (
          <label key={k} style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 400 }}>
            <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} /> {l}
          </label>
        ))}
      </div>
    </>
  )
  if (tabId === 'extras') return (
    <>
      <div><label style={lbl}>Category</label>
        <input style={inp} placeholder="e.g. Photo Booth, Lighting" value={form.category || ''} onChange={e => set('category', e.target.value)} />
      </div>
      <div><label style={lbl}>Price Estimate ($)</label>
        <input type="number" style={inp} placeholder="e.g. 1200" value={form.price_estimate || ''} onChange={e => set('price_estimate', e.target.value)} />
      </div>
      <div><label style={lbl}>Pricing Type</label>
        <select style={inp} value={form.pricing_type || ''} onChange={e => set('pricing_type', e.target.value)}>
          <option value="">Select…</option>
          <option value="flat">Flat rate</option>
          <option value="per person">Per person</option>
          <option value="per hour">Per hour</option>
        </select>
      </div>
    </>
  )
  if (tabId === 'rehearsal') return (
    <>
      <div><label style={lbl}>Price Estimate ($)</label>
        <input type="number" style={inp} placeholder="e.g. 2500" value={form.price_estimate || ''} onChange={e => set('price_estimate', e.target.value)} />
      </div>
      <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!form.private_room} onChange={e => set('private_room', e.target.checked)} /> Private Room
      </label>
    </>
  )
  return null
}

// ─── Add Vendor Modal ─────────────────────────────────────────────────────────

function AddVendorModal({ tab, user, onClose, onAdded }) {
  const userColor = USERS[user]?.color || '#A51C30'
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  const nameKey = tab.id === 'bar' ? 'provider' : 'name'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!(form[nameKey] || form.name)?.trim()) return
    setSaving(true)
    setError('')
    const payload = buildVendorPayload(tab.id, form)
    const { data, error: err } = await supabase.from(tab.table).insert(payload).select().single()
    if (err) { setError(err.message); setSaving(false); return }
    onAdded(data || { ...payload, id: Date.now() })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(26,18,8,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px', boxShadow: '0 -8px 40px rgba(0,0,0,0.14)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 20, fontWeight: 700, margin: 0 }}>Add {tab.label}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-dim)', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={MODAL_LABEL}>{tab.id === 'bar' ? 'Provider Name' : 'Name'} *</label>
            <input style={MODAL_INPUT} placeholder={tab.id === 'bar' ? 'Bar / Beverage Company' : `${tab.label} name`} value={form[nameKey] || ''} onChange={e => set(nameKey, e.target.value)} required />
          </div>
          <VendorFormFields tabId={tab.id} form={form} set={set} />
          {error && <p style={{ color: '#E07070', fontSize: 13, fontFamily: '"DM Sans", sans-serif', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={saving} style={{ marginTop: 4, padding: '13px 20px', borderRadius: 12, background: saving ? 'rgba(0,0,0,0.1)' : userColor, color: saving ? 'var(--text-muted)' : '#fff', fontFamily: '"Playfair Display", serif', fontSize: 15, fontWeight: 700, border: 'none', cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Saving…' : `Add ${tab.label}`}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── Quote Scan Modal ─────────────────────────────────────────────────────────

function QuoteScanModal({ tab, user, onClose, onAdded }) {
  const userColor = USERS[user]?.color || '#A51C30'
  const [phase, setPhase] = useState('upload')  // 'upload' | 'loading' | 'form'
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function handleFileChange(file) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Upload a JPEG, PNG, or WebP image.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return }
    setError('')
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target.result)
    reader.readAsDataURL(file)
  }

  async function handleScan() {
    if (!imageFile) return
    setPhase('loading')
    setError('')
    const reader = new FileReader()
    reader.onload = async e => {
      const base64 = e.target.result.split(',')[1]
      try {
        const res = await fetch('/.netlify/functions/quote-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: imageFile.type, vendorType: tab.id }),
        })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`)
        setForm(data)
        setPhase('form')
      } catch (err) {
        setError(err.message || 'Could not read the quote.')
        setPhase('upload')
      }
    }
    reader.readAsDataURL(imageFile)
  }

  async function handleSave(e) {
    e.preventDefault()
    const nameField = tab.id === 'bar' ? (form.provider || form.name) : form.name
    if (!nameField?.trim()) return
    setSaving(true)
    setError('')
    const payload = buildVendorPayload(tab.id, form)
    const { data, error: err } = await supabase.from(tab.table).insert(payload).select().single()
    if (err) { setError(err.message); setSaving(false); return }

    // Store extracted quote data for AI date-pricing
    ;(async () => {
      try {
        const { data: meta } = await supabase.from('project_metadata').select('budget_breakdown').eq('id', 1).single()
        const bb = meta?.budget_breakdown || {}
        const existing = bb._quotes || []
        await supabase.from('project_metadata').update({
          budget_breakdown: { ...bb, _quotes: [...existing, { type: tab.id, text: form, savedAt: new Date().toISOString() }] },
        }).eq('id', 1)
      } catch {}
    })()

    onAdded(data || { ...payload, id: Date.now() })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(26,18,8,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px', boxShadow: '0 -8px 40px rgba(0,0,0,0.14)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 20, fontWeight: 700, margin: 0 }}>Scan Quote — {tab.label}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-dim)', lineHeight: 1 }}>×</button>
        </div>

        <AnimatePresence mode="wait">
          {phase === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 14, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Upload a photo or screenshot of a {tab.label.toLowerCase()} quote. We'll extract the details.
              </p>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => handleFileChange(e.target.files[0])} />
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFileChange(e.dataTransfer.files[0]) }}
                style={{ border: `2px dashed ${imageFile ? userColor : 'var(--border)'}`, borderRadius: 14, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: imageFile ? `${userColor}08` : 'var(--dark)', transition: 'all 0.2s' }}
              >
                {imagePreview
                  ? <img src={imagePreview} alt="Quote preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }} />
                  : <>
                      <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 28, margin: '0 0 8px' }}>📷</p>
                      <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Tap to upload or drag & drop</p>
                      <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 12, color: 'var(--text-dim)', margin: '4px 0 0' }}>JPEG, PNG, or WebP · max 5MB</p>
                    </>
                }
              </div>
              {error && <p style={{ color: '#E07070', fontSize: 13, fontFamily: '"DM Sans", sans-serif', margin: 0 }}>{error}</p>}
              <button onClick={handleScan} disabled={!imageFile} style={{ padding: '13px 20px', borderRadius: 12, background: imageFile ? userColor : 'rgba(0,0,0,0.08)', color: imageFile ? '#fff' : 'var(--text-dim)', fontFamily: '"Playfair Display", serif', fontSize: 15, fontWeight: 700, border: 'none', cursor: imageFile ? 'pointer' : 'default', transition: 'background 0.15s' }}>
                Read the Quote →
              </button>
            </motion.div>
          )}

          {phase === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 24 }}>
              <div style={{ position: 'relative', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {[0, 1, 2].map(i => (
                  <motion.div key={i} style={{ position: 'absolute', borderRadius: '50%', border: `2px solid ${userColor}` }}
                    animate={{ width: ['14px', '68px'], height: ['14px', '68px'], opacity: [0.8, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }} />
                ))}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: userColor }} />
              </div>
              <p style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.1rem', color: 'var(--text)', margin: 0 }}>Reading the quote…</p>
            </motion.div>
          )}

          {phase === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                Review and edit the extracted details, then save.
              </p>
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={MODAL_LABEL}>{tab.id === 'bar' ? 'Provider Name' : 'Name'} *</label>
                  <input style={MODAL_INPUT} value={tab.id === 'bar' ? (form.provider || '') : (form.name || '')} onChange={e => set(tab.id === 'bar' ? 'provider' : 'name', e.target.value)} required />
                </div>
                <VendorFormFields tabId={tab.id} form={form} set={set} />
                {error && <p style={{ color: '#E07070', fontSize: 13, fontFamily: '"DM Sans", sans-serif', margin: 0 }}>{error}</p>}
                <button type="submit" disabled={saving} style={{ marginTop: 4, padding: '13px 20px', borderRadius: 12, background: saving ? 'rgba(0,0,0,0.1)' : userColor, color: saving ? 'var(--text-muted)' : '#fff', fontFamily: '"Playfair Display", serif', fontSize: 15, fontWeight: 700, border: 'none', cursor: saving ? 'default' : 'pointer' }}>
                  {saving ? 'Saving…' : `Save ${tab.label}`}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function Vendors({ user, onSwitchUser }) {
  const navigate = useNavigate()
  const userMeta = USERS[user] || USERS.kerwin
  const [activeTab, setActiveTab] = useState('music')
  const [cache, setCache] = useState({})        // { tabId: [rows] }
  const [loadingTab, setLoadingTab] = useState(null)
  const [selections, setSelections] = useState(loadSelections)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showQuoteScan, setShowQuoteScan] = useState(false)
  const [lockedCinemaId, setLockedCinemaId] = useState(null)

  const currentTab = TABS.find(t => t.id === activeTab)

  // Fetch current tab data lazily
  useEffect(() => {
    if (!currentTab || cache[currentTab.id]) return
    setLoadingTab(currentTab.id)
    supabase.from(currentTab.table).select('*').order('name')
      .then(({ data, error }) => {
        setCache(c => ({ ...c, [currentTab.id]: data || [] }))
        setLoadingTab(null)
      })
      .catch(() => {
        setCache(c => ({ ...c, [currentTab.id]: [] }))
        setLoadingTab(null)
      })
  }, [activeTab, currentTab, cache])

  useEffect(() => {
    supabase.from('cinematographers').select('id').eq('locked', true).single()
      .then(({ data }) => { if (data) setLockedCinemaId(data.id) })
  }, [])

  const handleToggle = useCallback((tabId, vendorId, isMulti) => {
    setSelections(prev => {
      const next = { ...prev }
      if (isMulti) {
        const arr = Array.isArray(next[tabId]) ? next[tabId] : []
        next[tabId] = arr.includes(vendorId)
          ? arr.filter(id => id !== vendorId)
          : [...arr, vendorId]
      } else {
        next[tabId] = next[tabId] === vendorId ? null : vendorId
      }
      saveSelections(next)
      return next
    })
  }, [])

  // Count selected categories
  const selectedCount = TABS.filter(t => {
    const s = selections[t.id]
    return t.id === 'extras' ? (Array.isArray(s) && s.length > 0) : !!s
  }).length

  const data = cache[activeTab]
  const isLoading = loadingTab === activeTab

  const handleAdded = useCallback((newRow) => {
    setCache(c => ({ ...c, [activeTab]: [...(c[activeTab] || []), newRow] }))
  }, [activeTab])

  async function lockCinema(id) {
    const isLocking = lockedCinemaId !== id
    // Unlock all first
    await supabase.from('cinematographers').update({ locked: false }).eq('locked', true)
    if (isLocking) {
      await supabase.from('cinematographers').update({ locked: true }).eq('id', id)
      setLockedCinemaId(id)
    } else {
      setLockedCinemaId(null)
    }
  }

  return (
    <div style={PAGE_STYLE}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 56, zIndex: 50,
        background: 'var(--dark)', borderBottom: '1px solid var(--border)',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            Vendor Board
          </h1>
          <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500 }}>
            {selectedCount}/{TABS.length} categories locked
          </span>
          <button
            onClick={() => setShowQuoteScan(true)}
            style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 8, border: `1px solid ${userMeta.color}44`, background: `${userMeta.color}0D`, color: userMeta.color, fontFamily: '"DM Sans", sans-serif', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            📄 Scan Quote
          </button>
        </div>

        {/* Tab bar */}
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', gap: 4, paddingBottom: 0, overflowX: 'auto',
        }}>
          {TABS.map(t => {
            const isSel = t.id === 'extras'
              ? (Array.isArray(selections[t.id]) && selections[t.id].length > 0)
              : !!selections[t.id]
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: '"DM Sans", sans-serif', fontWeight: 600,
                  fontSize: 13, padding: '12px 14px', whiteSpace: 'nowrap',
                  color: activeTab === t.id ? userMeta.color : 'var(--text-muted)',
                  borderBottom: activeTab === t.id ? `2px solid ${userMeta.color}` : '2px solid transparent',
                  transition: 'color .15s',
                  position: 'relative',
                }}
              >
                <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
                {isSel && (
                  <span style={{
                    position: 'absolute', top: 8, right: 6,
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#22c55e',
                  }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <TabContent
              tab={currentTab}
              data={data}
              loading={isLoading}
              selections={selections}
              onToggle={handleToggle}
              userColor={userMeta.color}
              lockedCinemaId={lockedCinemaId}
              onLockCinema={lockCinema}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Add Vendor FAB */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setShowAddModal(true)}
        title={`Add ${currentTab?.label}`}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 100,
          width: 52, height: 52, borderRadius: '50%',
          background: userMeta.color, color: '#fff',
          border: 'none', cursor: 'pointer',
          fontSize: 26, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 20px ${userMeta.color}55`,
        }}
      >
        +
      </motion.button>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && currentTab && (
          <AddVendorModal
            tab={currentTab}
            user={user}
            onClose={() => setShowAddModal(false)}
            onAdded={(row) => { handleAdded(row); setShowAddModal(false) }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showQuoteScan && currentTab && (
          <QuoteScanModal
            tab={currentTab}
            user={user}
            onClose={() => setShowQuoteScan(false)}
            onAdded={(row) => { handleAdded(row); setShowQuoteScan(false) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
