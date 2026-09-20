// Shared horizontal stacked-bar + legend for budget breakdowns.
// Used on both the Dashboard (whole-wedding scope) and the Weekend tab
// (weekend-only scope) so the visualization is identical, just fed
// differently-scoped `segments`.
//
// segments: [{ key, label, color, value }]
// formatValue: (n) => string, e.g. formatUsd

import React from 'react'

export default function BudgetStackedBar({ segments = [], formatValue = (n) => n, height = 14, showLegend = true }) {
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0)
  const visible = segments.filter(seg => (seg.value || 0) > 0)

  return (
    <div>
      <div style={{
        display: 'flex', width: '100%', height, borderRadius: height / 2,
        overflow: 'hidden', background: 'var(--dark2)', border: '1px solid var(--border)',
      }}>
        {total > 0 ? visible.map(seg => (
          <div
            key={seg.key}
            title={`${seg.label}: ${formatValue(seg.value)}`}
            style={{
              width: `${(seg.value / total) * 100}%`,
              background: seg.color,
              transition: 'width 0.3s',
            }}
          />
        )) : (
          <div style={{ width: '100%', background: 'var(--dark3)' }} />
        )}
      </div>

      {showLegend && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 10 }}>
          {visible.map(seg => (
            <div key={seg.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans', fontSize: 11.5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-muted)' }}>{seg.label}</span>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatValue(seg.value)}</span>
              <span style={{ color: 'var(--text-dim)' }}>
                ({total > 0 ? Math.round((seg.value / total) * 100) : 0}%)
              </span>
            </div>
          ))}
          {visible.length === 0 && (
            <div style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: 'var(--text-dim)' }}>No spend yet</div>
          )}
        </div>
      )}
    </div>
  )
}
