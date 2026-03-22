import React from 'react'
import { motion } from 'framer-motion'

export default function UserSelect({ onSelect }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--dark)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <p
          className="text-xs tracking-[0.2em] uppercase mb-4"
          style={{ color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}
        >
          Welcome to
        </p>

        <h1
          className="text-5xl md:text-6xl mb-1"
          style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
        >
          Dani & Kerwin
        </h1>

        <h2
          className="text-2xl italic mb-14"
          style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-muted)' }}
        >
          Wedding OS
        </h2>

        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Who's planning today?
        </p>

        <div className="flex gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect('kerwin')}
            className="px-10 py-4 text-white font-medium text-base"
            style={{
              background: '#A51C30',
              borderRadius: 'var(--radius)',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Kerwin
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect('dani')}
            className="px-10 py-4 text-white font-medium text-base"
            style={{
              background: '#2D6A4F',
              borderRadius: 'var(--radius)',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Dani
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
