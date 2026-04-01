import React, { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { getCurrentUser, setCurrentUser, clearCurrentUser } from './lib/supabase'
import NavBar from './components/NavBar'
import UserSelect from './components/UserSelect'
import Quiz from './pages/Quiz'
import Results from './pages/Results'
import Dashboard from './pages/Dashboard'
import Guests from './pages/Guests'
import Vendors from './pages/Vendors'
import Venues from './pages/Venues'
import VibeScan from './pages/VibeScan'

function InitialRedirect() {
  const navigate = useNavigate()
  const done = useRef(false)

  useEffect(() => {
    if (!done.current) {
      done.current = true
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  return null
}

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
      <InitialRedirect />
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 200,
        background: 'var(--dark)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 20px',
      }}>
        <NavBar user={user} onSwitchUser={handleSwitchUser} />
      </div>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="/quiz" element={<Quiz user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="/results" element={<Results user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="/guests" element={<Guests user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="/vendors" element={<Vendors user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="/venues" element={<Venues user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="/vibe" element={<VibeScan user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
