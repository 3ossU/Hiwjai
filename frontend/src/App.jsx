import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import { store } from './api'

function App() {
  const [user, setUser] = useState(() => store.user())
  const navigate = useNavigate()

  const handleLogin = (u) => {
    setUser(u)
    navigate('/home', { replace: true })
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? '/home' : '/login'} replace />} />
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route
        path="/home"
        element={user ? <div className="p-8">สวัสดี {user.name}</div> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App