import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase, USERS } from '../lib/supabase'
import { AXES, ARCHETYPES, calculateCompatibility } from '../lib/quiz'
import ArchetypeBadge from '../components/ArchetypeBadge'

const OTHER = { kerwin: 'dani', dani: 'kerwin' }

// ─── Small helpers ────────────────────────────────────────────────────────────

function ScoreBar({ value, color }) {
  return (
    <div
      className="relative h-1.5 w-full rounded-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.08)' }}
    >
      <motion.div
        className="absolute top-0 left-0 h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${((value - 1) / 9) * 100}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}

function StatusDot({ status }) {
  const colors = {
    aligned:  '#4A7C59',
    divergent:'#D4A843',
    tension:  '#C9384F',
  }
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: colors[status] ?? '#888' }}
    />
  )
}

// ─── Waiting state ────────────────────────────────────────────────────────────

function WaitingScreen({ user, partner, onSwitchUser }) {
  const userMeta   = USERS[user]
  const partnerMeta = USERS[partner]

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--dark)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-sm w-full"
      >
        <div
          className="w-8 h-0.5 mx-auto mb-8 rounded-full"
          style={{ background: userMeta.color }}
        />

        <h1
          className="text-3xl mb-3"
          style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
        >
          You're done.
        </h1>

        <p
          className="text-base mb-10"
          style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}
        >
          Waiting for{' '}
          <span style={{ color: partnerMeta.color }}>{partnerMeta.label}</span>{' '}
          to complete their quiz to unlock the report.
        </p>

        {/* Pulsing dots */}
        <div className="flex gap-2 justify-center mb-12">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: partnerMeta.color }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.25 }}
            />
          ))}
        </div>

        <button
          onClick={onSwitchUser}
          className="text-sm"
          style={{ color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}
        >
          Switch to {partnerMeta.label}
        </button>
      </motion.div>
    </div>
  )
}

// ─── Full Report ──────────────────────────────────────────────────────────────

function CompatibilityReport({ user, resultsA, resultsB, compat, onSwitchUser, onRetake }) {
  const userMeta    = USERS[user]
  const partnerMeta = USERS[OTHER[user]]
  const axisKeys    = Object.keys(AXES)

  const scoreColor = (score) => {
    if (score >= 75) return '#4A7C59'
    if (score >= 50) return '#D4A843'
    return '#C9384F'
  }

  const scoreLabel = (score) => {
    if (score >= 85) return 'Deeply aligned'
    if (score >= 70) return 'Strong foundation'
    if (score >= 55) return 'Good compatibility'
    if (score >= 40) return 'Some areas to explore'
    return 'Worth a conversation'
  }

  const statusLabel = {
    aligned:  'Aligned',
    divergent:'Divergent',
    tension:  'Tension',
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-12"
      style={{ background: 'var(--dark)' }}
    >
      <div className="w-full max-w-md">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <p
            className="text-xs tracking-[0.18em] uppercase mb-3"
            style={{ color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}
          >
            Compatibility Report
          </p>
          <h1
            className="text-4xl mb-1"
            style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
          >
            Dani & Kerwin
          </h1>
        </motion.div>

        {/* Score circle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col items-center mb-10"
        >
          <div
            className="w-32 h-32 rounded-full flex flex-col items-center justify-center border-2"
            style={{
              borderColor: scoreColor(compat.compatibilityScore),
              background: `${scoreColor(compat.compatibilityScore)}11`,
            }}
          >
            <span
              className="text-4xl font-bold"
              style={{ fontFamily: 'DM Sans, sans-serif', color: scoreColor(compat.compatibilityScore) }}
            >
              {compat.compatibilityScore}%
            </span>
          </div>
          <p
            className="mt-3 text-sm"
            style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--text-muted)' }}
          >
            {scoreLabel(compat.compatibilityScore)}
          </p>
        </motion.div>

        {/* Archetype pair */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="flex justify-around items-start mb-10 px-4"
        >
          <ArchetypeBadge archetypeId={resultsA.archetype} size="lg" />
          <div
            className="text-xl mt-5"
            style={{ color: 'var(--text-dim)', fontFamily: 'Playfair Display, serif' }}
          >
            &
          </div>
          <ArchetypeBadge archetypeId={resultsB.archetype} size="lg" />
        </motion.div>

        {/* Per-archetype descriptions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className="space-y-4 mb-10"
        >
          {[
            { id: user,         result: resultsA, meta: userMeta },
            { id: OTHER[user],  result: resultsB, meta: partnerMeta },
          ].map(({ id, result, meta }) => {
            const arch = ARCHETYPES.find((a) => a.id === result.archetype)
            if (!arch) return null
            return (
              <div
                key={id}
                className="p-5 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: meta.color }}
                  />
                  <span
                    className="text-xs uppercase tracking-wider"
                    style={{ color: meta.color, fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {meta.label}
                  </span>
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}
                >
                  {arch.description}
                </p>
              </div>
            )
          })}
        </motion.div>

        {/* Axis breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="mb-10"
        >
          <h2
            className="text-xs uppercase tracking-[0.18em] mb-5"
            style={{ color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}
          >
            Axis Breakdown
          </h2>

          <div className="space-y-5">
            {axisKeys.map((axis) => {
              const r = compat.axisResults[axis]
              if (!r) return null
              return (
                <div key={axis}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <StatusDot status={r.status} />
                      <span
                        className="text-sm"
                        style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}
                      >
                        {AXES[axis].label}
                      </span>
                    </div>
                    <span
                      className="text-xs"
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        color: r.status === 'aligned' ? '#4A7C59' : r.status === 'divergent' ? '#D4A843' : '#C9384F',
                      }}
                    >
                      {statusLabel[r.status]}
                    </span>
                  </div>
                  {/* Dual bars */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs w-12 text-right flex-shrink-0"
                        style={{ color: USERS[user].color, fontFamily: 'DM Sans, sans-serif', fontSize: '0.65rem' }}
                      >
                        {USERS[user].label}
                      </span>
                      <ScoreBar value={r.a} color={USERS[user].color} />
                      <span
                        className="text-xs w-5 flex-shrink-0"
                        style={{ color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.65rem' }}
                      >
                        {r.a.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs w-12 text-right flex-shrink-0"
                        style={{ color: USERS[OTHER[user]].color, fontFamily: 'DM Sans, sans-serif', fontSize: '0.65rem' }}
                      >
                        {USERS[OTHER[user]].label}
                      </span>
                      <ScoreBar value={r.b} color={USERS[OTHER[user]].color} />
                      <span
                        className="text-xs w-5 flex-shrink-0"
                        style={{ color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.65rem' }}
                      >
                        {r.b.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Aligned / Divergent / Tension summary */}
        {(compat.aligned.length > 0 || compat.divergent.length > 0 || compat.tension.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.35 }}
            className="space-y-4 mb-10"
          >
            {[
              { list: compat.aligned,   label: 'Where you agree',     color: '#4A7C59' },
              { list: compat.divergent, label: 'Worth discussing',    color: '#D4A843' },
              { list: compat.tension,   label: 'Potential friction',  color: '#C9384F' },
            ].filter(({ list }) => list.length > 0).map(({ list, label, color }) => (
              <div
                key={label}
                className="p-4 rounded-2xl"
                style={{ background: `${color}0D`, border: `1px solid ${color}33` }}
              >
                <p
                  className="text-xs uppercase tracking-wider mb-2"
                  style={{ color, fontFamily: 'DM Sans, sans-serif' }}
                >
                  {label}
                </p>
                <p
                  className="text-sm"
                  style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}
                >
                  {list.map((a) => AXES[a].label).join(' · ')}
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {/* High-stakes conflicts */}
        {compat.conflicts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.4 }}
            className="mb-10"
          >
            <h2
              className="text-xs uppercase tracking-[0.18em] mb-4"
              style={{ color: '#C9384F', fontFamily: 'DM Sans, sans-serif' }}
            >
              Heads up
            </h2>
            <div className="space-y-3">
              {compat.conflicts.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl"
                  style={{ background: 'rgba(201,56,79,0.06)', border: '1px solid rgba(201,56,79,0.2)' }}
                >
                  <p
                    className="text-sm font-medium mb-1"
                    style={{ color: '#C9384F', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {c.label}
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {c.description}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="flex justify-between items-center pt-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <button
            onClick={onRetake}
            className="text-sm"
            style={{ color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}
          >
            Retake quiz
          </button>
          <button
            onClick={onSwitchUser}
            className="text-sm"
            style={{ color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}
          >
            Switch user
          </button>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Main Results Page ────────────────────────────────────────────────────────

export default function Results({ user, onSwitchUser }) {
  const [loading, setLoading]     = useState(true)
  const [myResult, setMyResult]   = useState(null)
  const [theirResult, setTheirResult] = useState(null)
  const [compat, setCompat]       = useState(null)
  const channelRef                = useRef(null)
  const partner                   = OTHER[user]

  async function loadAndCompute() {
    const [{ data: mine }, { data: theirs }] = await Promise.all([
      supabase.from('quiz_results').select('archetype, axis_scores').eq('user_id', user).maybeSingle(),
      supabase.from('quiz_results').select('archetype, axis_scores').eq('user_id', partner).maybeSingle(),
    ])

    setMyResult(mine ?? null)
    setTheirResult(theirs ?? null)

    if (mine && theirs) {
      const result = calculateCompatibility(mine.axis_scores, theirs.axis_scores)
      setCompat(result)

      // Persist to project_metadata
      await supabase
        .from('project_metadata')
        .update({
          compatibility_score: result.compatibilityScore,
          tension_points: result.conflicts.map((c) => c.id),
        })
        .eq('id', 1)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadAndCompute()

    // Realtime: watch for partner completing their quiz
    channelRef.current = supabase
      .channel('quiz_results_watch')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_results', filter: `user_id=eq.${partner}` },
        () => { loadAndCompute() }
      )
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [user, partner]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRetake() {
    await Promise.all([
      supabase.from('quiz_answers').delete().eq('user_id', user),
      supabase.from('quiz_results').delete().eq('user_id', user),
    ])
    onSwitchUser() // clears localStorage → back to user select → quiz
  }

  const userMeta = USERS[user]

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--dark)' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: userMeta.color, borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  // Partner hasn't finished
  if (!theirResult) {
    return (
      <WaitingScreen
        user={user}
        partner={partner}
        onSwitchUser={onSwitchUser}
      />
    )
  }

  // Both done
  return (
    <CompatibilityReport
      user={user}
      resultsA={myResult}
      resultsB={theirResult}
      compat={compat}
      onSwitchUser={onSwitchUser}
      onRetake={handleRetake}
    />
  )
}
