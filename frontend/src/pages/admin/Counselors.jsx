import { useState } from 'react';
import { SPECIALTIES, fullName, avatarOf, adminApi, useAdminData, useToast } from './adminData';
import { PageHeader, Card, StatusBadge, Modal, Field, Loading, ErrorBox, Toast } from './AdminUI';
import { inputCls, btn } from './adminStyles';

const emptyForm = {
  username: '', password: '', first_name: '', last_name: '', gender: 'female',
  phone_number: '', avatar_url: '', specialty: SPECIALTIES[0], license: '', bio: '',
};

const Counselors = () => {
  const { data, setData, error, loading, reload } = useAdminData('/counselors');
  const counselors = data || [];
  const [toast, showToast] = useToast();

  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // null = ปิด, 'new' = เพิ่ม, object = แก้ไข
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const list = counselors.filter(
    (c) =>
      (tab === 'all' || c.status === tab) &&
      `${fullName(c)} ${c.username} ${c.specialty || ''}`.toLowerCase().includes(q.trim().toLowerCase())
  );

  const replace = (c) => setData((prev) => prev.map((x) => (x.id === c.id ? c : x)));

  const openNew = () => {
    setForm(emptyForm);
    setEditing('new');
    setFormError('');
  };
  const openEdit = (c) => {
    const filled = Object.fromEntries(Object.keys(emptyForm).map((k) => [k, c[k] ?? emptyForm[k]]));
    setForm({ ...filled, password: '' });
    setEditing(c);
    setFormError('');
  };
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setFormError('');
  };

  const save = async () => {
    if (!form.first_name || !form.last_name || !form.username || !form.license) {
      return setFormError('กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบ');
    }
    setBusy(true);
    try {
      if (editing === 'new') {
        const c = await adminApi('/counselors', { method: 'POST', body: form });
        setData((prev) => [c, ...prev]);
        showToast(`เพิ่ม ${fullName(c)} เรียบร้อย`);
      } else {
        const body = { ...form };
        delete body.password;
        const c = await adminApi(`/counselors/${editing.id}`, { method: 'PUT', body });
        replace(c);
        showToast('บันทึกการแก้ไขแล้ว');
      }
      setEditing(null);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (c, status, why) => {
    setBusy(true);
    try {
      const u = await adminApi(`/users/${c.id}/status`, { method: 'PATCH', body: { status, reason: why } });
      replace({ ...c, status: u.status, suspend_reason: u.suspend_reason });
      showToast(status === 'suspended' ? `ระงับบัญชี ${c.username} แล้ว` : `เปิดใช้งาน ${c.username} แล้ว`);
      setSuspendTarget(null);
      setReason('');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    { key: 'all', label: 'ทั้งหมด', n: counselors.length },
    { key: 'active', label: 'ใช้งานอยู่', n: counselors.filter((c) => c.status === 'active').length },
    { key: 'suspended', label: 'ถูกระงับ', n: counselors.filter((c) => c.status === 'suspended').length },
  ];

  return (
    <div className="pb-10">
      <PageHeader icon="bi-chat-heart-fill" title="บัญชีผู้ให้คำปรึกษา" subtitle="เพิ่ม แก้ไข หรือระงับบัญชีจิตแพทย์และนักจิตวิทยา">
        <button onClick={openNew} className={btn.primary}><i className="bi bi-plus-lg"></i> เพิ่มผู้ให้คำปรึกษา</button>
      </PageHeader>

      {error && <div className="mb-5"><ErrorBox message={error} onRetry={reload} /></div>}

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="inline-flex p-1 rounded-2xl bg-white border border-sky-100">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                tab === t.key ? 'bg-sky-500 text-white shadow' : 'text-slate-500 hover:text-sky-600'
              }`}
            >
              {t.label} <span className="opacity-70">({t.n})</span>
            </button>
          ))}
        </div>
        <div className="relative md:ml-auto md:w-80">
          <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-sky-300"></i>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อหรือความเชี่ยวชาญ..." className={`${inputCls} pl-11 bg-white`} />
        </div>
      </div>

      {loading && !data ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {list.map((c) => (
            <Card key={c.id} className={`overflow-hidden ${c.status === 'suspended' ? 'grayscale-[60%]' : ''}`}>
              <div className="h-20 bg-gradient-to-r from-sky-400 to-cyan-300 relative">
                <div className="absolute right-4 top-4"><StatusBadge status={c.status} /></div>
              </div>
              <div className="px-6 pb-6 -mt-10">
                <img src={avatarOf(c)} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md bg-sky-50" />
                <h3 className="mt-3 font-bold text-lg">{fullName(c)}</h3>
                <p className="text-xs text-slate-400">@{c.username} · เลขใบอนุญาต {c.license || '-'}</p>
                <span className="inline-block mt-3 px-3 py-1 rounded-full bg-sky-50 text-sky-600 text-xs font-semibold">
                  <i className="bi bi-stars mr-1"></i>{c.specialty || 'ยังไม่ระบุ'}
                </span>
                <p className="mt-3 text-sm text-slate-500 line-clamp-2 min-h-10">{c.bio || '—'}</p>

                {c.status === 'suspended' && c.suspend_reason && (
                  <p className="mt-2 text-xs text-rose-500 bg-rose-50 p-2 rounded-lg">เหตุผลที่ระงับ: {c.suspend_reason}</p>
                )}

                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="p-2 rounded-xl bg-sky-50/60">
                    <p className="font-bold text-sky-600">{c.sessions ?? 0}</p>
                    <p className="text-[10px] text-slate-400">ปรึกษาแล้ว</p>
                  </div>
                  <div className="p-2 rounded-xl bg-sky-50/60">
                    <p className="font-bold text-sky-600">{c.upcoming ?? 0}</p>
                    <p className="text-[10px] text-slate-400">นัดที่รออยู่</p>
                  </div>
                  <div className="p-2 rounded-xl bg-sky-50/60">
                    <p className="font-bold text-sky-600 text-sm leading-6">{c.phone_number || '-'}</p>
                    <p className="text-[10px] text-slate-400">ติดต่อ</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <button onClick={() => openEdit(c)} className="flex-1 py-2.5 rounded-xl bg-sky-50 text-sky-600 font-semibold text-sm hover:bg-sky-100 cursor-pointer">
                    <i className="bi bi-pencil-square mr-1"></i> แก้ไข
                  </button>
                  {c.status === 'active' ? (
                    <button onClick={() => setSuspendTarget(c)} className="flex-1 py-2.5 rounded-xl bg-rose-50 text-rose-500 font-semibold text-sm hover:bg-rose-100 cursor-pointer">
                      <i className="bi bi-pause-circle mr-1"></i> ระงับ
                    </button>
                  ) : (
                    <button disabled={busy} onClick={() => setStatus(c, 'active')} className="flex-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 font-semibold text-sm hover:bg-emerald-100 cursor-pointer">
                      <i className="bi bi-play-circle mr-1"></i> เปิดใช้งาน
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}

          <button
            onClick={openNew}
            className="min-h-80 rounded-3xl border-2 border-dashed border-sky-200 text-sky-400 hover:bg-white hover:border-sky-300 hover:text-sky-500 transition flex flex-col items-center justify-center gap-2 cursor-pointer"
          >
            <span className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center"><i className="bi bi-plus-lg text-2xl"></i></span>
            <span className="font-semibold">เพิ่มผู้ให้คำปรึกษาใหม่</span>
          </button>
        </div>
      )}

      {/* add / edit */}
      <Modal
        open={!!editing}
        icon={editing === 'new' ? 'bi-person-plus' : 'bi-pencil-square'}
        title={editing === 'new' ? 'เพิ่มผู้ให้คำปรึกษา' : 'แก้ไขข้อมูลผู้ให้คำปรึกษา'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button onClick={() => setEditing(null)} className={btn.ghost}>ยกเลิก</button>
            <button onClick={save} disabled={busy} className={btn.primary}><i className="bi bi-check-lg"></i> บันทึก</button>
          </>
        }
      >
        <div className="flex items-center gap-4 mb-5">
          <img src={form.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(form.username || 'new')}`} alt="" className="w-16 h-16 rounded-full object-cover border-4 border-sky-100 bg-sky-50" />
          <div className="flex-1">
            <Field label="URL รูปโปรไฟล์"><input value={form.avatar_url} onChange={set('avatar_url')} className={inputCls} placeholder="https://..." /></Field>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="ชื่อจริง" required><input value={form.first_name} onChange={set('first_name')} className={inputCls} /></Field>
          <Field label="นามสกุล" required><input value={form.last_name} onChange={set('last_name')} className={inputCls} /></Field>
          <Field label="Username" required>
            <input value={form.username} onChange={set('username')} disabled={editing !== 'new'} className={`${inputCls} disabled:opacity-60`} placeholder="เช่น dr_somsri" />
          </Field>
          {editing === 'new' && (
            <Field label="รหัสผ่าน" required><input type="password" value={form.password} onChange={set('password')} className={inputCls} placeholder="ตามนโยบายความปลอดภัย" /></Field>
          )}
          <Field label="เลขใบอนุญาตประกอบวิชาชีพ" required><input value={form.license} onChange={set('license')} className={inputCls} placeholder="เช่น ว.12345" /></Field>
          <Field label="ความเชี่ยวชาญ">
            <select value={form.specialty} onChange={set('specialty')} className={inputCls}>
              {[...new Set([...SPECIALTIES, form.specialty].filter(Boolean))].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="เบอร์โทร"><input value={form.phone_number} onChange={set('phone_number')} className={inputCls} /></Field>
          <Field label="เพศ">
            <select value={form.gender || 'other'} onChange={set('gender')} className={inputCls}>
              <option value="female">หญิง</option>
              <option value="male">ชาย</option>
              <option value="other">อื่นๆ</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="แนะนำตัวสั้นๆ"><textarea rows={3} value={form.bio} onChange={set('bio')} className={`${inputCls} resize-none`} placeholder="ข้อความที่ผู้รับบริการจะเห็น" /></Field>
          </div>
        </div>
        {formError && (
          <p className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-500 text-sm flex items-center gap-2"><i className="bi bi-exclamation-circle"></i>{formError}</p>
        )}
      </Modal>

      {/* suspend */}
      <Modal
        open={!!suspendTarget}
        icon="bi-pause-circle"
        title="ระงับบัญชีผู้ให้คำปรึกษา"
        onClose={() => setSuspendTarget(null)}
        footer={
          <>
            <button onClick={() => setSuspendTarget(null)} className={btn.ghost}>ยกเลิก</button>
            <button onClick={() => setStatus(suspendTarget, 'suspended', reason)} disabled={busy} className={btn.danger}>
              <i className="bi bi-pause-circle"></i> ยืนยันการระงับ
            </button>
          </>
        }
      >
        {suspendTarget && (
          <>
            <p className="text-sm text-slate-600">
              ระงับบัญชี <b>{fullName(suspendTarget)}</b> แล้ว ผู้ให้คำปรึกษาจะไม่สามารถเข้าสู่ระบบได้
              {suspendTarget.upcoming > 0 && (
                <span className="block mt-2 text-amber-600">⚠️ ยังมีนัดที่รออยู่ {suspendTarget.upcoming} นัด กรุณาประสานพยาบาลเพื่อย้ายนัด</span>
              )}
            </p>
            <div className="mt-4">
              <Field label="เหตุผลในการระงับ"><textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} resize-none`} placeholder="เช่น ลาพักยาว, ใบอนุญาตหมดอายุ" /></Field>
            </div>
          </>
        )}
      </Modal>

      <Toast toast={toast} />
    </div>
  );
};

export default Counselors;
