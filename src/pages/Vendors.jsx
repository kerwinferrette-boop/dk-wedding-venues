import React, { useState, useEffect, useCallback } from 'react'
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

function CinemaCard({ v, selected, color, onToggle }) {
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

function TabContent({ tab, data, loading, selections, onToggle, userColor }) {
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
        if (tab.id === 'cinema')    return <CinemaCard   {...props} />
        if (tab.id === 'florals')   return <FloralCard   {...props} />
        if (tab.id === 'extras')    return <ExtrasCard   {...props} multi />
        if (tab.id === 'rehearsal') return <RehearsalCard {...props} />
        return null
      })}
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

  return (
    <div style={PAGE_STYLE}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--dark)', borderBottom: '1px solid var(--border)',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, height: 60 }}>
          <button onClick={() => navigate('/dashboard')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 20, padding: '4px 8px',
            fontFamily: '"DM Sans", sans-serif',
          }}>←</button>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 22, fontWeight: 700, margin: 0, flex: 1 }}>
            Vendor Board
          </h1>
          <span style={{
            fontSize: 13, color: 'var(--text-dim)', fontWeight: 500,
          }}>{selectedCount}/{TABS.length} categories locked</span>
          <button onClick={onSwitchUser} style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 8,
            color: 'var(--text-muted)', fontSize: 12, padding: '5px 12px',
            cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
          }}>
            <span style={{ color: userMeta.color, fontWeight: 700 }}>{userMeta.label}</span> · switch
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
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
