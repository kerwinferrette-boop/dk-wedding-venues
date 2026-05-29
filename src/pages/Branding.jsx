// Branding page — Fabric.js canvas editor + asset gallery + AI assistant.
// Canvas exports with transparent background (fixes white-space PNG issue).

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Canvas, FabricText, Rect, Circle, FabricImage } from 'fabric'
import { supabase } from '../lib/supabase'
import AiPanel from '../components/AiPanel'

const SYSTEM_PROMPT = `You are a wedding visual branding designer for Dani & Kerwin's wedding on March 27, 2027.

Details:
- Venue: La Valencia Hotel, La Jolla, CA (historic Spanish-Mediterranean clifftop hotel)
- Couple: Dani & Kerwin
- Date: March 27, 2027
- Style: Mediterranean Deco — warm, elegant, intimate. Think rich golds, deep teals, terracotta accents, lush florals, art deco typography
- Color palette: Gold (#C9A84C), Teal (#2A6B7C), Rose/Terracotta (#C4836F), Champagne (#E8D5A3), Deep cream (#FAF5EC)
- Fonts used in the app: Cinzel (serif headers), Playfair Display (display text), DM Sans (body)

Your role:
- Suggest design concepts for specific wedding items (save-the-dates, invitations, menus, ceremony programs, signage, day-of materials)
- Recommend color combinations, font pairings, layout ideas
- Write copy for wedding items (invitation wording, menu text, signage text)
- Describe specific design directions in enough detail for the user to execute in the canvas editor
- Help refine designs based on what they've already created

When suggesting designs, be specific about: layout, typography choices, color usage, imagery, and wording. Reference the Mediterranean Deco aesthetic throughout.`

const SUGGESTIONS = [
  'Design a save-the-date concept for us',
  'Suggest copy and layout for the dinner menu',
  'What fonts and colors for our invitations?',
  'Write the wording for our ceremony program cover',
]

const CATEGORIES = [
  { key: 'save_the_dates', label: 'Save the Dates' },
  { key: 'invitations',    label: 'Invitations' },
  { key: 'menus',          label: 'Menus' },
  { key: 'programs',       label: 'Programs' },
  { key: 'signage',        label: 'Signage' },
  { key: 'other',          label: 'Other' },
]

const FONTS = ['Cinzel', 'Playfair Display', 'DM Sans', 'Georgia', 'serif']
const COLORS = ['#1C1208', '#C9A84C', '#2A6B7C', '#C4836F', '#E8D5A3', '#FAF5EC', '#5DBB8A', '#E07070', '#ffffff']

const STATUS_OPTIONS = ['draft', 'in_progress', 'finalized']
const STATUS_COLOR = { draft: 'var(--text-muted)', in_progress: 'var(--gold)', finalized: 'var(--green)' }

export default function Branding() {
  const canvasRef = useRef(null)
  const fabricRef = useRef(null)
  const [category, setCategory] = useState('save_the_dates')
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeAsset, setActiveAsset] = useState(null)
  const [assetName, setAssetName] = useState('')
  const [assetStatus, setAssetStatus] = useState('draft')
  const [saving, setSaving] = useState(false)
  const [selectedObj, setSelectedObj] = useState(null)
  const [textColor, setTextColor] = useState('#1C1208')
  const [font, setFont] = useState('Cinzel')
  const [fontSize, setFontSize] = useState(32)
  const [view, setView] = useState('canvas') // 'canvas' | 'gallery'
  const fileInputRef = useRef(null)

  // Load assets for current category
  useEffect(() => {
    loadAssets()
  }, [category])

  async function loadAssets() {
    setLoading(true)
    const { data } = await supabase
      .from('branding_assets')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })
    setAssets(data || [])
    setLoading(false)
  }

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = new Canvas(canvasRef.current, {
      width: 600,
      height: 400,
      backgroundColor: null, // transparent
      preserveObjectStacking: true,
    })
    fabricRef.current = canvas

    canvas.on('selection:created', (e) => setSelectedObj(e.selected?.[0] || null))
    canvas.on('selection:updated', (e) => setSelectedObj(e.selected?.[0] || null))
    canvas.on('selection:cleared', () => setSelectedObj(null))

    return () => {
      canvas.dispose()
      fabricRef.current = null
    }
  }, [])

  function addText() {
    const canvas = fabricRef.current
    if (!canvas) return
    const text = new FabricText('Double-click to edit', {
      left: 60, top: 60,
      fontSize,
      fontFamily: font,
      fill: textColor,
    })
    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
  }

  function addRect() {
    const canvas = fabricRef.current
    if (!canvas) return
    const rect = new Rect({
      left: 80, top: 80, width: 160, height: 80,
      fill: 'transparent',
      stroke: textColor,
      strokeWidth: 1.5,
    })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    canvas.renderAll()
  }

  function addCircle() {
    const canvas = fabricRef.current
    if (!canvas) return
    const circle = new Circle({
      left: 100, top: 100, radius: 50,
      fill: 'transparent',
      stroke: textColor,
      strokeWidth: 1.5,
    })
    canvas.add(circle)
    canvas.setActiveObject(circle)
    canvas.renderAll()
  }

  function deleteSelected() {
    const canvas = fabricRef.current
    if (!canvas) return
    const obj = canvas.getActiveObject()
    if (obj) { canvas.remove(obj); canvas.renderAll() }
  }

  function clearCanvas() {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.clear()
    canvas.backgroundColor = null
    canvas.renderAll()
  }

  function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    FabricImage.fromURL(url).then(img => {
      const canvas = fabricRef.current
      if (!canvas) return
      img.scaleToWidth(200)
      img.set({ left: 50, top: 50 })
      canvas.add(img)
      canvas.setActiveObject(img)
      canvas.renderAll()
    })
  }

  function applyColorToSelected(color) {
    const canvas = fabricRef.current
    if (!canvas) return
    const obj = canvas.getActiveObject()
    if (!obj) return
    if (obj.type === 'text' || obj.type === 'i-text') {
      obj.set('fill', color)
    } else {
      obj.set('stroke', color)
    }
    canvas.renderAll()
    setTextColor(color)
  }

  function applyFontToSelected(f) {
    const canvas = fabricRef.current
    if (!canvas) return
    const obj = canvas.getActiveObject()
    if (obj && (obj.type === 'text' || obj.type === 'i-text')) {
      obj.set('fontFamily', f)
      canvas.renderAll()
    }
    setFont(f)
  }

  function applyFontSizeToSelected(size) {
    const canvas = fabricRef.current
    if (!canvas) return
    const obj = canvas.getActiveObject()
    if (obj && (obj.type === 'text' || obj.type === 'i-text')) {
      obj.set('fontSize', size)
      canvas.renderAll()
    }
    setFontSize(size)
  }

  function exportPng() {
    const canvas = fabricRef.current
    if (!canvas) return
    // Export with alpha channel — no white background
    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 })
    const link = document.createElement('a')
    link.download = `${assetName || 'branding-asset'}.png`
    link.href = dataUrl
    link.click()
  }

  async function saveAsset() {
    const canvas = fabricRef.current
    if (!canvas || !assetName.trim()) {
      alert('Please enter an asset name before saving.')
      return
    }
    setSaving(true)
    const canvasJson = canvas.toJSON()
    // Generate thumbnail (smaller, for gallery preview)
    const thumbnailUrl = canvas.toDataURL({ format: 'png', multiplier: 0.3 })

    if (activeAsset) {
      await supabase.from('branding_assets').update({
        name: assetName,
        category,
        status: assetStatus,
        canvas_json: canvasJson,
        thumbnail_url: thumbnailUrl,
        updated_at: new Date().toISOString(),
      }).eq('id', activeAsset.id)
    } else {
      const { data } = await supabase.from('branding_assets').insert({
        name: assetName,
        category,
        status: assetStatus,
        canvas_json: canvasJson,
        thumbnail_url: thumbnailUrl,
      }).select().single()
      if (data) setActiveAsset(data)
    }
    setSaving(false)
    loadAssets()
  }

  async function loadAssetIntoCanvas(asset) {
    const canvas = fabricRef.current
    if (!canvas || !asset.canvas_json) return
    canvas.loadFromJSON(asset.canvas_json).then(() => {
      canvas.renderAll()
    })
    setActiveAsset(asset)
    setAssetName(asset.name)
    setAssetStatus(asset.status)
    setView('canvas')
  }

  async function deleteAsset(id) {
    await supabase.from('branding_assets').delete().eq('id', id)
    if (activeAsset?.id === id) {
      setActiveAsset(null)
      setAssetName('')
      clearCanvas()
    }
    setAssets(prev => prev.filter(a => a.id !== id))
  }

  const aiContext = `Wedding: Dani & Kerwin · March 27, 2027 · La Valencia Hotel, La Jolla, CA\nCurrent category: ${CATEGORIES.find(c => c.key === category)?.label || category}\nStyle: Mediterranean Deco · Colors: Gold, Teal, Terracotta, Champagne · Fonts: Cinzel, Playfair Display`

  const toolBtn = (onClick, children, title) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: '5px 10px', background: 'var(--dark2)',
        border: '1px solid var(--border)', borderRadius: 6,
        color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 12,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* Main branding area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar: categories + view toggle */}
        <div style={{
          padding: '16px 24px 0',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 0 }}>
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => { setCategory(c.key); setView('gallery') }}
                style={{
                  padding: '8px 14px',
                  background: 'none', border: 'none',
                  borderBottom: category === c.key ? '2px solid var(--gold)' : '2px solid transparent',
                  color: category === c.key ? 'var(--gold)' : 'var(--text-muted)',
                  fontFamily: 'DM Sans', fontSize: 12,
                  cursor: 'pointer', fontWeight: category === c.key ? 600 : 400,
                  letterSpacing: '0.02em',
                }}
              >
                {c.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 6, paddingBottom: 8 }}>
              <button
                onClick={() => setView('gallery')}
                style={{
                  padding: '4px 12px', borderRadius: 6,
                  background: view === 'gallery' ? 'var(--gold)' : 'var(--dark2)',
                  border: `1px solid ${view === 'gallery' ? 'var(--gold)' : 'var(--border)'}`,
                  color: view === 'gallery' ? '#fff' : 'var(--text-muted)',
                  fontFamily: 'DM Sans', fontSize: 11, cursor: 'pointer',
                }}
              >
                Gallery
              </button>
              <button
                onClick={() => setView('canvas')}
                style={{
                  padding: '4px 12px', borderRadius: 6,
                  background: view === 'canvas' ? 'var(--gold)' : 'var(--dark2)',
                  border: `1px solid ${view === 'canvas' ? 'var(--gold)' : 'var(--border)'}`,
                  color: view === 'canvas' ? '#fff' : 'var(--text-muted)',
                  fontFamily: 'DM Sans', fontSize: 11, cursor: 'pointer',
                }}
              >
                + New / Edit
              </button>
            </div>
          </div>
        </div>

        {/* Gallery view */}
        {view === 'gallery' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {loading ? (
              <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>Loading…</div>
            ) : assets.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans', textAlign: 'center', marginTop: 60 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎨</div>
                No {CATEGORIES.find(c => c.key === category)?.label} yet.
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => setView('canvas')}
                    style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 14 }}
                  >
                    Create one →
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {assets.map(a => (
                  <div key={a.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    {/* Preview */}
                    <div
                      style={{
                        height: 140, background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 16px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      onClick={() => loadAssetIntoCanvas(a)}
                    >
                      {a.thumbnail_url ? (
                        <img src={a.thumbnail_url} alt={a.name} style={{ maxWidth: '100%', maxHeight: '100%', mixBlendMode: 'multiply' }} />
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'DM Sans' }}>No preview</span>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontSize: 10, padding: '1px 6px', borderRadius: 999,
                          background: `${STATUS_COLOR[a.status] || 'var(--text-muted)'}22`,
                          color: STATUS_COLOR[a.status] || 'var(--text-muted)',
                          border: `1px solid ${STATUS_COLOR[a.status] || 'var(--text-muted)'}66`,
                          fontFamily: 'DM Sans', letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>
                          {a.status.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => deleteAsset(a.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, padding: 0 }}
                          title="Delete"
                        >×</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Canvas editor view */}
        {view === 'canvas' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid var(--border)',
              background: 'var(--dark2)', display: 'flex', gap: 8, flexWrap: 'wrap',
              alignItems: 'center', flexShrink: 0,
            }}>
              {toolBtn(addText, 'T Text', 'Add text')}
              {toolBtn(addRect, '▭ Rect', 'Add rectangle')}
              {toolBtn(addCircle, '○ Circle', 'Add circle')}
              {toolBtn(() => fileInputRef.current?.click(), '⬆ Image', 'Upload image')}
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

              <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

              {/* Font picker */}
              <select
                value={font}
                onChange={e => applyFontToSelected(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 12 }}
              >
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>

              {/* Font size */}
              <input
                type="number"
                value={fontSize}
                min={8} max={200}
                onChange={e => applyFontSizeToSelected(Number(e.target.value))}
                style={{ width: 52, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 12, textAlign: 'center' }}
              />

              <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

              {/* Color swatches */}
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => applyColorToSelected(c)}
                  style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: c, border: `2px solid ${c === textColor ? 'var(--text)' : 'var(--border)'}`,
                    cursor: 'pointer', padding: 0, flexShrink: 0,
                  }}
                  title={c}
                />
              ))}

              <div style={{ flex: 1 }} />
              {selectedObj && toolBtn(deleteSelected, '✕ Delete', 'Delete selected')}
              {toolBtn(clearCanvas, 'Clear all', 'Clear canvas')}
            </div>

            {/* Canvas area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              {/* Asset name + status row */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', maxWidth: 650 }}>
                <input
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--card)',
                    color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none',
                  }}
                  placeholder="Asset name (e.g. Save the Date v1)"
                  value={assetName}
                  onChange={e => setAssetName(e.target.value)}
                />
                <select
                  value={assetStatus}
                  onChange={e => setAssetStatus(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 12 }}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
                <button
                  onClick={saveAsset}
                  disabled={saving}
                  style={{ padding: '6px 16px', background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={exportPng}
                  style={{ padding: '6px 14px', background: 'var(--dark2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer' }}
                >
                  Export PNG
                </button>
              </div>

              {/* Canvas with checkerboard bg to show transparency */}
              <div style={{
                boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                borderRadius: 8,
                overflow: 'hidden',
                background: 'repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 0 0 / 20px 20px',
                flexShrink: 0,
              }}>
                <canvas ref={canvasRef} />
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                Checkerboard = transparent background · Double-click text to edit · Drag to move
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Panel */}
      <div style={{ padding: '28px 28px 28px 0', display: 'flex' }}>
        <AiPanel
          label="Branding Designer"
          systemPrompt={SYSTEM_PROMPT}
          context={aiContext}
          suggestions={SUGGESTIONS}
          placeholder="Design concepts, copy, palette ideas…"
        />
      </div>
    </div>
  )
}
