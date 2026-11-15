import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom'
import Login from './pages/Login'
import Booking from './pages/Booking'
import { store } from './api'

// nurse
import Layout from './pages/nurse/Layout'
import Dashboard from './pages/nurse/Dashboard'
import Schedule from './pages/nurse/Schedule'
import HomeVisit from './pages/nurse/HomeVisit'
import Leave from './pages/nurse/Leave'
import NurseBooking from './pages/nurse/Booking'
import PatientInfos from './pages/nurse/PatientInfos'

const NurseRoute = () => {
  const user = store.user()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'nurse') {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}

function App() {
  const [user, setUser] = useState(() => store.user())
  const navigate = useNavigate()

  const handleLogin = (u) => {
    setUser(u)
    if (u.role === 'nurse') {
      navigate('/nurse/dashboard', { replace: true })
    } else {
      navigate('/home', { replace: true })
    }
  }

  // หน้าที่ต้อง login ก่อนถึงเข้าได้
  const guard = (el) => (user ? el : <Navigate to="/login" replace />)

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? (user.role === 'nurse' ? '/nurse/dashboard' : '/home') : '/login'} replace />} />
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route
        path="/home"
        element={guard(<div className="p-8">สวัสดี {user?.name}</div>)}
      />
      <Route path="/booking" element={guard(<Booking />)} />


    <Route element={<NurseRoute />}>
      <Route path='/nurse' element={<Layout user={user} />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path='dashboard' element={<Dashboard />} />
        <Route path='schedule' element={<Schedule />} />
        <Route path='homevisit' element={<HomeVisit />} />
        <Route path='leave' element={<Leave />} />
        <Route path='booking' element={<NurseBooking />} />
        <Route path='patientinfos' element={<PatientInfos />} />
      </Route>
    </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App