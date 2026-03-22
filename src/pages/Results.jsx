import React from 'react'
import { motion } from 'framer-motion'

// Subagent 2 will replace this with the full Compatibility Report.
export default function Results({ user, onSwitchUser }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--dark)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md w-full"
      >
        <h1
          className="text-4xl mb-4"
          style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
        >
          Compatibility Report
        </h1>

        <p style={{ color: 'var(--text-muted)' }}>
          Complete both quizzes to unlock your compatibility report.
        </p>

        <button
          onClick={onSwitchUser}
          className="mt-8 text-sm underline"
          style={{ color: 'var(--text-muted)' }}
        >
          Switch user
        </button>
      </motion.div>
    </div>
  )
}
