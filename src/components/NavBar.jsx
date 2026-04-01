import React from 'react'
import { useNavigate } from 'react-router-dom'
import { USERS } from '../lib/supabase'

export default function NavBar({ user, onSwitchUser, children }) {
  const navigate = useNavigate()
  const userMeta = USERS[user] || USERS.kerwin

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={() => navigate('/dashboard')}
        title="Dashboard"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 6px',
          borderRadius: 8,
          color: 'var(--text-muted)',
          fontSize: 20,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        ⌂
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      <button
        onClick={onSwitchUser}
        title={`${userMeta.label} · switch user`}
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: userMeta.color,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 14,
          fontWeight: 800,
          fontFamily: 'DM Sans, sans-serif',
          flexShrink: 0,
        }}
      >
        {userMeta.label[0]}
      </button>
    </div>
  )
}
