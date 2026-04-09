import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, USERS } from '../lib/supabase'
import { AXES, ARCHETYPES, calculateCompatibility } from '../lib/quiz'
import ArchetypeBadge from '../components/ArchetypeBadge'

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

// ─── Single axis bar (Vibe DNA section) ───────────────────────────────────────

function AxisBar({ label, value, color }) {
  const pct = ((value - 1) / 9) * 100
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {label}
        </span>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color, fontWeight: 600 }}>
          {Number(value).toFixed(1)}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', borderRadius: 3, background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}

// ─── Dual axis bar (Alignment section) ────────────────────────────────────────

function DualAxisBar({ label, vibeVal, userVal, userColor, vibeColor, status }) {
  const statusColor = status === 'aligned' ? '#4A7C59' : status === 'tension' ? '#C9384F' : '#D4A843'
  const statusLabel = status === 'aligned' ? 'Aligned' : status === 'tension' ? 'Tension' : 'Divergent'

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{label}</span>
        </div>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.72rem', color: statusColor }}>{statusLabel}</span>
      </div>
      {/* Vibe bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.6rem', color: vibeColor, width: 38, textAlign: 'right', flexShrink: 0 }}>Vibe</span>
        <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.07)', overflow: 'hidden', position: 'relative' }}>
          <motion.div
            style={{ position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 3, background: vibeColor }}
            initial={{ width: 0 }}
            animate={{ width: `${((vibeVal - 1) / 9) * 100}%` }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.6rem', color: 'var(--text-dim)', width: 24, flexShrink: 0 }}>{Number(vibeVal).toFixed(1)}</span>
      </div>
      {/* User bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.6rem', color: userColor, width: 38, textAlign: 'right', flexShrink: 0 }}>You</span>
        <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.07)', overflow: 'hidden', position: 'relative' }}>
          <motion.div
            style={{ position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 3, background: userColor }}
            initial={{ width: 0 }}
            animate={{ width: `${((userVal - 1) / 9) * 100}%` }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          />
        </div>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.6rem', color: 'var(--text-dim)', width: 24, flexShrink: 0 }}>{Number(userVal).toFixed(1)}</span>
      </div>
    </div>
  )
}

// ─── Loading phase ─────────────────────────────────────────────────────────────

function LoadingPhase({ url, userColor }) {
  const domain = getDomain(url)
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}
    >
      {/* Radar rings */}
      <div style={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              border: `2px solid ${userColor}`,
            }}
            animate={{ width: ['20px', '96px'], height: ['20px', '96px'], opacity: [0.7, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
          />
        ))}
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: userColor }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', color: 'var(--text)', margin: '0 0 6px' }}>
          Reading the vibe…
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', color: 'var(--text-dim)', margin: 0 }}>
          {domain}
        </p>
      </div>
    </motion.div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function VibeScan({ user, onSwitchUser }) {
  const navigate = useNavigate()
  const userMeta = USERS[user]

  const [phase, setPhase] = useState('input')   // 'input' | 'loading' | 'results' | 'error'
  const [url, setUrl] = useState('')
  const [scanUrl, setScanUrl] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState('')
  const [userAxisScores, setUserAxisScores] = useState(null)

  // Load user's quiz results for alignment comparison
  useEffect(() => {
    supabase
      .from('quiz_results')
      .select('axis_scores')
      .eq('user_id', user)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.axis_scores) setUserAxisScores(data.axis_scores)
      })
  }, [user])

  async function handleScan() {
    const trimmed = url.trim()
    if (!trimmed) return
    setScanUrl(trimmed)
    setPhase('loading')
    setError('')

    try {
      const res = await fetch('/.netlify/functions/vibe-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setScanResult(data)
      setPhase('results')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setPhase('error')
    }
  }

  function handleReset() {
    setUrl('')
    setScanResult(null)
    setError('')
    setPhase('input')
  }

  // Derived — use vibe archetype color for DNA bars
  const vibeArchetype = scanResult ? ARCHETYPES.find((a) => a.id === scanResult.archetype) : null
  const vibeColor = vibeArchetype?.color ?? '#8B6914'

  const compat = scanResult && userAxisScores
    ? calculateCompatibility(scanResult.axes, userAxisScores)
    : null

  const scoreColor = (s) => s >= 75 ? '#4A7C59' : s >= 50 ? '#D4A843' : '#C9384F'
  const scoreLabel = (s) => {
    if (s >= 85) return 'Deeply aligned'
    if (s >= 70) return 'Strong match'
    if (s >= 55) return 'Good alignment'
    if (s >= 40) return 'Some differences'
    return 'Worth discussing'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 20px 64px' }}>

        <AnimatePresence mode="wait">

          {/* ── Input ─────────────────────────────────────────────────────────── */}
          {phase === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ width: 32, height: 2, background: userMeta.color, borderRadius: 2, marginBottom: 24 }} />

              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', color: 'var(--text)', marginBottom: 10, lineHeight: 1.15 }}>
                Vibe Scanner
              </h1>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.6 }}>
                Paste a venue site, inspiration image, or Instagram post. We'll decode the aesthetic DNA and score it against your archetype.
              </p>

              <div style={{ marginBottom: 12 }}>
                <input
                  type="url"
                  placeholder="https://thevenuecollective.com or a direct image URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.9rem',
                    color: 'var(--text)',
                    background: 'var(--card)',
                    border: `1.5px solid ${url ? userMeta.color + '99' : 'var(--border)'}`,
                    borderRadius: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleScan}
                disabled={!url.trim()}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#fff',
                  background: url.trim() ? userMeta.color : 'rgba(0,0,0,0.12)',
                  border: 'none',
                  borderRadius: 14,
                  cursor: url.trim() ? 'pointer' : 'default',
                  transition: 'background 0.2s',
                  letterSpacing: '0.01em',
                }}
              >
                Scan It
              </motion.button>

              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: 14 }}>
                Works with venue sites · direct image links · inspiration boards
              </p>

              {!userAxisScores && (
                <div style={{
                  marginTop: 24, padding: '12px 16px',
                  background: `${userMeta.color}0D`, border: `1px solid ${userMeta.color}33`,
                  borderRadius: 12,
                }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Complete the Style Quiz to unlock alignment scoring — see exactly how this vibe stacks up against your archetype.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Loading ────────────────────────────────────────────────────────── */}
          {phase === 'loading' && (
            <LoadingPhase key="loading" url={scanUrl} userColor={userMeta.color} />
          )}

          {/* ── Error ─────────────────────────────────────────────────────────── */}
          {phase === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ textAlign: 'center', paddingTop: 60 }}
            >
              <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', color: 'var(--text)', marginBottom: 12 }}>
                Couldn't read that vibe
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.6, maxWidth: 340, margin: '0 auto 32px' }}>
                {error}
              </p>
              <button
                onClick={handleReset}
                style={{
                  padding: '12px 28px',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '0.9rem',
                  background: userMeta.color, color: '#fff',
                  border: 'none', borderRadius: 12, cursor: 'pointer',
                }}
              >
                Try another URL
              </button>
            </motion.div>
          )}

          {/* ── Results ───────────────────────────────────────────────────────── */}
          {phase === 'results' && scanResult && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Thumbnail */}
              {scanResult.imageUrl && (
                <motion.img
                  src={scanResult.imageUrl}
                  alt="Scanned vibe"
                  onError={(e) => { e.target.style.display = 'none' }}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    width: '100%', height: 200, objectFit: 'cover',
                    borderRadius: 16, border: '1px solid var(--border)', marginBottom: 24,
                    display: 'block',
                  }}
                />
              )}

              {/* Header */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--text-dim)', marginBottom: 6 }}>
                  Visual DNA · {getDomain(scanUrl)}
                </p>
                <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.7rem', color: 'var(--text)', lineHeight: 1.15, margin: 0 }}>
                  {scanResult.title}
                </h1>
              </div>

              {/* Archetype match + vibe description */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
                style={{
                  padding: '20px',
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 16, marginBottom: 14,
                  display: 'flex', alignItems: 'flex-start', gap: 20,
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  <ArchetypeBadge archetypeId={scanResult.archetype} size="lg" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-dim)', marginBottom: 8 }}>
                    This vibe reads as
                  </p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                    {scanResult.vibe}
                  </p>
                </div>
              </motion.div>

              {/* Axis DNA */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                style={{
                  padding: '20px',
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 16, marginBottom: 14,
                }}
              >
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--text-dim)', marginBottom: 18 }}>
                  Aesthetic DNA
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Object.entries(AXES).map(([key, axis]) => (
                    <AxisBar
                      key={key}
                      label={axis.label}
                      value={scanResult.axes[key] ?? 5}
                      color={vibeColor}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Alignment (only if user has quiz results) */}
              {compat && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.35 }}
                  style={{
                    padding: '20px',
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 16, marginBottom: 14,
                  }}
                >
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--text-dim)', marginBottom: 16 }}>
                    Your Alignment
                  </p>

                  {/* Score circle */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{
                      width: 96, height: 96, borderRadius: '50%',
                      border: `2px solid ${scoreColor(compat.compatibilityScore)}`,
                      background: `${scoreColor(compat.compatibilityScore)}11`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '1.8rem', fontWeight: 700, color: scoreColor(compat.compatibilityScore), lineHeight: 1 }}>
                        {compat.compatibilityScore}%
                      </span>
                    </div>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
                      {scoreLabel(compat.compatibilityScore)}
                    </p>
                  </div>

                  {/* Dual bars */}
                  <div style={{ marginBottom: 8 }}>
                    {Object.entries(AXES).map(([key, axis]) => {
                      const r = compat.axisResults[key]
                      if (!r) return null
                      return (
                        <DualAxisBar
                          key={key}
                          label={axis.label}
                          vibeVal={r.a}
                          userVal={r.b}
                          vibeColor={vibeColor}
                          userColor={userMeta.color}
                          status={r.status}
                        />
                      )
                    })}
                  </div>

                  {/* Summary chips */}
                  {[
                    { list: compat.aligned,   label: 'Where you match',    color: '#4A7C59' },
                    { list: compat.divergent, label: 'Worth exploring',    color: '#D4A843' },
                    { list: compat.tension,   label: 'Potential friction', color: '#C9384F' },
                  ].filter(({ list }) => list.length > 0).map(({ list, label, color }) => (
                    <div
                      key={label}
                      style={{
                        marginTop: 10, padding: '12px 14px',
                        borderRadius: 12,
                        background: `${color}0D`, border: `1px solid ${color}33`,
                      }}
                    >
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color, marginBottom: 4 }}>
                        {label}
                      </p>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                        {list.map((a) => AXES[a].label).join(' · ')}
                      </p>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}
              >
                <button
                  onClick={handleReset}
                  style={{
                    width: '100%', padding: '14px 24px',
                    fontFamily: 'Playfair Display, serif', fontSize: '1rem', fontWeight: 700,
                    background: userMeta.color, color: '#fff',
                    border: 'none', borderRadius: 14, cursor: 'pointer',
                  }}
                >
                  Scan another URL →
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  style={{
                    width: '100%', padding: '12px 24px',
                    fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem',
                    background: 'transparent', color: 'var(--text-muted)',
                    border: '1px solid var(--border)', borderRadius: 14, cursor: 'pointer',
                  }}
                >
                  Back to Dashboard
                </button>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
