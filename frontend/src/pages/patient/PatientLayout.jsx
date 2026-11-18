import { NavLink, Outlet } from 'react-router-dom'
import { logout } from '../../api'
import './patient.css'

const links = [
  { to: '/patient/home', label: 'HOME' },
  { to: '/patient/booking', label: 'APPOINTMENT' },
  { to: '/patient/records', label: 'RECORDS' },
  { to: '/patient/homevisit', label: 'HOME VISIT' },
  { to: '/patient/activities', label: 'ACTIVITIES' },
  { to: '/patient/chat', label: 'CHAT' },
]

export default function PatientLayout() {
  const handleLogout = () => {
    logout()
    window.location.assign('/login') // โหลดใหม่เพื่อล้าง state ของ App
  }

  return (
    <div className="pt-root">
      <nav className="pt-nav">
        <b>HealthConnect</b>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {l.label}
          </NavLink>
        ))}
        <button onClick={handleLogout}>ออกจากระบบ</button>
      </nav>

      <main className="pt-main">
        <Outlet />
      </main>
    </div>
  )
}