import { Link } from 'react-router-dom';
import { useAdminData, avatarOf, thaiDate, thaiWeekday } from './adminData';
import { PageHeader, Card, RoleBadge, Loading, ErrorBox } from './AdminUI';

const Stat = ({ icon, label, value, note, tone }) => (
  <Card className="p-5 relative overflow-hidden">
    <div className={`absolute -right-5 -top-5 w-24 h-24 rounded-full opacity-60 ${tone}`}></div>
    <div className="relative">
      <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-sky-100 flex items-center justify-center text-sky-500 mb-4">
        <i className={`bi ${icon} text-xl`}></i>
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
      <p className="text-xs text-sky-500 font-medium mt-1">{note}</p>
    </div>
  </Card>
);

const series = [
  { key: 'bookings', label: 'นัดปรึกษา', cls: 'bg-sky-500' },
  { key: 'logins', label: 'เข้าสู่ระบบ', cls: 'bg-cyan-300' },
  { key: 'activities', label: 'ลงทะเบียนกิจกรรม', cls: 'bg-blue-200' },
];

const BOOKING_STATUS = [
  { key: 'scheduled', label: 'รอพบ', emoji: '📅', cls: 'bg-sky-400' },
  { key: 'completed', label: 'พบแล้ว', emoji: '💙', cls: 'bg-cyan-300' },
  { key: 'cancelled', label: 'ยกเลิก', emoji: '🌧️', cls: 'bg-slate-300' },
];

const Dashboard = () => {
  const { data, error, loading, reload } = useAdminData('/reports/overview');

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const { users, patients, counselors, weekly, bookingStatus, security, recentLogs } = data;
  const weekBookings = weekly.reduce((s, d) => s + d.bookings, 0);
  const max = Math.max(1, ...weekly.flatMap((d) => series.map((s) => d[s.key])));
  const bookingTotal = BOOKING_STATUS.reduce((s, b) => s + (bookingStatus[b.key] || 0), 0);

  return (
    <div className="pb-10">
      <PageHeader icon="bi-grid-1x2-fill" title="รายงานภาพรวม" subtitle="สรุปการใช้งานระบบ Hiwjai ในสัปดาห์นี้">
        <button onClick={reload} className="px-4 py-2.5 rounded-xl bg-white border border-sky-200 text-sky-600 font-semibold hover:bg-sky-50 cursor-pointer flex items-center gap-2 text-sm">
          <i className={`bi bi-arrow-clockwise ${loading ? 'animate-spin' : ''}`}></i> รีเฟรช
        </button>
        <button onClick={() => window.print()} className="px-4 py-2.5 rounded-xl bg-white border border-sky-200 text-sky-600 font-semibold hover:bg-sky-50 cursor-pointer flex items-center gap-2 text-sm">
          <i className="bi bi-printer"></i> พิมพ์รายงาน
        </button>
      </PageHeader>

      {/* hero */}
      <div className="relative overflow-hidden rounded-3xl hw-grad-hero text-white p-7 mb-6 shadow-lg shadow-sky-200">
        <div className="absolute right-10 -top-10 w-48 h-48 rounded-full bg-white/15"></div>
        <div className="absolute right-48 top-16 w-24 h-24 rounded-full bg-white/10"></div>
        <i className="bi bi-cloud-sun absolute right-8 bottom-2 text-8xl text-white/25"></i>
        <p className="relative text-sm font-medium text-sky-50">ภาพรวมวันนี้</p>
        <h2 className="relative text-2xl md:text-3xl font-bold mt-1">มีบัญชีที่ใช้งานอยู่ {users.active} บัญชี 🌤️</h2>
        <p className="relative text-sky-50 mt-2 text-sm">
          7 วันที่ผ่านมามีนัดปรึกษา {weekBookings} ครั้ง · พบเหตุการณ์ด้านความปลอดภัยที่ควรตรวจสอบ {security.events7d} รายการ
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <Stat icon="bi-people" label="บัญชีทั้งหมด" value={users.total} note={`ใช้งานอยู่ ${users.active} · ถูกระงับ ${users.suspended}`} tone="bg-sky-100" />
        <Stat icon="bi-person-heart" label="ผู้รับบริการ" value={patients.total} note={`+${patients.newThisWeek} ใน 7 วันที่ผ่านมา`} tone="bg-cyan-100" />
        <Stat icon="bi-chat-heart" label="ผู้ให้คำปรึกษา" value={counselors.total} note={`พร้อมให้บริการ ${counselors.active} คน`} tone="bg-blue-100" />
        <Stat icon="bi-shield-exclamation" label="เหตุการณ์ต้องตรวจสอบ" value={security.events7d} note={`อันตราย ${security.danger7d} รายการ (7 วัน)`} tone="bg-rose-100" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* weekly chart */}
        <Card className="p-6 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="font-bold text-lg">การใช้บริการ 7 วันล่าสุด</h3>
              <p className="text-xs text-slate-400">จำนวนครั้งต่อวัน</p>
            </div>
            <div className="flex flex-wrap gap-4">
              {series.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className={`w-3 h-3 rounded-sm ${s.cls}`}></span>{s.label}
                </span>
              ))}
            </div>
          </div>
          <div className="h-56 flex items-end gap-3 border-b border-sky-100 pb-1">
            {weekly.map((d) => (
              <div key={d.date} className="flex-1 h-full flex items-end justify-center gap-1 group">
                {series.map((s) => (
                  <div
                    key={s.key}
                    title={`${thaiWeekday(d.date)} · ${s.label}: ${d[s.key]}`}
                    className={`w-full max-w-4 rounded-t-md ${s.cls} transition-all group-hover:brightness-95`}
                    style={{ height: `${Math.max((d[s.key] / max) * 100, d[s.key] ? 2 : 0)}%` }}
                  ></div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-2">
            {weekly.map((d) => (
              <span key={d.date} className="flex-1 text-center text-xs text-slate-400">{thaiWeekday(d.date)}</span>
            ))}
          </div>
        </Card>

        {/* booking status */}
        <Card className="p-6">
          <h3 className="font-bold text-lg">สถานะนัดหมาย</h3>
          <p className="text-xs text-slate-400 mb-5">30 วันล่าสุด · ทั้งหมด {bookingTotal} นัด</p>
          <div className="flex h-4 rounded-full overflow-hidden mb-6 bg-sky-50">
            {bookingTotal > 0 &&
              BOOKING_STATUS.map((b) => (
                <div key={b.key} className={b.cls} style={{ width: `${((bookingStatus[b.key] || 0) / bookingTotal) * 100}%` }}></div>
              ))}
          </div>
          <div className="space-y-3">
            {BOOKING_STATUS.map((b) => (
              <div key={b.key} className="flex items-center justify-between p-3 rounded-2xl bg-sky-50/60">
                <span className="flex items-center gap-3 text-sm font-medium">
                  <span className="text-xl">{b.emoji}</span>{b.label}
                </span>
                <span className="font-bold text-slate-700">{bookingStatus[b.key] || 0}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* role distribution */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-5">สัดส่วนบัญชีตาม Role</h3>
          <div className="space-y-4">
            {users.byRole.map(({ role, n }) => (
              <div key={role}>
                <div className="flex justify-between items-center mb-1.5">
                  <RoleBadge role={role} />
                  <span className="text-sm font-bold text-slate-600">{n}</span>
                </div>
                <div className="h-2 rounded-full bg-sky-50">
                  <div className="h-2 rounded-full hw-grad-soft" style={{ width: `${(n / users.total) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* top counselors */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg">ผู้ให้คำปรึกษา</h3>
            <Link to="/admin/counselors" className="text-xs font-semibold text-sky-500 hover:underline">ดูทั้งหมด</Link>
          </div>
          <div className="space-y-3">
            {counselors.top.map((c) => (
              <div key={c.id} className={`flex items-center gap-3 p-2 rounded-2xl hover:bg-sky-50/60 ${c.status === 'suspended' ? 'opacity-50' : ''}`}>
                <img src={avatarOf(c)} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-sky-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{c.first_name} {c.last_name}</p>
                  <p className="text-xs text-slate-400 truncate">{c.specialty || 'ยังไม่ระบุความเชี่ยวชาญ'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-sky-600">{c.sessions}</p>
                  <p className="text-[10px] text-slate-400">ครั้ง</p>
                </div>
              </div>
            ))}
            {counselors.top.length === 0 && <p className="text-sm text-slate-400 text-center py-6">ยังไม่มีผู้ให้คำปรึกษา</p>}
          </div>
        </Card>

        {/* recent logs */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg">กิจกรรมล่าสุด</h3>
            <Link to="/admin/security" className="text-xs font-semibold text-sky-500 hover:underline">ดูบันทึก</Link>
          </div>
          <ol className="relative border-l-2 border-sky-100 ml-2 space-y-4">
            {recentLogs.map((l) => (
              <li key={l.id} className="ml-4">
                <span
                  className={`absolute -left-[7px] w-3 h-3 rounded-full ring-4 ring-white ${
                    l.level === 'danger' ? 'bg-rose-400' : l.level === 'warning' ? 'bg-amber-300' : 'bg-sky-400'
                  }`}
                ></span>
                <p className="text-sm font-medium leading-snug">{l.action}</p>
                <p className="text-xs text-slate-400">@{l.actor} · {thaiDate(l.time)}</p>
              </li>
            ))}
            {recentLogs.length === 0 && <li className="ml-4 text-sm text-slate-400">ยังไม่มีบันทึก</li>}
          </ol>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
