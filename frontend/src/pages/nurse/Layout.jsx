import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const Layout = ({ user }) => {
const navigate = useNavigate();
const [isSidebarOpen, setIsSidebarOpen] = useState(true);

const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
};


const menuItems = [
    { path: '/nurse/dashboard', label: 'หน้าหลัก', icon: 'bi-house-door' },
    { path: '/nurse/booking', label: 'ตารางนัดหมาย', icon: 'bi-calendar-check' },
    { path: '/nurse/homevisit', label: 'ตารางเยี่ยมบ้าน', icon: 'bi-geo-alt' },
    { path: '/nurse/leave', label: 'จัดการวันลา', icon: 'bi-file-earmark-text' },
    { path: '/nurse/patientinfos', label: 'ข้อมูลผู้ป่วย', icon: 'bi-people' },
    { path: '/nurse/adduser', label: 'เพิ่มผู้ป่วยใหม่', icon: 'bi-person-plus' }
];

return (
    <div className="flex h-screen overflow-hidden bg-ivory text-black"
    style={{ fontFamily: "'IBM Plex Sans Thai', 'Prompt', sans-serif" }}>

        {/* sidebar */}
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col bg-white border-r border-[#00c0e8]/20 transition-all duration-300 ease-in-out shadow-sm z-20`}>

            {/* icon */}
            <div className="h-20 flex items-center justify-center border-b border-[#00c0e8]/10 px-4">
                <div className="flex items-center gap-3 text-[#00c0e8]">
                    <i className="bi bi-heart-pulse text-3xl"></i>
                    
                    {isSidebarOpen && (
                        <div className="animate-fade-in">
                            <h1 className="mt-2 text-xl font-bold text-black leading-tight">Hiwjai</h1>
                            <p className="mt-2 text-[10px] text-[#00c0e8] font-medium tracking-wide">Care with understanding</p>
                        </div>
                    )}
                </div>
            </div>

            {/* link sidebar */}
            <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => (
                    <NavLink key={item.path} to={item.path}
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 
                        ${isActive
                            ? 'bg-[#00c0e8] text-white font-semibold shadow-md shadow-[#00c0e8]/20'
                            : 'text-black/70 hover:bg-[#00c0e8]/10 hover:text-[#00c0e8] font-medium'
                        }`}>

                        <div className="shrink-0">
                            <i className={`bi ${item.icon} text-xl`}></i>
                        </div>

                        {isSidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}

                    </NavLink>
                ))}
            </nav>


            {isSidebarOpen && (
                <div className="p-4 relative mt-auto">
                    <div className="bg-ivory p-5 rounded-2xl text-center border border-[#00c0e8]/30 shadow-sm">
                        <p className="text-[#00c0e8] text-sm font-semibold leading-relaxed">
                            ดูแลใจ...<br />ไปด้วยกัน <span className="text-[#00c0e8]">♡</span>
                        </p>
                    </div>
                </div>
            )}

        </aside>




        {/* navbar */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <header className="h-20 bg-white border-b border-[#00c0e8]/10 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">

                {/* ฝั่งซ้าย */}
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 text-[#00c0e8] hover:bg-[#00c0e8]/10 rounded-lg transition-colors cursor-pointer">
                        <i className="bi bi-list text-2xl"></i>
                    </button>

                    <div>
                        <h2 className="text-xl font-bold text-black">สวัสดีค่ะ คุณพยาบาล {user?.name || ''} ♡</h2>
                        <p className="text-sm text-black/60 font-medium">ขอบคุณที่คอยดูแลและเป็นที่พึ่งให้คนไข้นะคะ</p>
                    </div>
                </div>

                {/* ฝั่งขวา */}
                <div className="flex items-center gap-6">
                    <button className="relative p-2 text-[#00c0e8] hover:bg-[#00c0e8]/10 rounded-full transition-colors cursor-pointer">
                        <i className="bi bi-bell text-xl"></i>
                        <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>

                    {/* profile */}
                    <div className="flex items-center gap-3 cursor-pointer group relative">
                        <img src={user?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Nurse"} alt="profile"
                        className="w-10 h-10 rounded-full border-2 border-[#00c0e8] object-cover shadow-sm"/>
                        
                        {/* drop down */}
                        <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-lg border border-[#00c0e8]/20 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">

                            <div className="px-4 py-2 border-b border-[#00c0e8]/10">
                                <p className="text-sm font-semibold text-black">{user?.name || 'Nurse Name'}</p>
                                <p className="text-xs text-black/50">{user?.email || 'nurse@mindcare.com'}</p>
                            </div>

                            <button onClick={handleLogout}
                            className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 mt-1 font-medium transition-colors cursor-pointer">
                                <i className="bi bi-box-arrow-right text-base"></i>
                                ออกจากระบบ
                            </button>
                        </div>

                    </div>

                </div>

            </header>


            {/* outlet */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-ivory p-6 lg:p-8 relative">
                <div className="relative z-0 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>

        </div>


    </div>
);
};

export default Layout;