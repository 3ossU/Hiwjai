import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { logout, svc, store } from '../../api'
import { avatarFallback } from './utils'
import './patient.css'

const links = [
  { to: '/patient/home', label: 'HOME' },
  { to: '/patient/booking', label: 'APPOINTMENT' },
  { to: '/patient/records', label: 'RECORDS' },
  { to: '/patient/homevisit', label: 'HOME VISIT' },
  { to: '/patient/activities', label: 'ACTIVITIES' },
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

  const handleLogout = () => {
    logout()
    window.location.assign('/login') // โหลดใหม่เพื่อล้าง state ของ App
  }

  const cached = store.user()
  const name = profile ? `${profile.first_name} ${profile.last_name}` : cached?.name || ''
  const avatar = profile?.avatar_url || cached?.avatar_url || avatarFallback(profile?.username || cached?.username)

  return (
    <div className="pt-root">
      <nav className="pt-nav">
        <b>HealthConnect</b>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {l.label}
          </NavLink>
        ))}
        <span className="pt-user" title={name}>
          <img src={avatar} alt="" onError={(e) => { e.currentTarget.src = avatarFallback(name) }} />
          <span>{name}</span>
        </span>
        <button onClick={handleLogout}>ออกจากระบบ</button>
      </nav>

      <main className="pt-main">
        <Outlet context={{ profile }} />
      </main>
    </div>
  )
}