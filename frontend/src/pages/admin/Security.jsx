import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { thaiDate, adminApi, useAdminData, useToast } from './adminData';
import { PageHeader, Card, Field, Loading, ErrorBox, Toast } from './AdminUI';
import { inputCls, btn } from './adminStyles';

const LEVEL = {
  info:    { label: 'ปกติ',     cls: 'bg-sky-50 text-sky-600',     icon: 'bi-info-circle' },
  warning: { label: 'เฝ้าระวัง', cls: 'bg-amber-50 text-amber-600', icon: 'bi-exclamation-triangle' },
  danger:  { label: 'อันตราย',  cls: 'bg-rose-50 text-rose-500',   icon: 'bi-shield-exclamation' },
};
const CATEGORY = { auth: 'เข้าสู่ระบบ', account: 'บัญชี', data: 'ข้อมูล', security: 'ความปลอดภัย', system: 'ระบบ' };

const isPrivateIp = (ip = '') =>
  !ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);

const Toggle = ({ on, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!on)}
    className={`relative w-12 h-7 rounded-full transition cursor-pointer shrink-0 ${on ? 'bg-sky-500' : 'bg-slate-200'}`}
  >
    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`}></span>
  </button>
);

const Security = () => {
  const { refreshAlerts } = useOutletContext();
  const logs = useAdminData('/security/logs?limit=500');
  const summary = useAdminData('/security/summary');
  const settings = useAdminData('/security/settings');
  const blocked = useAdminData('/security/blocked-ips');
  const [toast, showToast] = useToast();

  const [q, setQ] = useState('');
  const [level, setLevel] = useState('all');
  const [category, setCategory] = useState('all');
  const [draft, setDraft] = useState(null); // ค่าที่กำลังแก้ (null = ยังไม่แก้)
  const [saving, setSaving] = useState(false);
  const [newIp, setNewIp] = useState('');

  const s = draft ?? settings.data;

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (logs.data || []).filter(
      (l) =>
        (level === 'all' || l.level === level) &&
        (category === 'all' || l.category === category) &&
        (!k || `${l.actor} ${l.action} ${l.ip}`.toLowerCase().includes(k))
    );
  }, [logs.data, q, level, category]);

  const blockedIps = (blocked.data || []).map((b) => b.ip);

  // หลังทำ action ให้โหลด log/summary ใหม่ เพราะ backend เขียน audit log เพิ่ม
  const afterChange = () => {
    logs.reload();
    summary.reload();
    refreshAlerts();
  };

  const setS = (k, v) => setDraft({ ...s, [k]: v });

  const saveSettings = async () => {
    setSaving(true);
    try {
      settings.setData(await adminApi('/security/settings', { method: 'PUT', body: s }));
      setDraft(null);
      showToast('บันทึกการตั้งค่าความปลอดภัยแล้ว');
      afterChange();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const blockIp = async (ip, reason) => {
    const v = ip.trim();
    if (!v) return;
    try {
      await adminApi('/security/blocked-ips', { method: 'POST', body: { ip: v, reason } });
      showToast(`บล็อก IP ${v} แล้ว`);
      setNewIp('');
      blocked.reload();
      afterChange();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const unblockIp = async (ip) => {
    try {
      await adminApi(`/security/blocked-ips/${encodeURIComponent(ip)}`, { method: 'DELETE' });
      showToast(`ปลดบล็อก IP ${ip} แล้ว`);
      blocked.reload();
      afterChange();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const exportCsv = () => {
    const rows = [
      ['time', 'actor', 'action', 'category', 'ip', 'level'],
      ...filtered.map((l) => [thaiDate(l.time), l.actor, l.action, l.category, l.ip, l.level]),
    ];
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `hiwjai-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    // revoke ทันทีบางเบราว์เซอร์ (เช่น Firefox) จะยกเลิกการดาวน์โหลด
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // คะแนนความปลอดภัยคร่าวๆ จากการตั้งค่า
  const score = s
    ? 40 +
      (s.twoFactor ? 20 : 0) +
      (s.lockAfterFails ? 10 : 0) +
      (s.minPasswordLength >= 10 ? 10 : s.minPasswordLength >= 8 ? 5 : 0) +
      (s.requireSymbol ? 5 : 0) +
      (s.sessionMinutes <= 30 ? 10 : 0) +
      (s.maskPatientData ? 5 : 0)
    : 0;

  const sum = summary.data || { total: 0, danger: 0, failedLogin: 0, lockedAccounts: 0 };
  const loadError = logs.error || summary.error || settings.error || blocked.error;

  return (
    <div className="pb-10">
      <PageHeader icon="bi-shield-fill-check" title="บันทึกการใช้งานและความปลอดภัย" subtitle="ตรวจสอบกิจกรรมทั้งหมดในระบบ และตั้งค่านโยบายความปลอดภัย">
        <button onClick={afterChange} className={btn.ghost} title="รีเฟรช"><i className={`bi bi-arrow-clockwise ${logs.loading ? 'animate-spin' : ''}`}></i></button>
        <button onClick={exportCsv} className={btn.ghost}><i className="bi bi-download"></i> ส่งออก CSV</button>
      </PageHeader>

      {loadError && <div className="mb-5"><ErrorBox message={loadError} onRetry={() => { afterChange(); settings.reload(); blocked.reload(); }} /></div>}

      {/* summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <Card className="p-6 flex items-center gap-5">
          <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e0f2fe" strokeWidth="3.5" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#hiwjai-score)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(score / 100) * 97.4} 97.4`} />
              <defs>
                <linearGradient id="hiwjai-score"><stop offset="0%" stopColor="#0ea5e9" /><stop offset="100%" stopColor="#67e8f9" /></linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-sky-600">{score}</span>
          </div>
          <div>
            <p className="text-sm text-slate-500">คะแนนความปลอดภัย</p>
            <p className="font-bold text-lg">{score >= 85 ? 'ดีเยี่ยม 💙' : score >= 65 ? 'ดี' : 'ควรปรับปรุง'}</p>
          </div>
        </Card>
        {[
          { icon: 'bi-shield-exclamation', label: 'เหตุการณ์อันตราย', v: sum.danger, tone: 'text-rose-500 bg-rose-50' },
          { icon: 'bi-door-closed', label: 'เข้าสู่ระบบล้มเหลว', v: sum.failedLogin, tone: 'text-amber-500 bg-amber-50' },
          { icon: 'bi-lock', label: 'บัญชีที่ถูกล็อกอยู่', v: sum.lockedAccounts, tone: 'text-sky-500 bg-sky-50' },
        ].map((x) => (
          <Card key={x.label} className="p-6 flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${x.tone}`}><i className={`bi ${x.icon} text-2xl`}></i></div>
            <div>
              <p className="text-sm text-slate-500">{x.label}</p>
              <p className="text-3xl font-bold">{x.v}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* logs */}
        <Card className="xl:col-span-2 overflow-hidden">
          <div className="p-5 border-b border-sky-50">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <i className="bi bi-clock-history text-sky-500"></i> บันทึกการใช้งาน (Audit Log)
              <span className="text-xs font-normal text-slate-400">ทั้งหมด {sum.total} รายการ</span>
            </h3>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-sky-300"></i>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาผู้ใช้, การกระทำ หรือ IP..." className={`${inputCls} pl-11`} />
              </div>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} md:w-40`}>
                <option value="all">ทุกหมวด</option>
                {Object.entries(CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className={`${inputCls} md:w-40`}>
                <option value="all">ทุกระดับ</option>
                {Object.entries(LEVEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {logs.loading && !logs.data ? (
            <Loading />
          ) : (
            <ul className="divide-y divide-sky-50 max-h-[560px] overflow-y-auto">
              {filtered.map((l) => {
                const lv = LEVEL[l.level] || LEVEL.info;
                return (
                  <li key={l.id} className="px-5 py-4 flex items-start gap-4 hover:bg-sky-50/40">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${lv.cls}`}><i className={`bi ${lv.icon}`}></i></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-700 break-words">{l.action}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        <span className="font-semibold text-slate-500">@{l.actor}</span> · {CATEGORY[l.category]} · IP {l.ip || '-'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${lv.cls}`}>{lv.label}</span>
                      <p className="text-[11px] text-slate-400 mt-1 whitespace-nowrap">{thaiDate(l.time)}</p>
                      {l.level !== 'info' && !isPrivateIp(l.ip) && !blockedIps.includes(l.ip) && (
                        <button onClick={() => blockIp(l.ip, `จาก log: ${l.action}`.slice(0, 255))} className="mt-1 text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer">
                          บล็อก IP นี้
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="py-16 text-center text-slate-400"><i className="bi bi-cloud text-4xl text-sky-200 block mb-2"></i>ไม่พบบันทึก</li>
              )}
            </ul>
          )}
        </Card>

        {/* settings */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-bold text-lg mb-5 flex items-center gap-2"><i className="bi bi-sliders text-sky-500"></i> นโยบายความปลอดภัย</h3>
            {!s ? (
              <Loading />
            ) : (
              <div className="space-y-5">
                {[
                  { k: 'lockAfterFails', t: 'ล็อกบัญชีเมื่อเข้าสู่ระบบผิดซ้ำ', d: `ล็อก ${s.lockMinutes} นาทีหลังผิด ${s.maxAttempts} ครั้ง` },
                  { k: 'requireSymbol', t: 'รหัสผ่านต้องมีสัญลักษณ์', d: 'ใช้ตอนสร้างบัญชี / ตั้งรหัสใหม่' },
                  { k: 'twoFactor', t: 'ยืนยันตัวตน 2 ขั้นตอน (2FA)', d: 'บันทึกนโยบายไว้ — ยังไม่ได้เปิดใช้ในหน้า login' },
                  { k: 'maskPatientData', t: 'ปกปิดข้อมูลส่วนบุคคลผู้ป่วย', d: 'บันทึกนโยบายไว้ — แต่ละ service ต้องนำไปใช้' },
                ].map((o) => (
                  <div key={o.k} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{o.t}</p>
                      <p className="text-xs text-slate-400">{o.d}</p>
                    </div>
                    <Toggle on={s[o.k]} onChange={(v) => setS(o.k, v)} />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Field label="ผิดได้ (ครั้ง)">
                    <input type="number" min={3} max={10} value={s.maxAttempts} onChange={(e) => setS('maxAttempts', +e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="ล็อกนาน (นาที)">
                    <input type="number" min={1} max={1440} value={s.lockMinutes} onChange={(e) => setS('lockMinutes', +e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Session (นาที)">
                    <input type="number" min={5} max={240} value={s.sessionMinutes} onChange={(e) => setS('sessionMinutes', +e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="รหัสผ่านขั้นต่ำ">
                    <input type="number" min={6} max={32} value={s.minPasswordLength} onChange={(e) => setS('minPasswordLength', +e.target.value)} className={inputCls} />
                  </Field>
                </div>

                <div className="flex gap-2">
                  {draft && (
                    <button onClick={() => setDraft(null)} className={`${btn.ghost} justify-center`}>ยกเลิก</button>
                  )}
                  <button onClick={saveSettings} disabled={!draft || saving} className={`${btn.primary} flex-1 justify-center`}>
                    <i className={`bi ${draft ? 'bi-save' : 'bi-check2-circle'}`}></i> {saving ? 'กำลังบันทึก...' : draft ? 'บันทึกการตั้งค่า' : 'บันทึกแล้ว'}
                  </button>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2"><i className="bi bi-sign-stop text-rose-400"></i> IP ที่ถูกบล็อก</h3>
            <p className="text-xs text-slate-400 mb-4">IP เหล่านี้จะเข้าสู่ระบบไม่ได้</p>
            <div className="flex gap-2 mb-4">
              <input value={newIp} onChange={(e) => setNewIp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && blockIp(newIp)} placeholder="เช่น 203.0.113.5" className={inputCls} />
              <button onClick={() => blockIp(newIp)} className="px-4 rounded-xl bg-rose-50 text-rose-500 font-semibold hover:bg-rose-100 cursor-pointer"><i className="bi bi-plus-lg"></i></button>
            </div>
            <div className="space-y-2">
              {(blocked.data || []).map((b) => (
                <div key={b.ip} className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-50">
                  <div className="min-w-0">
                    <p className="font-mono text-sm">{b.ip}</p>
                    <p className="text-[11px] text-slate-400 truncate">{b.reason || '—'} · โดย @{b.blocked_by || '-'}</p>
                  </div>
                  <button onClick={() => unblockIp(b.ip)} className="text-xs font-semibold text-sky-500 hover:underline cursor-pointer shrink-0">ปลดบล็อก</button>
                </div>
              ))}
              {blocked.data?.length === 0 && <p className="text-sm text-slate-400 text-center py-3">ยังไม่มี IP ที่ถูกบล็อก</p>}
            </div>
          </Card>
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
};

export default Security;
