import React from 'react'

/** Loose confetti of dots and four-point sparks. Deterministic, not random,
 *  so a card doesn't reshuffle itself on every re-render. */
const POINTS = [
  [14, 22, 2.4], [38, 10, 1.4], [62, 30, 3.0], [88, 16, 1.8], [26, 52, 1.6],
  [54, 66, 2.2], [82, 56, 1.3], [16, 84, 2.0], [46, 94, 1.5], [74, 86, 2.6],
]
const SPARKS = [[70, 12], [30, 74], [94, 70]]

export default function Scatter({ color = '#000', opacity = 1, size = 96, strokeWidth = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" fill="none" style={{ opacity, display: 'block', overflow: 'visible' }} aria-hidden="true">
      {POINTS.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={color} fillOpacity={0.25 + (r / 10)} />
      ))}
      {SPARKS.map(([x, y], i) => (
        <path
          key={`s${i}`}
          d={`M${x} ${y - 7} Q ${x} ${y}, ${x + 7} ${y} Q ${x} ${y}, ${x} ${y + 7} Q ${x} ${y}, ${x - 7} ${y} Q ${x} ${y}, ${x} ${y - 7} Z`}
          fill={color}
          fillOpacity={0.4}
          stroke={color}
          strokeWidth={strokeWidth * 0.4}
        />
      ))}
    </svg>
  )
}
