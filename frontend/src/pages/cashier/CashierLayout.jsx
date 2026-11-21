import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../../api';
import { Modal, Toast } from '../admin/AdminUI';
import { btn } from '../admin/adminStyles';
import { pickNextHn } from './cashierData';
import { cashierApi } from './cashierApi';

const menuItems = [
  { path: '/cashier/billing', label: 'คำนวณค่าบริการ', icon: 'bi-receipt' },
  { path: '/cashier/payment', label: 'รับชำระเงิน', icon: 'bi-cash-coin' },
  { path: '/cashier/finance', label: 'สรุปยอดส่งการเงิน', icon: 'bi-graph-up-arrow' },
];

const navCls = ({ isActive }) =>
  `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
    isActive
      ? 'hw-grad-primary text-white font-semibold shadow-md shadow-sky-200'
      : 'text-slate-500 hover:bg-sky-50 hover:text-sky-600 font-medium'
  }`;

const CashierLayout = ({ user }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // ข้อมูลคิวและรายการชำระจาก Backend API
  const [data, setData] = useState({ patients: [], transactions: [] });
  const [loading, setLoading] = useState(true);
  const [selectedHn, setSelectedHn] = useState(null);

  const dataRef = useRef(data);
  const getData = useCallback(() => dataRef.current, []);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // toast
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // โหลดข้อมูลล่าสุดจาก Backend
  const refreshData = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const [patients, transactions] = await Promise.all([
          cashierApi.getPendingBills(),
          cashierApi.getTodayTransactions(),
        ]);
        setData({ patients, transactions });
        setSelectedHn((prev) =>
          prev && patients.some((p) => p.hn === prev) ? prev : pickNextHn(patients)
        );
      } catch (err) {
        showToast(err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์การเงินได้', 'error');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // กล่องยืนยัน — askConfirm({ title, message, okText }) คืน Promise<boolean>
  const [confirmReq, setConfirmReq] = useState(null);
  const askConfirm = useCallback(
    (opts) =>
      new Promise((resolve) =>
        setConfirmReq((prev) => {
          prev?.resolve(false);
          return { ...opts, resolve };
        })
      ),
    []
  );
  const closeConfirm = (ok) => {
    confirmReq?.resolve(ok);
    setConfirmReq(null);
  };

  // ปิดเมนูโปรไฟล์เมื่อคลิกนอก หรือกด Esc
  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e) => profileRef.current && !profileRef.current.contains(e.target) && setProfileOpen(false);
    const onKey = (e) => e.key === 'Escape' && setProfileOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileOpen]);

  const handleRefresh = async () => {
    await refreshData();
    showToast('อัปเดตข้อมูลล่าสุดจากระบบแล้ว');
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
    window.location.reload();
  };

  const avatar = user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=HiwjaiCashier';

  return (
    <div
      className="cashier-shell flex h-screen overflow-hidden hw-grad-page text-slate-800"
      style={{ fontFamily: "'IBM Plex Sans Thai', 'Prompt', sans-serif" }}
    >
      {/* sidebar (จอใหญ่) */}
      <aside className={`${open ? 'w-64' : 'w-20'} hidden md:flex flex-col bg-white/90 border-r border-sky-100 transition-all duration-300 z-20 print:hidden`}>
        <div className="h-20 flex items-center gap-3 px-5 border-b border-sky-100">
          <div className="w-10 h-10 shrink-0 rounded-2xl hw-grad-soft-br flex items-center justify-center text-white shadow-md shadow-sky-200">
            <i className="bi bi-heart-pulse-fill text-xl"></i>
          </div>
          {open && (
            <div>
              <h1 className="text-lg font-bold leading-tight">
                Hiwjai <span className="text-sky-500 font-semibold text-sm">ฮีลใจ</span>
              </h1>
              <p className="text-[10px] font-semibold tracking-widest text-sky-400 uppercase">Cashier Counter</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((m) => (
            <NavLink key={m.path} to={m.path} title={m.label} className={navCls}>
              <i className={`bi ${m.icon} text-lg shrink-0`}></i>
              {open && <span className="whitespace-nowrap text-sm">{m.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 space-y-3">
          <button
            onClick={handleRefresh}
            title="รีเฟรชข้อมูลคิว"
            className="w-full py-2.5 rounded-2xl border border-dashed border-sky-300 text-xs text-sky-600 hover:bg-sky-50 transition cursor-pointer"
          >
            <i className="bi bi-arrow-clockwise"></i>
            {open && <span className="ml-1.5">รีเฟรชข้อมูลคิว</span>}
          </button>
          {open && (
            <div className="relative overflow-hidden rounded-3xl p-5 hw-grad-soft-br text-white">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/20"></div>
              <p className="relative text-sm font-semibold leading-relaxed">
                ประจำเคาน์เตอร์ A1<br />บริการด้วยใจ ♡
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-20 shrink-0 bg-white/80 border-b border-sky-100 flex items-center justify-between gap-3 px-4 sm:px-6 print:hidden">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button onClick={() => setOpen(!open)} className="hidden md:block p-2 text-sky-500 hover:bg-sky-50 rounded-xl cursor-pointer" aria-label="ย่อ/ขยายเมนู">
              <i className="bi bi-list text-2xl"></i>
            </button>
            <div className="md:hidden w-10 h-10 shrink-0 rounded-2xl hw-grad-soft-br flex items-center justify-center text-white">
              <i className="bi bi-heart-pulse-fill text-xl"></i>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate">สวัสดีค่ะ เจ้าหน้าที่แคชเชียร์ {user?.name || ''}</h2>
              <p className="text-xs text-slate-400 truncate">ระบบการเงินเคาน์เตอร์ · ประจำเคาน์เตอร์ A1</p>
            </div>
          </div>

          <div ref={profileRef} className="relative shrink-0">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              aria-label="เมนูโปรไฟล์"
              aria-expanded={profileOpen}
              className={`flex items-center gap-3 p-1.5 sm:pr-3 rounded-2xl transition cursor-pointer ${profileOpen ? 'bg-sky-100' : 'hover:bg-sky-50'}`}
            >
              <img src={avatar} alt="profile" className="w-10 h-10 rounded-full ring-2 ring-sky-300 object-cover bg-sky-50" />
              <span className="hidden md:block text-left leading-tight">
                <span className="block text-sm font-semibold max-w-36 truncate">{user?.name || 'Cashier'}</span>
                <span className="block text-xs text-slate-400">แคชเชียร์</span>
              </span>
              <i className={`hidden sm:block bi bi-chevron-down text-xs text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-14 w-64 bg-white rounded-3xl shadow-2xl shadow-sky-100 border border-sky-100 overflow-hidden z-50">
                <div className="flex items-center gap-3 px-5 py-4 hw-grad-tint-br">
                  <img src={avatar} alt="" className="w-12 h-12 rounded-full ring-2 ring-white object-cover bg-sky-50" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{user?.name || 'Cashier'}</p>
                    <p className="text-xs text-slate-400 truncate">@{user?.username}</p>
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 ring-1 ring-amber-200">
                      <i className="bi bi-cash-coin"></i> แคชเชียร์
                    </span>
                  </div>
                </div>
                <div className="py-2 md:hidden">
                  <button
                    onClick={() => { setProfileOpen(false); handleRefresh(); }}
                    className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-slate-600 hover:bg-sky-50 cursor-pointer"
                  >
                    <i className="bi bi-arrow-clockwise"></i> รีเฟรชข้อมูลคิว
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
        </header>

        {/* แถบเมนู (จอเล็ก) */}
        <nav className="md:hidden flex gap-1.5 overflow-x-auto px-4 py-3 bg-white/80 border-b border-sky-100 print:hidden">
          {menuItems.map((m) => (
            <NavLink key={m.path} to={m.path} className={(s) => `${navCls(s)} !px-3 !py-2 text-xs whitespace-nowrap shrink-0`}>
              <i className={`bi ${m.icon}`}></i>
              {m.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="py-20 text-center text-sky-600 font-medium">กำลังโหลดข้อมูลการเงินจากเซิร์ฟเวอร์...</div>
            ) : (
              <Outlet context={{ me: user, data, setData, getData, refreshData, selectedHn, setSelectedHn, showToast, askConfirm }} />
            )}
          </div>
        </main>
      </div>

      <Modal
        open={!!confirmReq}
        title={confirmReq?.title || 'ยืนยัน'}
        icon="bi-question-circle"
        onClose={() => closeConfirm(false)}
        footer={
          <>
            <button onClick={() => closeConfirm(false)} className={btn.ghost}>ยกเลิก</button>
            <button onClick={() => closeConfirm(true)} className={confirmReq?.danger ? btn.danger : btn.primary} autoFocus>
              {confirmReq?.okText || 'ยืนยัน'}
            </button>
          </>
        }
      >
        <p className="text-slate-600 whitespace-pre-line">{confirmReq?.message}</p>
      </Modal>

      <Toast toast={toast} />
    </div>
  );
};

export default CashierLayout;