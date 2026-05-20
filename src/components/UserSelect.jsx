import React, { useState } from 'react'
import { motion } from 'framer-motion'

const USERS_META = {
  kerwin: { label: 'Kerwin', color: '#8B1A28', hover: '#6E1520' },
  dani:   { label: 'Dani',   color: '#4A7C59', hover: '#3A6347' },
}

export default function UserSelect({ onSelect }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div
      className="hero-bg min-h-screen flex flex-col items-center justify-center px-4"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Floating glass card */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
        style={{
          background: 'rgba(247, 240, 227, 0.14)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(201, 168, 76, 0.35)',
          borderRadius: 24,
          padding: '52px 64px 48px',
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 8px 48px rgba(28, 18, 8, 0.22), inset 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        {/* Pre-title */}
        <p
          className="uppercase tracking-[0.28em] text-xs mb-6"
          style={{ color: 'rgba(232, 213, 163, 0.75)', fontFamily: 'DM Sans, sans-serif' }}
        >
          Welcome to
        </p>

        {/* Main Art Deco title */}
        <h1
          className="text-5xl md:text-6xl mb-2 uppercase"
          style={{
            fontFamily: '"Cinzel", Georgia, serif',
            color: '#F7F0E3',
            letterSpacing: '0.06em',
            textShadow: '0 2px 24px rgba(201, 168, 76, 0.25)',
            lineHeight: 1.1,
          }}
        >
          Dani &amp; Kerwin
        </h1>

        {/* Gold deco divider */}
        <div className="deco-divider my-4" style={{ color: 'rgba(201,168,76,0.7)' }}>
          ◆
        </div>

        {/* Subtitle */}
        <h2
          className="text-xl italic mb-10"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            color: 'rgba(232, 213, 163, 0.85)',
            letterSpacing: '0.02em',
          }}
        >
          Wedding OS
        </h2>

        {/* Prompt */}
        <p
          className="text-xs uppercase tracking-[0.2em] mb-7"
          style={{ color: 'rgba(247, 240, 227, 0.5)', fontFamily: 'DM Sans, sans-serif' }}
        >
          Who&apos;s planning today?
        </p>

        {/* User buttons */}
        <div className="flex gap-4 justify-center">
          {Object.entries(USERS_META).map(([id, meta]) => (
            <motion.button
              key={id}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(id)}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered === id ? meta.hover : 'transparent',
                border: `1.5px solid ${meta.color}`,
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                padding: '14px 36px',
                color: hovered === id ? '#F7F0E3' : meta.color === '#8B1A28' ? '#F4C0BB' : '#A8D5B8',
                fontFamily: '"Cinzel", Georgia, serif',
                fontSize: '0.9rem',
                fontWeight: 600,
                letterSpacing: '0.12em',
                transition: 'background 0.18s, color 0.18s',
                minWidth: 130,
              }}
            >
              {meta.label}
            </motion.button>
          ))}
        </div>

        {/* Small sunburst ornament below */}
        <div style={{ marginTop: 28, opacity: 0.35, display: 'flex', justifyContent: 'center' }}>
          <span className="deco-sunburst" style={{ width: 32, height: 32 }} />
        </div>
      </motion.div>
    </div>
  )
}
