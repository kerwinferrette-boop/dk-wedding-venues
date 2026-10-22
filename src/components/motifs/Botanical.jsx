import React from 'react'

/**
 * A sprig: curved stem with alternating leaves and a couple of buds.
 * Every path takes its colour from props so one recipe recolours the suite.
 */
export default function Botanical({ color = '#000', opacity = 1, size = 96, strokeWidth = 1 }) {
  const leaf = (x, y, rot, s = 1) => (
    <path
      key={`${x}-${y}-${rot}`}
      d="M0 0 C 10 -8, 24 -6, 30 0 C 24 6, 10 8, 0 0 Z"
      transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}
      fill={color}
      fillOpacity={0.22}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  )
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" style={{ opacity, display: 'block', overflow: 'visible' }} aria-hidden="true">
      <path d="M14 112 C 34 86, 50 58, 58 20" stroke={color} strokeWidth={strokeWidth * 1.2} strokeLinecap="round" />
      {leaf(30, 86, -28, 0.9)}
      {leaf(30, 80, 158, 0.7)}
      {leaf(44, 58, -34, 1)}
      {leaf(44, 52, 152, 0.75)}
      {leaf(54, 32, -42, 0.8)}
      <circle cx="58" cy="18" r={3.4} fill={color} fillOpacity={0.5} />
      <circle cx="66" cy="28" r={2.2} fill={color} fillOpacity={0.35} />
    </svg>
  )
}
