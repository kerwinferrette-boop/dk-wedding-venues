import React from 'react'

/** A fan / sunburst: radiating rays under nested arcs. */
export default function Deco({ color = '#000', opacity = 1, size = 96, strokeWidth = 1 }) {
  const rays = Array.from({ length: 9 }, (_, i) => {
    const a = (Math.PI / 8) * i
    return { x: 60 - Math.cos(a) * 52, y: 60 - Math.sin(a) * 52 }
  })
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 120 70" fill="none" style={{ opacity, display: 'block', overflow: 'visible' }} aria-hidden="true">
      {rays.map((p, i) => (
        <line key={i} x1="60" y1="60" x2={p.x} y2={p.y} stroke={color} strokeWidth={strokeWidth * 0.7} strokeOpacity={0.45} strokeLinecap="round" />
      ))}
      <path d="M8 60 A 52 52 0 0 1 112 60" stroke={color} strokeWidth={strokeWidth * 1.2} strokeLinecap="round" />
      <path d="M22 60 A 38 38 0 0 1 98 60" stroke={color} strokeWidth={strokeWidth * 0.7} strokeOpacity={0.6} />
      <path d="M36 60 A 24 24 0 0 1 84 60" stroke={color} strokeWidth={strokeWidth * 0.5} strokeOpacity={0.4} />
    </svg>
  )
}
