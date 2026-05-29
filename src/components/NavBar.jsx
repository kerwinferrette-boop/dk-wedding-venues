import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { USERS } from '../lib/supabase'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Home' },
  { path: '/budget',    label: 'Budget' },
  { path: '/guests',    label: 'Guests' },
  { path: '/vendors',   label: 'Vendors' },
]

export default function NavBar({ user, onSwitchUser }) {
  const navigate = useNavigate()
  const location = useLocation()
  const userMeta = USERS[user] || USERS.kerwin

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 0 }}>

      {/* Logo */}
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '0 12px 0 0', flexShrink: 0, lineHeight: 0,
        }}
      >
        <img
          src="/logo.png"
          alt="D&K"
          style={{ height: 40, display: 'block', mixBlendMode: 'multiply' }}
        />
      </button>

      {/* Gold hairline divider */}
      <div style={{ width: 1, height: 18, background: 'var(--gold-border)', flexShrink: 0, marginRight: 12 }} />

      {/* Nav links */}
      <nav style={{ display: 'flex', gap: 2 }}>
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: active ? '1.5px solid var(--gold)' : '1.5px solid transparent',
                borderRadius: 0,
                cursor: 'pointer',
                padding: '4px 11px 2px',
                color: active ? 'var(--gold)' : 'var(--text-muted)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.78rem',
                fontWeight: active ? 600 : 400,
                letterSpacing: active ? '0.04em' : '0.02em',
                transition: 'all 0.15s',
                lineHeight: 1.5,
                whiteSpace: 'nowrap',
              }}
              onMouseOver={e => {
                if (!active) {
                  e.currentTarget.style.color = 'var(--text)'
                  e.currentTarget.style.borderBottomColor = 'var(--gold-border)'
                }
              }}
              onMouseOut={e => {
                if (!active) {
                  e.currentTarget.style.color = 'var(--text-muted)'
                  e.currentTarget.style.borderBottomColor = 'transparent'
                }
              }}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User avatar — gold ring */}
      <button
        onClick={onSwitchUser}
        title={`Signed in as ${userMeta.label} · click to switch`}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: userMeta.color, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, fontWeight: 700,
          fontFamily: '"Cinzel", Georgia, serif', flexShrink: 0,
          letterSpacing: '0.05em',
          boxShadow: `0 0 0 2px var(--dark), 0 0 0 3.5px var(--gold)`,
        }}
      >
        {userMeta.label[0]}
      </button>
    </div>
  )
}
