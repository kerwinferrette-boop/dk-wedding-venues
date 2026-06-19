// Theme tab — full-screen interactive stationery & design hub.
// Loads /stationery.html (built from la-valencia-suite.html) in a full-height
// iframe so all controls (palette, font, text, view mode, Pinterest) live inside.

import React, { useRef, useState } from 'react'

export default function Theme() {
  const iframeRef = useRef(null)
  const [loaded, setLoaded] = useState(false)

  return (
    <div style={{
      background: 'var(--dark)',
      height: 'calc(100vh - 56px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{
              fontSize: 9, letterSpacing: '0.18em', color: 'var(--gold)',
              textTransform: 'uppercase', fontFamily: 'DM Sans',
            }}>
              Design Studio
            </div>
            <div style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: 16, color: 'var(--text)', lineHeight: 1.2,
            }}>
              Theme & Stationery
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Sans',
            letterSpacing: '0.05em',
          }}>
            Controls are inside the canvas →
          </div>
          <a
            href="/stationery.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'transparent',
              border: '1px solid var(--gold-border)',
              color: 'var(--gold)',
              borderRadius: 6,
              padding: '4px 10px',
              fontFamily: 'DM Sans',
              fontSize: 11,
              cursor: 'pointer',
              textDecoration: 'none',
              letterSpacing: '0.04em',
            }}
          >
            Open full screen ↗
          </a>
        </div>
      </div>

      {/* Iframe — the interactive stationery hub */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {!loaded && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--dark)', zIndex: 10,
          }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 18, color: 'var(--text-muted)',
              }}>
                Loading design canvas…
              </div>
              <div style={{
                width: 40, height: 1, background: 'var(--gold-border)',
              }} />
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="/stationery.html"
          title="Theme & Stationery Studio"
          onLoad={() => setLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        />
      </div>
    </div>
  )
}
