import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Booking from './pages/Booking'
import { store } from './api'

function App() {
  const [user, setUser] = useState(() => store.user())
  const navigate = useNavigate()

  const handleLogin = (u) => {
    setUser(u)
    navigate('/home', { replace: true })
  }

  // หน้าที่ต้อง login ก่อนถึงเข้าได้
  const guard = (el) => (user ? el : <Navigate to="/login" replace />)

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? '/home' : '/login'} replace />} />
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route
        path="/home"
        element={guard(<div className="p-8">สวัสดี {user?.name}</div>)}
      />
      <Route path="/booking" element={guard(<Booking />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App