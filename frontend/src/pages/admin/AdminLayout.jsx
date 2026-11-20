import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../../api';
import { adminApi, ROLES } from './adminData';

const toDate = (s) => new Date(typeof s === 'string' ? s.replace(' ', 'T') : s).getTime();

// เวลาแบบ "x นาทีที่แล้ว"
const timeAgo = (s) => {
  const t = toDate(s);
  if (Number.isNaN(t)) return '-';
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return 'เมื่อสักครู่';
  if (sec < 3600) return `${Math.floor(sec / 60)} นาทีที่แล้ว`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(sec / 86400)} วันที่แล้ว`;
};

const menuItems = [
  { path: '/admin/dashboard', label: 'รายงานภาพรวม', icon: 'bi-grid-1x2' },
  { path: '/admin/accounts', label: 'บัญชีและ Role', icon: 'bi-people' },
  { path: '/admin/counselors', label: 'ผู้ให้คำปรึกษา', icon: 'bi-chat-heart' },
  { path: '/admin/security', label: 'บันทึกและความปลอดภัย', icon: 'bi-shield-check' },
];

const AdminLayout = ({ user }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [alerts, setAlerts] = useState(0); // จำนวนเหตุการณ์อันตรายใน 7 วัน
  const [events, setEvents] = useState([]); // รายการล่าสุดที่แสดงในกระดิ่ง
  const [menu, setMenu] = useState(null); // 'bell' | 'profile' | null
  const menusRef = useRef(null);

  // id ล่าสุดที่ admin คนนี้เปิดดูแล้ว (เก็บในเครื่อง แยกตาม username)
  const seenKey = `hiwjai.admin.seenAlert.${user?.username || ''}`;
  const [lastSeen, setLastSeen] = useState(() => {
    try {
      return Number(localStorage.getItem(seenKey)) || 0;
    } catch {
      return 0;
    }
  });

  const refreshAlerts = useCallback(
    () =>
      Promise.all([
        adminApi('/security/summary').then((s) => setAlerts(s.danger7d)),
        adminApi('/security/logs?level=danger&limit=10').then((rows) => {
          const since = Date.now() - 7 * 24 * 3600 * 1000;
          setEvents(rows.filter((r) => toDate(r.time) >= since));
        }),
      ]).catch(() => {}),
    []
  );

  // ปิดเมนูเมื่อคลิกนอกพื้นที่ หรือกด Esc
  useEffect(() => {
    if (!menu) return;
    const onClick = (e) => {
      if (menusRef.current && !menusRef.current.contains(e.target)) setMenu(null);
    };
    const onKey = (e) => e.key === 'Escape' && setMenu(null);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const unread = events.filter((e) => e.id > lastSeen).length;

  const markAllRead = () => {
    const top = events.reduce((m, e) => Math.max(m, e.id), lastSeen);
    setLastSeen(top);
    try {
      localStorage.setItem(seenKey, String(top));
    } catch {
      /* ไม่มี localStorage ก็แค่ไม่จำ */
    }
  };

  const toggleMenu = (name) => setMenu((m) => (m === name ? null : name));

  const goTo = (path) => {
    setMenu(null);
    navigate(path);
  };

  const avatar = user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=HiwjaiAdmin';
  const roleLabel = ROLES[user?.role]?.label || 'ผู้ดูแลระบบ';

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

          <div ref={menusRef} className="flex items-center gap-2 sm:gap-3">
            {/* กระดิ่งแจ้งเตือน */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('bell')}
                aria-label="การแจ้งเตือน"
                aria-expanded={menu === 'bell'}
                className={`relative w-11 h-11 flex items-center justify-center rounded-2xl transition cursor-pointer ${
                  menu === 'bell' ? 'bg-sky-100 text-sky-600' : 'text-sky-500 hover:bg-sky-50'
                }`}
              >
                <i className={`bi ${unread > 0 ? 'bi-bell-fill' : 'bi-bell'} text-xl`}></i>
                {unread > 0 && (
                  <span className="absolute top-1 right-1 min-w-5 h-5 px-1 text-[10px] font-bold bg-rose-500 text-white rounded-full ring-2 ring-white flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {menu === 'bell' && (
                <div className="absolute right-0 top-14 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-2xl shadow-sky-100 border border-sky-100 overflow-hidden z-50">
                  <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-sky-50">
                    <div>
                      <p className="font-bold text-sm">การแจ้งเตือน</p>
                      <p className="text-xs text-slate-400">เหตุการณ์อันตรายใน 7 วันล่าสุด · {alerts} รายการ</p>
                    </div>
                    {unread > 0 && (
                      <button
                        onClick={markAllRead}
                        className="shrink-0 text-xs font-semibold text-sky-500 hover:text-sky-600 cursor-pointer"
                      >
                        อ่านทั้งหมด
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {events.length === 0 ? (
                      <div className="py-10 text-center text-slate-400">
                        <i className="bi bi-shield-check text-3xl text-emerald-400"></i>
                        <p className="mt-2 text-sm">ไม่มีเหตุการณ์อันตรายในช่วงนี้</p>
                      </div>
                    ) : (
                      events.map((e) => {
                        const isNew = e.id > lastSeen;
                        return (
                          <button
                            key={e.id}
                            onClick={() => goTo('/admin/security')}
                            className={`w-full text-left flex gap-3 px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-sky-50/60 transition cursor-pointer ${
                              isNew ? 'bg-rose-50/40' : ''
                            }`}
                          >
                            <span className="shrink-0 w-9 h-9 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center">
                              <i className="bi bi-exclamation-triangle-fill"></i>
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-medium text-slate-700 line-clamp-2">{e.action}</span>
                              <span className="block text-xs text-slate-400 mt-0.5 truncate">
                                {e.actor || 'ไม่ระบุ'}
                                {e.ip ? ` · ${e.ip}` : ''} · {timeAgo(e.time)}
                              </span>
                            </span>
                            {isNew && <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-rose-500"></span>}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <button
                    onClick={() => goTo('/admin/security')}
                    className="w-full py-3 text-sm font-semibold text-sky-600 bg-sky-50/60 hover:bg-sky-50 cursor-pointer"
                  >
                    ดูบันทึกทั้งหมด <i className="bi bi-arrow-right"></i>
                  </button>
                </div>
              )}
            </div>

            <span className="hidden sm:block w-px h-8 bg-sky-100"></span>

            {/* โปรไฟล์ */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('profile')}
                aria-label="เมนูโปรไฟล์"
                aria-expanded={menu === 'profile'}
                className={`flex items-center gap-3 p-1.5 sm:pr-3 rounded-2xl transition cursor-pointer ${
                  menu === 'profile' ? 'bg-sky-100' : 'hover:bg-sky-50'
                }`}
              >
                <span className="relative shrink-0">
                  <img src={avatar} alt="profile" className="w-10 h-10 rounded-full ring-2 ring-sky-300 object-cover bg-sky-50" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white"></span>
                </span>
                <span className="hidden md:block text-left leading-tight">
                  <span className="block text-sm font-semibold max-w-36 truncate">{user?.name || 'Administrator'}</span>
                  <span className="block text-xs text-slate-400">{roleLabel}</span>
                </span>
                <i
                  className={`hidden sm:block bi bi-chevron-down text-xs text-slate-400 transition-transform ${
                    menu === 'profile' ? 'rotate-180' : ''
                  }`}
                ></i>
              </button>

              {menu === 'profile' && (
                <div className="absolute right-0 top-14 w-64 bg-white rounded-3xl shadow-2xl shadow-sky-100 border border-sky-100 overflow-hidden z-50">
                  <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-br from-sky-50 to-cyan-50">
                    <img src={avatar} alt="" className="w-12 h-12 rounded-full ring-2 ring-white object-cover bg-sky-50" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{user?.name || 'Administrator'}</p>
                      <p className="text-xs text-slate-400 truncate">@{user?.username}</p>
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200">
                        <i className="bi bi-shield-lock"></i> {roleLabel}
                      </span>
                    </div>
                  </div>

                  <div className="py-2">
                    <button
                      onClick={() => goTo('/admin/accounts')}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-slate-600 hover:bg-sky-50 hover:text-sky-600 cursor-pointer"
                    >
                      <i className="bi bi-people"></i> จัดการบัญชีผู้ใช้
                    </button>
                    <button
                      onClick={() => goTo('/admin/security')}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-slate-600 hover:bg-sky-50 hover:text-sky-600 cursor-pointer"
                    >
                      <i className="bi bi-gear"></i> ตั้งค่าความปลอดภัย
                    </button>
                  </div>

                  <div className="border-t border-sky-50 py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-rose-500 hover:bg-rose-50 font-medium cursor-pointer"
                    >
                      <i className="bi bi-box-arrow-right"></i> ออกจากระบบ
                    </button>
                  </div>
                </div>
              )}
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
