
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { store } from './api'

function DoctorLayout() {
    const user = store.user()
    const location = useLocation()

    const menus = [
        {
            to: '/dr/appointments',
            label: 'ตารางนัดหมาย',
            title: 'ตารางนัดหมาย'
        },
        {
            to: '/dr/patient-history',
            label: 'ดูประวัติคนไข้',
            title: 'ประวัติคนไข้'
        },
        {
            to: '/dr/manage-leave',
            label: 'จัดการวันหยุด',
            title: 'จัดการวันหยุด'
        },
        {
            to: '/dr/prescription',
            label: 'จัดการผู้ป่วยและการรักษา',
            title: 'จัดการผู้ป่วยและการรักษา'
        },
    ]

    const currentTitle = menus.find(
        (m) => location.pathname.startsWith(m.to)
    )?.title

    return (
        <div className="doctor-portal">

            {/* Sidebar */}
            <aside className="sidebar">

                <div className="brand">
                    <div>
                        <h2>HIWJAI</h2>
                        <span>DOCTOR PORTAL</span>
                    </div>
                </div>

                <div className="sidebar-menu">
                    <p className="menu-heading">เมนูหลัก</p>

                    {menus.map((m) => (
                        <NavLink
                            key={m.to}
                            to={m.to}
                            className={({ isActive }) =>
                                `menu-item ${isActive ? 'active' : ''}`
                            }
                        >
                            <span>{m.label}</span>
                        </NavLink>
                    ))}
                </div>

                {/* ข้อมูลแพทย์ */}
                <div className="sidebar-profile">
                    <div className="profile-avatar">
                        {user?.name?.charAt(0) || 'หมอ'}
                    </div>

                    <div>
                        <strong>{user?.name || 'แพทย์'}</strong>
                        <span>{user?.username || 'Doctor'}</span>
                    </div>
                </div>

                <button
                    className="logout-button"
                    onClick={() => {
                        store.clear()
                        window.location.href = '/login'
                    }}
                >
                    ออกจากระบบ
                </button>

            </aside>

            {/* Main Content */}
            <main className="main-content">

                <header className="topbar">
                    <div className="breadcrumb">
                        Doctor Portal / <strong>{currentTitle}</strong>
                    </div>

                    <div className="topbar-actions">
                        <button className="topbar-avatar">
                            {user?.name?.charAt(0) || 'หมอ'}
                        </button>
                    </div>
                </header>

                <Outlet />

            </main>
        </div>
    )
}

export default DoctorLayout
