<<<<<<< HEAD
import { NavLink, Outlet } from 'react-router-dom'
import { logout } from '../../api'
=======
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { logout, svc, store } from '../../api'
import { avatarFallback } from './utils'
>>>>>>> 1171ff0216804a24143f7a001b796244d7093726
import './patient.css'

const links = [
  { to: '/patient/home', label: 'HOME' },
  { to: '/patient/booking', label: 'APPOINTMENT' },
  { to: '/patient/records', label: 'RECORDS' },
  { to: '/patient/homevisit', label: 'HOME VISIT' },
  { to: '/patient/activities', label: 'ACTIVITIES' },
<<<<<<< HEAD
  { to: '/patient/chat', label: 'CHAT' },
]

export default function PatientLayout() {
=======
  { to: '/patient/chat', label: 'CHAT (LINE)' },
]

export default function PatientLayout() {
  const [profile, setProfile] = useState(null) // ข้อมูลผู้ป่วยจาก DB (ชุดเดียวกับฝั่ง nurse)

  useEffect(() => {
    let off = false
    svc('booking', '/api/patient/me')
      .then((r) => !off && setProfile(r.data))
      .catch(() => {})
    return () => { off = true }
  }, [])

>>>>>>> 1171ff0216804a24143f7a001b796244d7093726
  const handleLogout = () => {
    logout()
    window.location.assign('/login') // โหลดใหม่เพื่อล้าง state ของ App
  }

<<<<<<< HEAD
=======
  const cached = store.user()
  const name = profile ? `${profile.first_name} ${profile.last_name}` : cached?.name || ''
  const avatar = profile?.avatar_url || cached?.avatar_url || avatarFallback(profile?.username || cached?.username)

>>>>>>> 1171ff0216804a24143f7a001b796244d7093726
  return (
    <div className="pt-root">
      <nav className="pt-nav">
        <b>HealthConnect</b>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {l.label}
          </NavLink>
        ))}
<<<<<<< HEAD
=======
        <span className="pt-user" title={name}>
          <img src={avatar} alt="" onError={(e) => { e.currentTarget.src = avatarFallback(name) }} />
          <span>{name}</span>
        </span>
>>>>>>> 1171ff0216804a24143f7a001b796244d7093726
        <button onClick={handleLogout}>ออกจากระบบ</button>
      </nav>

      <main className="pt-main">
<<<<<<< HEAD
        <Outlet />
=======
        <Outlet context={{ profile }} />
>>>>>>> 1171ff0216804a24143f7a001b796244d7093726
      </main>
    </div>
  )
}