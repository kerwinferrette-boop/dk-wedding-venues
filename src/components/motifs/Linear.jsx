import React from 'react'

/** A hairline rule interrupted by a small lozenge — the quietest option. */
export default function Linear({ color = '#000', opacity = 1, size = 96, strokeWidth = 1 }) {
  return (
    <svg width={size} height={14} viewBox="0 0 200 14" fill="none" style={{ opacity, display: 'block', overflow: 'visible' }} aria-hidden="true">
      <line x1="0" y1="7" x2="78" y2="7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="122" y1="7" x2="200" y2="7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M100 1 L108 7 L100 13 L92 7 Z" fill={color} fillOpacity={0.3} stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinejoin="round" />
      <circle cx="84" cy="7" r={1.4} fill={color} fillOpacity={0.55} />
      <circle cx="116" cy="7" r={1.4} fill={color} fillOpacity={0.55} />
    </svg>
  )
}
