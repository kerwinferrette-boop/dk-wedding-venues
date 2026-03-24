import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getCurrentUser, setCurrentUser, clearCurrentUser } from './lib/supabase'
import UserSelect from './components/UserSelect'
import Quiz from './pages/Quiz'
import Results from './pages/Results'
import Dashboard from './pages/Dashboard'
import Guests from './pages/Guests'
import Vendors from './pages/Vendors'

export default function App() {
  const [user, setUser] = useState(getCurrentUser())

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
      <Routes>
        <Route path="/" element={<Navigate to="/quiz" replace />} />
        <Route path="/quiz" element={<Quiz user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="/results" element={<Results user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="/dashboard" element={<Dashboard user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="/guests" element={<Guests user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="/vendors" element={<Vendors user={user} onSwitchUser={handleSwitchUser} />} />
        <Route path="*" element={<Navigate to="/quiz" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
