<<<<<<< HEAD
import { NavLink, Outlet, useLocation } from 'react-router-dom';
=======

import { NavLink, Outlet } from 'react-router-dom';
>>>>>>> 2b601b9f5e803bb2fb27ee472c6447270a073eac
import { store } from './api';

function DoctorLayout() {
    const user = store.user();
<<<<<<< HEAD
    const location = useLocation();

    const menus = [
        { to: '/dr/appointments', label: 'ตารางนัดหมาย', title: 'ตารางนัดหมาย' },
        { to: '/dr/patient-history', label: 'ดูประวัติคนไข้', title: 'ประวัติคนไข้' },
        { to: '/dr/manage-leave', label: 'จัดการวันหยุด', title: 'จัดการวันหยุด' },
        { to: '/dr/prescription', label: 'ฟอร์มสั่งยา', title: 'ฟอร์มสั่งยา' },
    ];

    const currentTitle = menus.find((m) => location.pathname.startsWith(m.to))?.title;
=======
>>>>>>> 2b601b9f5e803bb2fb27ee472c6447270a073eac

    return (
        <div className="doctor-portal">

            {/* Sidebar */}
            <aside className="sidebar">

                <div className="brand">
<<<<<<< HEAD
=======

>>>>>>> 2b601b9f5e803bb2fb27ee472c6447270a073eac
                    <div>
                        <h2>HIWJAI</h2>
                        <span>DOCTOR PORTAL</span>
                    </div>
                </div>

                <div className="sidebar-menu">
                    <p className="menu-heading">เมนูหลัก</p>

<<<<<<< HEAD
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
=======
                    <NavLink
                        to="/appointments"
                        className={({ isActive }) =>
                            `menu-item ${isActive ? 'active' : ''}`
                        }
                    >

                        <span>ตารางนัดหมาย</span>
                    </NavLink>

                    <NavLink
                        to="/patient-history"
                        className={({ isActive }) =>
                            `menu-item ${isActive ? 'active' : ''}`
                        }
                    >

                        <span>ดูประวัติคนไข้</span>
                    </NavLink>

                    <NavLink
                        to="/manage-leave"
                        className={({ isActive }) =>
                            `menu-item ${isActive ? 'active' : ''}`
                        }
                    >

                        <span>จัดการวันหยุด</span>
                    </NavLink>

                    <NavLink
                        to="/prescription"
                        className={({ isActive }) =>
                            `menu-item ${isActive ? 'active' : ''}`
                        }
                    >

                        <span>ฟอร์มสั่งยา</span>
                    </NavLink>
>>>>>>> 2b601b9f5e803bb2fb27ee472c6447270a073eac
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
                        store.clear();
                        window.location.href = '/login';
                    }}
                >
                    ออกจากระบบ
                </button>

            </aside>

            {/* Main Content */}
            <main className="main-content">

                <header className="topbar">
                    <div className="breadcrumb">
<<<<<<< HEAD
                        Doctor Portal / <strong>{currentTitle}</strong>
=======
                        Doctor Portal /
                        <strong>
                            {location.pathname === '/appointments' && 'ตารางนัดหมาย'}
                            {location.pathname === '/patient-history' && 'ประวัติคนไข้'}
                            {location.pathname === '/manage-leave' && 'จัดการวันหยุด'}
                            {location.pathname === '/prescription' && 'ฟอร์มสั่งยา'}
                        </strong>
>>>>>>> 2b601b9f5e803bb2fb27ee472c6447270a073eac
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
    );
}

<<<<<<< HEAD
export default DoctorLayout;
=======
export default DoctorLayout;
>>>>>>> 2b601b9f5e803bb2fb27ee472c6447270a073eac
