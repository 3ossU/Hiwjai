import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ROLES, STAFF_ROLES, fullName, avatarOf, thaiDate, adminApi, useAdminData, useToast } from './adminData';
import { PageHeader, Card, RoleBadge, StatusBadge, Modal, Field, Loading, ErrorBox, Toast } from './AdminUI';
import { inputCls, btn } from './adminStyles';

const emptyForm = { username: '', password: '', first_name: '', last_name: '', phone_number: '', gender: 'female', role: 'nurse' };

const Accounts = () => {
  const { me } = useOutletContext();
  const { data: users, setData: setUsers, error, loading, reload } = useAdminData('/users');
  const [toast, showToast] = useToast();

  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [roleTarget, setRoleTarget] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [statusTarget, setStatusTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [resetTarget, setResetTarget] = useState(null);
  const [tempPw, setTempPw] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => users || [], [users]);
  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return list.filter(
      (u) =>
        (roleFilter === 'all' || u.role === roleFilter) &&
        (statusFilter === 'all' || u.status === statusFilter) &&
        (!k || `${u.username} ${fullName(u)} ${u.phone_number || ''}`.toLowerCase().includes(k))
    );
  }, [list, q, roleFilter, statusFilter]);

  const replaceUser = (u) => setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
  const isMe = (u) => u.id === me?.id;

  // เรียก API พร้อมกันกดซ้ำ + แสดง toast เมื่อ error
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveRole = () =>
    run(async () => {
      if (newRole !== roleTarget.role) {
        replaceUser(await adminApi(`/users/${roleTarget.id}/role`, { method: 'PATCH', body: { role: newRole } }));
        showToast(`เปลี่ยน Role ของ ${roleTarget.username} เรียบร้อย`);
      }
      setRoleTarget(null);
    });

  const saveStatus = () =>
    run(async () => {
      const next = statusTarget.status === 'active' ? 'suspended' : 'active';
      replaceUser(await adminApi(`/users/${statusTarget.id}/status`, { method: 'PATCH', body: { status: next, reason } }));
      showToast(next === 'suspended' ? `ระงับบัญชี ${statusTarget.username} แล้ว` : `เปิดใช้งาน ${statusTarget.username} แล้ว`);
      setStatusTarget(null);
      setReason('');
    });

  const resetPassword = () =>
    run(async () => {
      const r = await adminApi(`/users/${resetTarget.id}/reset-password`, { method: 'POST' });
      setTempPw(r.tempPassword);
      setUsers((prev) => prev.map((x) => (x.id === resetTarget.id ? { ...x, locked_until: null } : x)));
    });

  const createUser = () => {
    if (!form.username || !form.password || !form.first_name || !form.last_name) {
      return setFormError('กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบ');
    }
    return run(async () => {
      try {
        const u = await adminApi('/users', { method: 'POST', body: form });
        setUsers((prev) => [u, ...prev]);
        showToast(`สร้างบัญชี ${u.username} สำเร็จ`);
        setCreateOpen(false);
        setForm(emptyForm);
      } catch (e) {
        setFormError(e.message);
      }
    });
  };

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setFormError('');
  };

  const closeReset = () => {
    setResetTarget(null);
    setTempPw('');
  };

  const isLocked = (u) => u.locked_until && new Date(u.locked_until) > new Date();

  return (
    <div className="pb-10">
      <PageHeader icon="bi-people-fill" title="จัดการบัญชีและกำหนด Role" subtitle="ดูแลบัญชีผู้ใช้ทั้งหมดและกำหนดสิทธิ์การเข้าถึงระบบ">
        <button onClick={reload} className={btn.ghost} title="รีเฟรช">
          <i className={`bi bi-arrow-clockwise ${loading ? 'animate-spin' : ''}`}></i>
        </button>
        <button onClick={() => { setCreateOpen(true); setFormError(''); }} className={btn.primary}>
          <i className="bi bi-person-plus"></i> สร้างบัญชีใหม่
        </button>
      </PageHeader>

      {error && <div className="mb-5"><ErrorBox message={error} onRetry={reload} /></div>}

      {/* role chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setRoleFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition cursor-pointer ${
            roleFilter === 'all' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'bg-white text-slate-500 border border-sky-100 hover:bg-sky-50'
          }`}
        >
          ทั้งหมด · {list.length}
        </button>
        {Object.entries(ROLES).map(([key, r]) => {
          const n = list.filter((u) => u.role === key).length;
          if (!n) return null;
          return (
            <button
              key={key}
              onClick={() => setRoleFilter(key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                roleFilter === key ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'bg-white text-slate-500 border border-sky-100 hover:bg-sky-50'
              }`}
            >
              <i className={`bi ${r.icon}`}></i>{r.label} · {n}
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 flex flex-col md:flex-row gap-3 border-b border-sky-50">
          <div className="relative flex-1">
            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-sky-300"></i>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ, username หรือเบอร์โทร..." className={`${inputCls} pl-11`} />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} md:w-48`}>
            <option value="all">ทุกสถานะ</option>
            <option value="active">ใช้งานอยู่</option>
            <option value="suspended">ถูกระงับ</option>
          </select>
        </div>

        {loading && !users ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 bg-sky-50/50">
                  <th className="px-5 py-3 font-semibold">ผู้ใช้</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">สถานะ</th>
                  <th className="px-5 py-3 font-semibold">เข้าใช้ล่าสุด</th>
                  <th className="px-5 py-3 font-semibold">สร้างเมื่อ</th>
                  <th className="px-5 py-3 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {filtered.map((u) => (
                  <tr key={u.id} className={`hover:bg-sky-50/40 transition ${u.status === 'suspended' ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={avatarOf(u)} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-sky-100 bg-sky-50" />
                        <div>
                          <p className="font-semibold text-slate-700">
                            {fullName(u)} {isMe(u) && <span className="text-[10px] text-sky-500 font-bold">(คุณ)</span>}
                          </p>
                          <p className="text-xs text-slate-400">@{u.username} · {u.phone_number || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={u.status} />
                        {isLocked(u) && (
                          <span className="text-[11px] text-amber-600 font-semibold"><i className="bi bi-lock-fill"></i> ล็อกชั่วคราว</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{thaiDate(u.last_login)}</td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{thaiDate(u.created_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {u.role !== 'patient' && !isMe(u) && (
                          <button onClick={() => { setRoleTarget(u); setNewRole(u.role); }} title="กำหนด Role" className="w-9 h-9 rounded-xl text-sky-500 hover:bg-sky-100 cursor-pointer">
                            <i className="bi bi-person-gear"></i>
                          </button>
                        )}
                        <button onClick={() => setResetTarget(u)} title={isLocked(u) ? 'รีเซ็ตรหัสผ่าน / ปลดล็อก' : 'รีเซ็ตรหัสผ่าน'} className="w-9 h-9 rounded-xl text-amber-500 hover:bg-amber-50 cursor-pointer">
                          <i className={`bi ${isLocked(u) ? 'bi-unlock' : 'bi-key'}`}></i>
                        </button>
                        {!isMe(u) && (
                          <button
                            onClick={() => { setStatusTarget(u); setReason(''); }}
                            title={u.status === 'active' ? 'ระงับบัญชี' : 'เปิดใช้งาน'}
                            className={`w-9 h-9 rounded-xl cursor-pointer ${u.status === 'active' ? 'text-rose-400 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                          >
                            <i className={`bi ${u.status === 'active' ? 'bi-slash-circle' : 'bi-check-circle'}`}></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <i className="bi bi-cloud text-4xl text-sky-200 block mb-2"></i>ไม่พบบัญชีที่ค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-3 text-xs text-slate-400 border-t border-sky-50">แสดง {filtered.length} จาก {list.length} บัญชี</div>
      </Card>

      {/* change role */}
      <Modal
        open={!!roleTarget}
        icon="bi-person-gear"
        title="กำหนด Role"
        onClose={() => setRoleTarget(null)}
        footer={
          <>
            <button onClick={() => setRoleTarget(null)} className={btn.ghost}>ยกเลิก</button>
            <button onClick={saveRole} disabled={busy} className={btn.primary}><i className="bi bi-check-lg"></i> บันทึก</button>
          </>
        }
      >
        {roleTarget && (
          <>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-sky-50 mb-5">
              <img src={avatarOf(roleTarget)} alt="" className="w-12 h-12 rounded-full object-cover" />
              <div>
                <p className="font-bold">{fullName(roleTarget)}</p>
                <p className="text-xs text-slate-500">@{roleTarget.username}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STAFF_ROLES.map((key) => (
                <button
                  key={key}
                  onClick={() => setNewRole(key)}
                  className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                    newRole === key ? 'border-sky-400 bg-sky-50' : 'border-slate-100 hover:border-sky-200'
                  }`}
                >
                  <i className={`bi ${ROLES[key].icon} text-sky-500 text-lg`}></i>
                  <p className="text-sm font-semibold mt-1">{ROLES[key].label}</p>
                </button>
              ))}
            </div>
            {newRole === 'admin' && (
              <p className="mt-4 text-xs text-amber-600 bg-amber-50 p-3 rounded-xl flex gap-2">
                <i className="bi bi-exclamation-triangle"></i>Role ผู้ดูแลระบบ จะเข้าถึงข้อมูลทุกส่วนได้ กรุณาตรวจสอบให้แน่ใจ
              </p>
            )}
          </>
        )}
      </Modal>

      {/* suspend / activate */}
      <Modal
        open={!!statusTarget}
        icon={statusTarget?.status === 'active' ? 'bi-slash-circle' : 'bi-check-circle'}
        title={statusTarget?.status === 'active' ? 'ระงับบัญชี' : 'เปิดใช้งานบัญชี'}
        onClose={() => setStatusTarget(null)}
        footer={
          <>
            <button onClick={() => setStatusTarget(null)} className={btn.ghost}>ยกเลิก</button>
            <button onClick={saveStatus} disabled={busy} className={statusTarget?.status === 'active' ? btn.danger : btn.primary}>
              <i className="bi bi-check-lg"></i> ยืนยัน
            </button>
          </>
        }
      >
        {statusTarget && (statusTarget.status === 'active' ? (
          <>
            <p className="text-sm text-slate-600">
              ระงับบัญชี <b>@{statusTarget.username}</b> ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง
            </p>
            <div className="mt-4">
              <Field label="เหตุผล (ไม่บังคับ)">
                <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} resize-none`} />
              </Field>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            เปิดใช้งานบัญชี <b>@{statusTarget.username}</b> อีกครั้ง
            {statusTarget.suspend_reason && <span className="block mt-2 text-xs text-slate-400">เหตุผลที่ถูกระงับ: {statusTarget.suspend_reason}</span>}
          </p>
        ))}
      </Modal>

      {/* reset password */}
      <Modal
        open={!!resetTarget}
        icon="bi-key"
        title="รีเซ็ตรหัสผ่าน"
        onClose={closeReset}
        footer={
          tempPw ? (
            <button onClick={closeReset} className={btn.primary}>เสร็จสิ้น</button>
          ) : (
            <>
              <button onClick={closeReset} className={btn.ghost}>ยกเลิก</button>
              <button onClick={resetPassword} disabled={busy} className={btn.primary}><i className="bi bi-key"></i> สร้างรหัสชั่วคราว</button>
            </>
          )
        }
      >
        {resetTarget && (tempPw ? (
          <>
            <p className="text-sm text-slate-600 mb-3">รหัสผ่านชั่วคราวของ <b>@{resetTarget.username}</b> (แสดงครั้งเดียว กรุณาแจ้งผู้ใช้และให้เปลี่ยนทันที)</p>
            <div className="flex items-center gap-2 p-4 rounded-2xl bg-sky-50 border border-sky-100">
              <code className="flex-1 font-mono text-lg font-bold text-sky-700 break-all">{tempPw}</code>
              <button
                onClick={() => navigator.clipboard?.writeText(tempPw).then(() => showToast('คัดลอกแล้ว'))}
                className="w-10 h-10 rounded-xl bg-white text-sky-500 hover:bg-sky-100 cursor-pointer"
                title="คัดลอก"
              >
                <i className="bi bi-clipboard"></i>
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            ระบบจะสร้างรหัสผ่านชั่วคราวใหม่ให้ <b>@{resetTarget.username}</b> รหัสเดิมจะใช้ไม่ได้ทันที และจะปลดล็อกบัญชีหากถูกล็อกอยู่
          </p>
        ))}
      </Modal>

      {/* create */}
      <Modal
        open={createOpen}
        icon="bi-person-plus"
        title="สร้างบัญชีเจ้าหน้าที่"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button onClick={() => setCreateOpen(false)} className={btn.ghost}>ยกเลิก</button>
            <button onClick={createUser} disabled={busy} className={btn.primary}><i className="bi bi-check-lg"></i> สร้างบัญชี</button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Username" required><input value={form.username} onChange={set('username')} className={inputCls} placeholder="เช่น nurse_mali" /></Field>
          <Field label="รหัสผ่าน" required><input type="password" value={form.password} onChange={set('password')} className={inputCls} placeholder="ตามนโยบายความปลอดภัย" /></Field>
          <Field label="ชื่อจริง" required><input value={form.first_name} onChange={set('first_name')} className={inputCls} /></Field>
          <Field label="นามสกุล" required><input value={form.last_name} onChange={set('last_name')} className={inputCls} /></Field>
          <Field label="เบอร์โทร"><input value={form.phone_number} onChange={set('phone_number')} className={inputCls} /></Field>
          <Field label="เพศ">
            <select value={form.gender} onChange={set('gender')} className={inputCls}>
              <option value="female">หญิง</option>
              <option value="male">ชาย</option>
              <option value="other">อื่นๆ</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Role" required>
              <select value={form.role} onChange={set('role')} className={inputCls}>
                {STAFF_ROLES.map((k) => <option key={k} value={k}>{ROLES[k].label}</option>)}
              </select>
            </Field>
            <p className="text-xs text-slate-400 mt-1.5">* บัญชีผู้รับบริการ สร้างผ่านเมนู "เพิ่มผู้ป่วยใหม่" ของพยาบาล</p>
          </div>
        </div>
        {formError && (
          <p className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-500 text-sm flex items-center gap-2">
            <i className="bi bi-exclamation-circle"></i>{formError}
          </p>
        )}
      </Modal>

      <Toast toast={toast} />
    </div>
  );
};

export default Accounts;
