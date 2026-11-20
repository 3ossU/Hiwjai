import { useMemo, useState } from 'react';
import { thaiDate, adminApi, useAdminData, useToast } from './adminData';
import { PageHeader, Card, Modal, Field, Loading, ErrorBox, Toast } from './AdminUI';
import { inputCls, btn } from './adminStyles';

const emptyForm = {
  title: '',
  description: '',
  location: '',
  start_at: '',
  capacity: 20,
};

const toInputDateTime = (s) => {
  if (!s) return '';
  const d = new Date(typeof s === 'string' ? s.replace(' ', 'T') : s);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Activities = () => {
  const { data, error, loading, reload } = useAdminData('/activities');
  const activities = useMemo(() => data || [], [data]);
  const [toast, showToast] = useToast();

  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [regModal, setRegModal] = useState({ open: false, activity: null, list: [], loading: false });

  const now = Date.now();
  const isUpcoming = (a) => new Date(typeof a.start_at === 'string' ? a.start_at.replace(' ', 'T') : a.start_at).getTime() >= now;

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return activities.filter((a) => {
      const matchTab =
        tab === 'all' ||
        (tab === 'upcoming' && isUpcoming(a)) ||
        (tab === 'past' && !isUpcoming(a));
      const matchSearch = !k || `${a.title} ${a.location || ''} ${a.description || ''}`.toLowerCase().includes(k);
      return matchTab && matchSearch;
    });
  }, [activities, tab, q]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setFormError('');
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditing('new');
    setFormError('');
  };

  const openEdit = (a) => {
    setForm({
      title: a.title || '',
      description: a.description || '',
      location: a.location || '',
      start_at: toInputDateTime(a.start_at),
      capacity: a.capacity ?? 20,
    });
    setEditing(a);
    setFormError('');
  };

  const save = async () => {
    if (!form.title.trim() || !form.start_at) {
      return setFormError('กรุณากรอกชื่อกิจกรรมและวันเวลาที่จัดให้ครบถ้วน');
    }
    if (Number(form.capacity) < 1) {
      return setFormError('จำนวนที่รับต้องมากกว่า 0 คน');
    }

    setBusy(true);
    try {
      const startAtSql = form.start_at.replace('T', ' ') + (form.start_at.length === 16 ? ':00' : '');
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        start_at: startAtSql,
        capacity: Number(form.capacity),
      };

      if (editing === 'new') {
        await adminApi('/activities', { method: 'POST', body: payload });
        showToast('เพิ่มกิจกรรมใหม่เรียบร้อยแล้ว');
      } else {
        await adminApi(`/activities/${editing.id}`, { method: 'PUT', body: payload });
        showToast('บันทึกการแก้ไขกิจกรรมเรียบร้อยแล้ว');
      }
      setEditing(null);
      reload();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await adminApi(`/activities/${deleteTarget.id}`, { method: 'DELETE' });
      showToast(`ลบกิจกรรม "${deleteTarget.title}" เรียบร้อยแล้ว`);
      setDeleteTarget(null);
      reload();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const openRegistrations = async (activity) => {
    setRegModal({ open: true, activity, list: [], loading: true });
    try {
      const rows = await adminApi(`/activities/${activity.id}/registrations`);
      setRegModal({ open: true, activity, list: rows, loading: false });
    } catch (e) {
      showToast(e.message, 'error');
      setRegModal({ open: false, activity: null, list: [], loading: false });
    }
  };

  const tabs = [
    { key: 'all', label: 'ทั้งหมด', n: activities.length },
    { key: 'upcoming', label: 'กำลังจะมาถึง', n: activities.filter(isUpcoming).length },
    { key: 'past', label: 'จัดไปแล้ว', n: activities.filter((a) => !isUpcoming(a)).length },
  ];

  return (
    <div className="pb-10">
      <PageHeader icon="bi-calendar-event-fill" title="จัดการกิจกรรมคลินิก" subtitle="สร้าง แก้ไข และติดตามผู้เข้าร่วมกิจกรรมกลุ่มบำบัดและเวิร์กชอป">
        <button onClick={reload} className={btn.ghost} title="รีเฟรช">
          <i className={`bi bi-arrow-clockwise ${loading ? 'animate-spin' : ''}`}></i>
        </button>
        <button onClick={openNew} className={btn.primary}>
          <i className="bi bi-plus-lg"></i> เพิ่มกิจกรรมใหม่
        </button>
      </PageHeader>

      {error && (
        <div className="mb-5">
          <ErrorBox message={error} onRetry={reload} />
        </div>
      )}

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
              {t.label} <span className="opacity-75">({t.n})</span>
            </button>
          ))}
        </div>

        <div className="relative md:ml-auto md:w-80">
          <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-sky-300"></i>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อกิจกรรมหรือสถานที่..."
            className={`${inputCls} pl-11 bg-white`}
          />
        </div>
      </div>

      {loading && !data ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {list.map((a) => {
            const upcoming = isUpcoming(a);
            const regCount = Number(a.registered_count) || 0;
            const cap = Number(a.capacity) || 1;
            const pct = Math.min(100, Math.round((regCount / cap) * 100));
            const isFull = regCount >= cap;

            return (
              <Card key={a.id} className={`flex flex-col overflow-hidden ${!upcoming ? 'opacity-80' : ''}`}>
                <div className={`px-6 py-4 flex items-center justify-between ${upcoming ? 'bg-gradient-to-r from-sky-400 to-cyan-300 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <i className="bi bi-clock"></i> {thaiDate(a.start_at)}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      !upcoming
                        ? 'bg-white/80 text-slate-600'
                        : isFull
                        ? 'bg-rose-500 text-white'
                        : 'bg-white/25 text-white backdrop-blur-sm'
                    }`}
                  >
                    {!upcoming ? 'เสร็จสิ้นแล้ว' : isFull ? 'เต็มแล้ว' : 'เปิดรับสมัคร'}
                  </span>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-slate-800 line-clamp-1">{a.title}</h3>
                  <p className="text-xs text-sky-600 font-medium mt-1 flex items-center gap-1.5">
                    <i className="bi bi-geo-alt-fill"></i> {a.location || 'ไม่ระบุสถานที่'}
                  </p>

                  <p className="mt-3 text-sm text-slate-500 line-clamp-2 min-h-10">
                    {a.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                  </p>

                  <div className="mt-5 pt-4 border-t border-sky-50">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">ผู้ลงทะเบียนเข้าร่วม</span>
                      <span className="font-bold text-sky-700">
                        {regCount} / {cap} คน
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-sky-50 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isFull ? 'bg-rose-400' : 'bg-gradient-to-r from-sky-400 to-cyan-300'}`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-5">
                    <button
                      onClick={() => openRegistrations(a)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-50 text-cyan-700 font-semibold text-xs hover:bg-cyan-100 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <i className="bi bi-people-fill"></i> รายชื่อ ({regCount})
                    </button>
                    <button
                      onClick={() => openEdit(a)}
                      title="แก้ไขกิจกรรม"
                      className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 transition cursor-pointer flex items-center justify-center"
                    >
                      <i className="bi bi-pencil-square"></i>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(a)}
                      title="ลบกิจกรรม"
                      className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition cursor-pointer flex items-center justify-center"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}

          <button
            onClick={openNew}
            className="min-h-72 rounded-3xl border-2 border-dashed border-sky-200 text-sky-400 hover:bg-white hover:border-sky-300 hover:text-sky-500 transition flex flex-col items-center justify-center gap-2 cursor-pointer"
          >
            <span className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center">
              <i className="bi bi-plus-lg text-2xl"></i>
            </span>
            <span className="font-semibold">เพิ่มกิจกรรมใหม่</span>
          </button>
        </div>
      )}

      {/* Modal เพิ่ม / แก้ไข */}
      <Modal
        open={!!editing}
        icon={editing === 'new' ? 'bi-calendar-plus' : 'bi-pencil-square'}
        title={editing === 'new' ? 'เพิ่มกิจกรรมใหม่' : 'แก้ไขข้อมูลกิจกรรม'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button onClick={() => setEditing(null)} className={btn.ghost}>ยกเลิก</button>
            <button onClick={save} disabled={busy} className={btn.primary}>
              <i className="bi bi-check-lg"></i> บันทึกกิจกรรม
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="ชื่อกิจกรรม" required>
            <input value={form.title} onChange={set('title')} className={inputCls} placeholder="เช่น กลุ่มบำบัดคลายเครียด" />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="วันและเวลาที่จัด" required>
              <input type="datetime-local" value={form.start_at} onChange={set('start_at')} className={inputCls} />
            </Field>
            <Field label="จำนวนที่รับ (คน)" required>
              <input type="number" min={1} max={500} value={form.capacity} onChange={set('capacity')} className={inputCls} />
            </Field>
          </div>

          <Field label="สถานที่จัดกิจกรรม">
            <input value={form.location} onChange={set('location')} className={inputCls} placeholder="เช่น ห้องประชุม 2 ชั้น 3" />
          </Field>

          <Field label="รายละเอียดกิจกรรม">
            <textarea rows={3} value={form.description} onChange={set('description')} className={`${inputCls} resize-none`} placeholder="รายละเอียดเพิ่มเติม..." />
          </Field>
        </div>

        {formError && (
          <p className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-500 text-sm flex items-center gap-2">
            <i className="bi bi-exclamation-circle"></i>
            {formError}
          </p>
        )}
      </Modal>

      {/* Modal ดูรายชื่อผู้ลงทะเบียน */}
      <Modal
        open={regModal.open}
        icon="bi-people-fill"
        title={`รายชื่อผู้ลงทะเบียน (${regModal.list.length}/${regModal.activity?.capacity || 0})`}
        onClose={() => setRegModal({ open: false, activity: null, list: [], loading: false })}
        footer={
          <button onClick={() => setRegModal({ open: false, activity: null, list: [], loading: false })} className={btn.primary}>
            ปิดหน้าต่าง
          </button>
        }
      >
        {regModal.activity && (
          <div>
            <div className="p-3.5 rounded-2xl bg-sky-50 mb-4">
              <p className="font-bold text-sky-800 text-sm">{regModal.activity.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                <i className="bi bi-clock"></i> {thaiDate(regModal.activity.start_at)} · {regModal.activity.location || 'ไม่ระบุสถานที่'}
              </p>
            </div>

            {regModal.loading ? (
              <Loading text="กำลังโหลดรายชื่อผู้ลงทะเบียน..." />
            ) : regModal.list.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <i className="bi bi-person-x text-3xl text-sky-200 block mb-2"></i>
                <p className="text-sm">ยังไม่มีผู้ลงทะเบียนเข้าร่วมกิจกรรมนี้</p>
              </div>
            ) : (
              <div className="divide-y divide-sky-50 border border-sky-100 rounded-2xl overflow-hidden">
                {regModal.list.map((r, idx) => (
                  <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3 bg-white hover:bg-sky-50/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">
                          {r.first_name} {r.last_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          HN: {r.hn} · โทร: {r.phone_number || '-'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">{thaiDate(r.registered_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal ยืนยันการลบ */}
      <Modal
        open={!!deleteTarget}
        icon="bi-trash"
        title="ยืนยันการลบกิจกรรม"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} className={btn.ghost}>ยกเลิก</button>
            <button onClick={confirmDelete} disabled={busy} className={btn.danger}>
              <i className="bi bi-trash"></i> ยืนยันการลบ
            </button>
          </>
        }
      >
        {deleteTarget && (
          <p className="text-sm text-slate-600">
            ต้องการลบกิจกรรม <b>"{deleteTarget.title}"</b> ใช่หรือไม่?
            {Number(deleteTarget.registered_count) > 0 && (
              <span className="block mt-2 p-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs">
                ⚠️ กิจกรรมนี้มีผู้ลงทะเบียนอยู่ {deleteTarget.registered_count} คน ข้อมูลการลงทะเบียนจะถูกลบออกทั้งหมด
              </span>
            )}
          </p>
        )}
      </Modal>

      <Toast toast={toast} />
    </div>
  );
};

export default Activities;