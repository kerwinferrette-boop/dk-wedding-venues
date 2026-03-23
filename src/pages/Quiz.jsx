import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, USERS } from '../lib/supabase'
import {
  QUESTIONS,
  calculateAxisScores,
  determineArchetype,
} from '../lib/quiz'

const TOTAL = QUESTIONS.length

// ─── Sub-components ──────────────────────────────────────────────────────────

function ChoiceQuestion({ question, userColor, onAnswer }) {
  const [selected, setSelected] = useState(null)

  function pick(idx) {
    if (selected !== null) return
    setSelected(idx)
    setTimeout(() => onAnswer(idx), 320)
  }

  return (
    <div className="flex flex-col gap-3">
      {question.options.map((opt, idx) => (
        <motion.button
          key={idx}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => pick(idx)}
          className="w-full text-left px-5 py-4 rounded-2xl border transition-all"
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.95rem',
            borderColor: selected === idx ? userColor : 'rgba(255,255,255,0.12)',
            background: selected === idx ? `${userColor}22` : 'rgba(255,255,255,0.04)',
            color: selected === idx ? '#f5f0eb' : 'var(--text-muted)',
            cursor: selected !== null ? 'default' : 'pointer',
          }}
        >
          {opt.label}
        </motion.button>
      ))}
    </div>
  )
}

function RatingQuestion({ question, userColor, onAnswer }) {
  const [selected, setSelected] = useState(null)

  function pick(val) {
    if (selected !== null) return
    setSelected(val)
    setTimeout(() => onAnswer(val), 320)
  }

  return (
    <div>
      <div className="flex justify-between mb-3">
        <span className="text-xs" style={{ color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}>
          {question.low}
        </span>
        <span className="text-xs text-right" style={{ color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}>
          {question.high}
        </span>
      </div>
      <div className="flex gap-2 justify-between">
        {[1, 2, 3, 4, 5, 6, 7].map((val) => (
          <motion.button
            key={val}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => pick(val)}
            className="flex-1 aspect-square rounded-full text-sm font-medium transition-all"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.85rem',
              background: selected === val ? userColor : 'rgba(255,255,255,0.08)',
              color: selected === val ? '#fff' : 'var(--text-muted)',
              border: selected === val ? `2px solid ${userColor}` : '2px solid rgba(255,255,255,0.12)',
              cursor: selected !== null ? 'default' : 'pointer',
              minWidth: 0,
              minHeight: '2.5rem',
            }}
          >
            {val}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function RankQuestion({ question, userColor, onAnswer }) {
  const [ranked, setRanked] = useState([])
  const options = question.options

  function tap(idx) {
    if (ranked.includes(idx)) {
      setRanked(ranked.filter((r) => r !== idx))
    } else {
      setRanked([...ranked, idx])
    }
  }

  const allRanked = ranked.length === options.length

  return (
    <div>
      <p className="text-xs mb-3" style={{ color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}>
        Tap in order of priority — first tap = most important
      </p>
      <div className="flex flex-col gap-2 mb-5">
        {options.map((opt, idx) => {
          const rankPos = ranked.indexOf(idx)
          const isRanked = rankPos !== -1
          return (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.97 }}
              onClick={() => tap(idx)}
              className="w-full text-left px-5 py-3 rounded-2xl border flex items-center gap-3 transition-all"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.9rem',
                borderColor: isRanked ? userColor : 'rgba(255,255,255,0.12)',
                background: isRanked ? `${userColor}22` : 'rgba(255,255,255,0.04)',
                color: isRanked ? '#f5f0eb' : 'var(--text-muted)',
              }}
            >
              <span
                className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0"
                style={{
                  background: isRanked ? userColor : 'rgba(255,255,255,0.1)',
                  color: isRanked ? '#fff' : 'var(--text-dim)',
                }}
              >
                {isRanked ? rankPos + 1 : ''}
              </span>
              {opt.label}
            </motion.button>
          )
        })}
      </div>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => allRanked && onAnswer(ranked)}
        className="w-full py-4 rounded-2xl font-medium transition-all"
        style={{
          fontFamily: 'DM Sans, sans-serif',
          background: allRanked ? userColor : 'rgba(255,255,255,0.06)',
          color: allRanked ? '#fff' : 'var(--text-dim)',
          cursor: allRanked ? 'pointer' : 'default',
        }}
      >
        {allRanked ? 'Continue' : `${ranked.length} of ${options.length} ranked`}
      </motion.button>
    </div>
  )
}

// ─── Main Quiz Page ───────────────────────────────────────────────────────────
export default function Quiz({ user, onSwitchUser }) {
  const navigate = useNavigate()
  const userMeta = USERS[user]

  const [answers, setAnswers] = useState({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = back
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load saved answers on mount
  useEffect(() => {
    async function loadAnswers() {
      const { data } = await supabase
        .from('quiz_answers')
        .select('question_id, answer')
        .eq('user_id', user)

      if (data && data.length > 0) {
        const saved = {}
        data.forEach((row) => {
          saved[row.question_id] = row.answer
        })
        setAnswers(saved)

        // Check if already completed
        const { data: result } = await supabase
          .from('quiz_results')
          .select('archetype')
          .eq('user_id', user)
          .maybeSingle()

        if (result) {
          navigate('/results', { replace: true })
          return
        }

        // Resume from first unanswered
        const firstUnanswered = QUESTIONS.findIndex((q) => saved[q.id] == null)
        setCurrentIdx(firstUnanswered === -1 ? TOTAL - 1 : firstUnanswered)
      }

      setLoading(false)
    }
    loadAnswers()
  }, [user, navigate])

  const currentQuestion = QUESTIONS[currentIdx]
  const answeredCount = Object.keys(answers).length
  const progress = answeredCount / TOTAL

  const handleAnswer = useCallback(
    async (value) => {
      const qId = currentQuestion.id
      const newAnswers = { ...answers, [qId]: value }
      setAnswers(newAnswers)

      setSaving(true)
      await supabase.from('quiz_answers').upsert(
        { user_id: user, question_id: qId, answer: value },
        { onConflict: 'user_id,question_id' }
      )
      setSaving(false)

      const isLast = currentIdx === TOTAL - 1
      if (isLast) {
        // All questions answered — compute and save results
        const axisScores = calculateAxisScores(newAnswers)
        const archetype = determineArchetype(axisScores)

        await supabase.from('quiz_results').upsert(
          {
            user_id: user,
            archetype: archetype.id,
            axis_scores: axisScores,
          },
          { onConflict: 'user_id' }
        )

        // Update project_metadata
        const colKey = `${user}_archetype`
        await supabase
          .from('project_metadata')
          .update({ [colKey]: archetype.id })
          .eq('id', 1)

        navigate('/results')
      } else {
        setDirection(1)
        setCurrentIdx((i) => i + 1)
      }
    },
    [answers, currentIdx, currentQuestion, user, navigate]
  )

  function goBack() {
    if (currentIdx === 0) return
    setDirection(-1)
    setCurrentIdx((i) => i - 1)
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--dark)' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: userMeta.color, borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  const slideVariants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 pb-8"
      style={{ background: 'var(--dark)' }}
    >
      <div className="w-full max-w-md">
        {/* Progress bar */}
        <div className="mb-8">
          <div
            className="h-0.5 w-full rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: userMeta.color }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs" style={{ color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}>
              {currentQuestion.group}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}>
              {answeredCount} / {TOTAL}
            </span>
          </div>
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentQuestion.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* User accent bar */}
            <div
              className="w-8 h-0.5 mb-8 rounded-full"
              style={{ background: userMeta.color }}
            />

            <h2
              className="text-2xl mb-8 leading-snug"
              style={{
                fontFamily: 'Playfair Display, serif',
                color: 'var(--text)',
              }}
            >
              {currentQuestion.text}
            </h2>

            {currentQuestion.type === 'choice' && (
              <ChoiceQuestion
                key={currentQuestion.id}
                question={currentQuestion}
                userColor={userMeta.color}
                onAnswer={handleAnswer}
              />
            )}
            {currentQuestion.type === 'rating' && (
              <RatingQuestion
                key={currentQuestion.id}
                question={currentQuestion}
                userColor={userMeta.color}
                onAnswer={handleAnswer}
              />
            )}
            {currentQuestion.type === 'rank' && (
              <RankQuestion
                key={currentQuestion.id}
                question={currentQuestion}
                userColor={userMeta.color}
                onAnswer={handleAnswer}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="flex items-center justify-between mt-10">
          <button
            onClick={goBack}
            disabled={currentIdx === 0}
            className="text-sm transition-opacity"
            style={{
              color: 'var(--text-dim)',
              fontFamily: 'DM Sans, sans-serif',
              opacity: currentIdx === 0 ? 0.3 : 0.7,
            }}
          >
            Back
          </button>

          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-xs" style={{ color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}>
                Saving…
              </span>
            )}
            <button
              onClick={onSwitchUser}
              className="text-sm"
              style={{ color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}
            >
              Switch user
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
