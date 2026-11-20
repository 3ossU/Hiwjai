import { useCallback, useEffect, useRef, useState } from 'react';
import { svc } from '../../api';

// เรียก admin-service (port 4001) — ใช้ token + ระบบ refresh เดิมใน api.js
export const adminApi = (path, opts) => svc('admin', `/api/admin${path}`, opts);

// โหลดข้อมูลจาก API พร้อม state loading / error / reload
export function useAdminData(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลแล้วค่อย setState ใน callback (กัน setState ซ้อนใน effect / หลัง unmount)
  const fetchInto = useCallback(
    (isAlive = () => true) =>
      adminApi(path)
        .then((d) => {
          if (!isAlive()) return;
          setData(d);
          setError('');
        })
        .catch((e) => {
          if (!isAlive()) return;
          setError(e.message === 'Failed to fetch' ? 'เชื่อมต่อ admin-service (port 4001) ไม่ได้' : e.message);
        })
        .finally(() => isAlive() && setLoading(false)),
    [path]
  );

  const reload = useCallback(() => {
    setLoading(true);
    return fetchInto();
  }, [fetchInto]);

  useEffect(() => {
    let alive = true;
    fetchInto(() => alive);
    return () => {
      alive = false;
    };
  }, [fetchInto]);

  return { data, setData, error, loading, reload };
}

// toast แจ้งผล หายเองใน 3 วิ
export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const show = useCallback((msg, type = 'success') => {
    clearTimeout(timer.current);
    setToast({ msg, type });
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [toast, show];
}

export const ROLES = {
  admin:      { label: 'ผู้ดูแลระบบ',     icon: 'bi-shield-lock',    cls: 'bg-indigo-50 text-indigo-600 ring-indigo-200' },
  doctor:     { label: 'ผู้ให้คำปรึกษา',   icon: 'bi-chat-heart',     cls: 'bg-sky-50 text-sky-600 ring-sky-200' },
  head_nurse: { label: 'หัวหน้าพยาบาล',   icon: 'bi-award',          cls: 'bg-cyan-50 text-cyan-700 ring-cyan-200' },
  nurse:      { label: 'พยาบาล',          icon: 'bi-heart-pulse',    cls: 'bg-teal-50 text-teal-600 ring-teal-200' },
  patient:    { label: 'ผู้รับบริการ',     icon: 'bi-person-heart',   cls: 'bg-blue-50 text-blue-600 ring-blue-200' },
  pharmacist: { label: 'เภสัชกร',         icon: 'bi-capsule',        cls: 'bg-emerald-50 text-emerald-600 ring-emerald-200' },
  cashier:    { label: 'แคชเชียร์',        icon: 'bi-cash-coin',      cls: 'bg-amber-50 text-amber-600 ring-amber-200' },
  finance:    { label: 'การเงิน',         icon: 'bi-graph-up-arrow', cls: 'bg-orange-50 text-orange-600 ring-orange-200' },
};

// role ที่ admin สร้าง/เปลี่ยนได้ (ผู้ป่วยต้องสร้างผ่านหน้าพยาบาล เพราะต้องมี patient_info)
export const STAFF_ROLES = Object.keys(ROLES).filter((r) => r !== 'patient');

export const SPECIALTIES = [
  'จิตแพทย์ทั่วไป',
  'นักจิตวิทยาคลินิก',
  'ภาวะซึมเศร้าและวิตกกังวล',
  'จิตเวชเด็กและวัยรุ่น',
  'ครอบครัวและคู่รัก',
  'การเสพติด',
];

export const fullName = (x) => `${x.first_name} ${x.last_name}`;
export const avatarOf = (x) =>
  x.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(x.username || 'hiwjai')}`;

export const thaiDate = (s) => {
  if (!s) return '-';
  const d = new Date(typeof s === 'string' ? s.replace(' ', 'T') : s);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const thaiWeekday = (ymd) =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString('th-TH', { weekday: 'short' });
