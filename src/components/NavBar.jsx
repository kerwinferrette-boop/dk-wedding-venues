import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { USERS } from '../lib/supabase'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Home' },
  { path: '/venues',    label: 'Venues' },
  { path: '/guests',    label: 'Guests' },
  { path: '/vendors',   label: 'Vendors' },
  { path: '/vibe',      label: 'Vibe' },
]

export default function NavBar({ user, onSwitchUser }) {
  const navigate = useNavigate()
  const location = useLocation()
  const userMeta = USERS[user] || USERS.kerwin

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: '100%' }}>

      {/* D & K logo */}
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: '"Playfair Display", serif',
          fontSize: 17, fontWeight: 700, letterSpacing: '0.04em',
          color: userMeta.color, padding: '0 10px 0 0', flexShrink: 0,
          lineHeight: 1,
        }}
      >
        D&K
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0, marginRight: 4 }} />

      {/* Nav links */}
      <nav style={{ display: 'flex', gap: 1 }}>
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                background: active ? `${userMeta.color}18` : 'none',
                border: `1px solid ${active ? userMeta.color + '40' : 'transparent'}`,
                borderRadius: 6,
                cursor: 'pointer',
                padding: '4px 10px',
                color: active ? userMeta.color : 'var(--text-muted)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.8rem',
                fontWeight: active ? 600 : 400,
                transition: 'all 0.12s',
                lineHeight: 1.5,
                whiteSpace: 'nowrap',
              }}
              onMouseOver={e => {
                if (!active) {
                  e.currentTarget.style.color = 'var(--text)'
                  e.currentTarget.style.background = 'rgba(0,0,0,0.05)'
                }
              }}
              onMouseOut={e => {
                if (!active) {
                  e.currentTarget.style.color = 'var(--text-muted)'
                  e.currentTarget.style.background = 'none'
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

      {/* User avatar */}
      <button
        onClick={onSwitchUser}
        title={`Signed in as ${userMeta.label} · click to switch`}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: userMeta.color, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 13, fontWeight: 800,
          fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
          boxShadow: `0 0 0 2px var(--dark), 0 0 0 3px ${userMeta.color}50`,
        }}
      >
        {userMeta.label[0]}
      </button>
    </div>
  )
}
