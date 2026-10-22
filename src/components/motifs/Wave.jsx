import React from 'react'

/** Layered coastline swells — horizontal, so it reads as a band or rule. */
export default function Wave({ color = '#000', opacity = 1, size = 96, strokeWidth = 1 }) {
  const rows = [0, 9, 18]
  return (
    <svg width={size} height={size * 0.45} viewBox="0 0 200 90" fill="none" style={{ opacity, display: 'block', overflow: 'visible' }} aria-hidden="true">
      {rows.map((dy, i) => (
        <path
          key={dy}
          d={`M0 ${34 + dy} C 25 ${18 + dy}, 45 ${50 + dy}, 70 ${34 + dy} S 115 ${18 + dy}, 140 ${34 + dy} S 185 ${50 + dy}, 200 ${34 + dy}`}
          stroke={color}
          strokeWidth={strokeWidth * (1.3 - i * 0.3)}
          strokeOpacity={1 - i * 0.28}
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}
