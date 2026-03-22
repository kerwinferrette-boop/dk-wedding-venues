import React from 'react'
import { motion } from 'framer-motion'
import { USERS } from '../lib/supabase'

// Subagent 2 will replace this with the full 33-question quiz engine.
export default function Quiz({ user, onSwitchUser }) {
  const userMeta = USERS[user]

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--dark)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-md w-full"
      >
        <div
          className="w-10 h-1 mx-auto mb-10 rounded-full"
          style={{ background: userMeta.color }}
        />

        <h1
          className="text-4xl mb-4"
          style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
        >
          Archetype Quiz
        </h1>

        <p className="text-base mb-2" style={{ color: 'var(--text-muted)' }}>
          Hey{' '}
          <strong style={{ color: userMeta.color }}>{userMeta.label}</strong> —
          your 33-question archetype quiz loads here in Subagent 2.
        </p>

        <p className="text-sm mt-8 mb-10" style={{ color: 'var(--text-dim)' }}>
          Subagent 1 complete: Supabase schema migrated, React + Vite scaffolded.
        </p>

        <button
          onClick={onSwitchUser}
          className="text-sm underline"
          style={{ color: 'var(--text-muted)' }}
        >
          Switch user
        </button>
      </motion.div>
    </div>
  )
}
