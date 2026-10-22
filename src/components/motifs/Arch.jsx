import React from 'react'

/** A roman arch outline — the single strongest anti-rectangle shape here. */
export default function Arch({ color = '#000', opacity = 1, size = 96, strokeWidth = 1 }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 100 130" fill="none" style={{ opacity, display: 'block', overflow: 'visible' }} aria-hidden="true">
      <path d="M6 128 L6 52 A 44 44 0 0 1 94 52 L94 128" stroke={color} strokeWidth={strokeWidth * 1.3} strokeLinecap="round" />
      <path d="M17 128 L17 54 A 33 33 0 0 1 83 54 L83 128" stroke={color} strokeWidth={strokeWidth * 0.6} strokeOpacity={0.5} />
      <circle cx="50" cy="52" r={2.6} fill={color} fillOpacity={0.6} />
    </svg>
  )
}
