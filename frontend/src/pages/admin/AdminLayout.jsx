import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../../api';
import { adminApi } from './adminData';

const menuItems = [
  { path: '/admin/dashboard', label: 'รายงานภาพรวม', icon: 'bi-grid-1x2' },
  { path: '/admin/accounts', label: 'บัญชีและ Role', icon: 'bi-people' },
  { path: '/admin/counselors', label: 'ผู้ให้คำปรึกษา', icon: 'bi-chat-heart' },
  { path: '/admin/security', label: 'บันทึกและความปลอดภัย', icon: 'bi-shield-check' },
];

const AdminLayout = ({ user }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [alerts, setAlerts] = useState(0);

  // จำนวนเหตุการณ์อันตรายใน 7 วัน สำหรับกระดิ่ง
  const refreshAlerts = useCallback(
    () =>
      adminApi('/security/summary')
        .then((s) => setAlerts(s.danger7d))
        .catch(() => setAlerts(0)),
    []
  );

  useEffect(() => {
    const first = setTimeout(refreshAlerts, 0);
    const t = setInterval(refreshAlerts, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [refreshAlerts]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
    window.location.reload();
  };

  return (
    <div
      className="flex h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-cyan-50 text-slate-800"
      style={{ fontFamily: "'IBM Plex Sans Thai', 'Prompt', sans-serif" }}
    >
      {/* sidebar */}
      <aside className={`${open ? 'w-64' : 'w-20'} flex flex-col bg-white/90 backdrop-blur border-r border-sky-100 transition-all duration-300 z-20`}>
        <div className="h-20 flex items-center gap-3 px-5 border-b border-sky-100">
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-300 flex items-center justify-center text-white shadow-md shadow-sky-200">
            <i className="bi bi-heart-pulse-fill text-xl"></i>
          </div>
          {open && (
            <div>
              <h1 className="text-lg font-bold leading-tight">
                Hiwjai <span className="text-sky-500 font-semibold text-sm">ฮีลใจ</span>
              </h1>
              <p className="text-[10px] font-semibold tracking-widest text-sky-400 uppercase">Admin Console</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((m) => (
            <NavLink
              key={m.path}
              to={m.path}
              title={m.label}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-white font-semibold shadow-md shadow-sky-200'
                    : 'text-slate-500 hover:bg-sky-50 hover:text-sky-600 font-medium'
                }`
              }
            >
              <i className={`bi ${m.icon} text-lg shrink-0`}></i>
              {open && <span className="whitespace-nowrap text-sm">{m.label}</span>}
            </NavLink>
          ))}
        </nav>

        {open && (
          <div className="p-4">
            <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-sky-400 to-cyan-300 text-white">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/20"></div>
              <div className="absolute -left-4 -bottom-8 w-20 h-20 rounded-full bg-white/10"></div>
              <p className="relative text-sm font-semibold leading-relaxed">
                ระบบที่ปลอดภัย<br />คือจุดเริ่มต้นของการฮีลใจ ♡
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white/80 backdrop-blur border-b border-sky-100 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setOpen(!open)} className="p-2 text-sky-500 hover:bg-sky-50 rounded-xl cursor-pointer">
              <i className="bi bi-list text-2xl"></i>
            </button>
            <div>
              <h2 className="text-lg font-bold">สวัสดีค่ะ ผู้ดูแลระบบ {user?.name || ''} ☁️</h2>
              <p className="text-xs text-slate-400">ดูแลระบบให้ทุกใจได้รับการฮีลอย่างราบรื่น</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/security')}
              className="relative p-2 text-sky-500 hover:bg-sky-50 rounded-full cursor-pointer"
              title="เหตุการณ์อันตรายใน 7 วันล่าสุด"
            >
              <i className="bi bi-bell text-xl"></i>
              {alerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 text-[10px] font-bold bg-rose-500 text-white rounded-full border-2 border-white flex items-center justify-center">
                  {alerts > 99 ? '99+' : alerts}
                </span>
              )}
            </button>

            <div className="relative group flex items-center gap-3 cursor-pointer">
              <img
                src={user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=HiwjaiAdmin'}
                alt="profile"
                className="w-10 h-10 rounded-full border-2 border-sky-300 object-cover bg-sky-50"
              />
              <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-xl shadow-sky-100 border border-sky-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-50">
                <div className="px-4 py-2 border-b border-sky-50">
                  <p className="text-sm font-semibold">{user?.name || 'Administrator'}</p>
                  <p className="text-xs text-slate-400">@{user?.username}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-500 hover:bg-rose-50 font-medium cursor-pointer"
                >
                  <i className="bi bi-box-arrow-right"></i> ออกจากระบบ
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet context={{ me: user, refreshAlerts }} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
