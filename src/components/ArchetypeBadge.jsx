import React from 'react'
import { ARCHETYPES } from '../lib/quiz'

export default function ArchetypeBadge({ archetypeId, size = 'md' }) {
  const archetype = ARCHETYPES.find((a) => a.id === archetypeId)
  if (!archetype) return null

  const isLg = size === 'lg'

  return (
    <div
      className="inline-flex flex-col items-center gap-2"
      style={{ textAlign: 'center' }}
    >
      <div
        className="rounded-full flex items-center justify-center"
        style={{
          width: isLg ? '4rem' : '2.75rem',
          height: isLg ? '4rem' : '2.75rem',
          background: `${archetype.color}22`,
          border: `2px solid ${archetype.color}`,
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: isLg ? '1.5rem' : '1rem',
            height: isLg ? '1.5rem' : '1rem',
            background: archetype.color,
          }}
        />
      </div>
      <div>
        <p
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: isLg ? '1.1rem' : '0.875rem',
            color: 'var(--text)',
            lineHeight: 1.2,
          }}
        >
          {archetype.label}
        </p>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: isLg ? '0.8rem' : '0.7rem',
            color: archetype.color,
            marginTop: '0.15rem',
          }}
        >
          {archetype.tagline}
        </p>
      </div>
    </div>
  )
}
