import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getCurrentUser, setCurrentUser, clearCurrentUser } from './lib/supabase'
import NavBar from './components/NavBar'
import UserSelect from './components/UserSelect'
import Dashboard from './pages/Dashboard'
import Guests from './pages/Guests'
import Vendors from './pages/Vendors'
import Budget from './pages/Budget'
import Research from './pages/Research'
import Theme from './pages/Theme'

export default function App() {
  const [user, setUser] = useState(() => getCurrentUser())

  function handleSelectUser(userId) {
    setCurrentUser(userId)
    setUser(userId)
  }

  function handleSwitchUser() {
    clearCurrentUser()
    setUser(null)
  }

  if (!user) {
    return <UserSelect onSelect={handleSelectUser} />
  }

  return (
    <BrowserRouter>
      <div className="nav-glass" style={{
        position: 'sticky',
        top: 0,
        zIndex: 200,
        padding: '0 20px',
        height: 56,
      }}>
        <NavBar user={user} onSwitchUser={handleSwitchUser} />
      </div>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="/budget" element={<Budget user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="/guests" element={<Guests user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="/vendors" element={<Vendors user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="/research" element={<Research user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="/theme" element={<Theme user={user} />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
