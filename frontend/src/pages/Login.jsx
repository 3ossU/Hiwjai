import { useState } from 'react';
import { api, store } from '../api';

const init = { username: '', password: '' };
const initForgot = { username: '', hn: '', phone_number: '', newPassword: '', confirm: '' };

const field = 'w-full h-10 px-3.5 bg-ivory text-sm text-gray-800 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-ivory/70';
const labelCls = 'flex flex-col gap-1.5 text-sm text-ivory';

const Heart = ({ className }) => (
  <svg className={`absolute fill-ivory ${className}`} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.8 4.8 6.2 4.8c2 0 3.8 1.1 4.8 2.7l1 1.5 1-1.5c1-1.6 2.8-2.7 4.8-2.7 3.4 0 5.3 3.6 3.8 7C19.5 16.4 12 21 12 21z" />
  </svg>
);

const Lock = () => (
  <svg className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export default function Login({ onLogin }) {
  // mode: login = เข้าสู่ระบบ, verify = ยืนยันตัวตน, reset = ตั้งรหัสใหม่, done = เสร็จแล้ว
  const [mode, setMode] = useState('login');
  const [f, setF] = useState(init);
  const [fg, setFg] = useState(initForgot);
  const [resetToken, setResetToken] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = k => e => setF({ ...f, [k]: e.target.value });
  const setFgField = k => e => setFg({ ...fg, [k]: e.target.value });

  function goto(next) {
    setErr('');
    setMode(next);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');

    try {
      const body = { username: f.username, password: f.password };
      const d = await api('/auth/login', { method: 'POST', body });
      store.save(d.accessToken, d.refreshToken, d.user);
      onLogin(d.user);
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  // ลืมรหัส ขั้นที่ 1: ยืนยันตัวตน
  async function verify(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');

    try {
      const body = { username: fg.username, hn: fg.hn, phone_number: fg.phone_number };
      const d = await api('/auth/forgot-password', { method: 'POST', body });
      setResetToken(d.resetToken);
      setMode('reset');
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  // ลืมรหัส ขั้นที่ 2: ตั้งรหัสใหม่
  async function reset(e) {
    e.preventDefault();
    setErr('');

    if (fg.newPassword.length < 8) return setErr('รหัสใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร');
    if (fg.newPassword !== fg.confirm) return setErr('รหัสผ่านทั้งสองช่องไม่ตรงกัน');

    setBusy(true);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: { resetToken, newPassword: fg.newPassword },
      });
      setFg(initForgot);
      setResetToken('');
      setF({ username: fg.username, password: '' });
      setMode('done');
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  const submitBtn = 'mt-3 self-center h-8 min-w-32 rounded-lg bg-ivory px-6 text-xs font-semibold text-black shadow cursor-pointer disabled:opacity-60 disabled:cursor-wait';
  const linkBtn = 'self-center text-xs underline cursor-pointer';

  return (
    <div className="min-h-svh grid place-items-center px-4 py-8 bg-linear-to-b from-[#9fe4f2] via-[#c4eff3] to-ivory">
      <form
        onSubmit={mode === 'login' ? submit : mode === 'verify' ? verify : mode === 'reset' ? reset : e => e.preventDefault()}
        className="w-full max-w-md flex flex-col gap-3.5 rounded-[48px] bg-brand px-8 py-11 sm:px-16 text-ivory shadow-[0_6px_6px_rgba(0,0,0,0.35)]"
      >
        <div className="relative w-16 h-20">
          <Heart className="w-7 left-0 top-0" />
          <Heart className="w-5 left-9 top-2" />
          <Heart className="w-11 left-1 top-7" />
        </div>

        {mode === 'login' && (
          <>
            <h1 className="text-3xl font-bold">Welcome</h1>
            <p className="-mt-1.5 mb-2 text-xs leading-snug">HealthConnect — จองปรึกษาสุขภาพจิต</p>

            <label className={labelCls}>Username
              <input className={field} value={f.username} onChange={set('username')} placeholder="Enter your Username here" required />
            </label>

            <label className={labelCls}>Password
              <div className="relative">
                <Lock />
                <input className={`${field} pl-10`} type="password" value={f.password} onChange={set('password')} placeholder="••••••" required />
              </div>
            </label>

            <button type="button" onClick={() => { setFg({ ...initForgot, username: f.username }); goto('verify'); }} className="-mt-2 self-end text-[11px] hover:underline cursor-pointer">
              Forgot Password
            </button>

            {err && <div className="rounded-lg bg-ivory/90 px-3 py-2 text-xs text-red-600">{err}</div>}

            <button type="submit" disabled={busy} className={submitBtn}>Sign in</button>
          </>
        )}

        {mode === 'verify' && (
          <>
            <h1 className="text-2xl font-bold">ลืมรหัสผ่าน</h1>
            <p className="-mt-1.5 mb-2 text-xs leading-snug">
              กรอกข้อมูลที่ลงทะเบียนไว้กับโรงพยาบาลเพื่อยืนยันตัวตน
            </p>

            <label className={labelCls}>Username
              <input className={field} value={fg.username} onChange={setFgField('username')} required />
            </label>
            <label className={labelCls}>HN
              <input className={field} value={fg.hn} onChange={setFgField('hn')} required />
            </label>
            <label className={labelCls}>เบอร์โทรศัพท์
              <input className={field} type="tel" value={fg.phone_number} onChange={setFgField('phone_number')} placeholder="xxx-xxx-xxxx" required />
            </label>

            {err && <div className="rounded-lg bg-ivory/90 px-3 py-2 text-xs text-red-600">{err}</div>}

            <button type="submit" disabled={busy} className={submitBtn}>ยืนยันตัวตน</button>
            <button type="button" onClick={() => goto('login')} className={linkBtn}>กลับไปหน้าเข้าสู่ระบบ</button>
          </>
        )}

        {mode === 'reset' && (
          <>
            <h1 className="text-2xl font-bold">ตั้งรหัสผ่านใหม่</h1>
            <p className="-mt-1.5 mb-2 text-xs leading-snug">ยืนยันตัวตนสำเร็จ กรุณาตั้งรหัสผ่านใหม่ภายใน 10 นาที</p>

            <label className={labelCls}>รหัสผ่านใหม่
              <div className="relative">
                <Lock />
                <input className={`${field} pl-10`} type="password" value={fg.newPassword} onChange={setFgField('newPassword')} placeholder="อย่างน้อย 8 ตัวอักษร" required />
              </div>
            </label>
            <label className={labelCls}>ยืนยันรหัสผ่านใหม่
              <div className="relative">
                <Lock />
                <input className={`${field} pl-10`} type="password" value={fg.confirm} onChange={setFgField('confirm')} required />
              </div>
            </label>

            {err && <div className="rounded-lg bg-ivory/90 px-3 py-2 text-xs text-red-600">{err}</div>}

            <button type="submit" disabled={busy} className={submitBtn}>บันทึกรหัสผ่านใหม่</button>
            <button type="button" onClick={() => goto('login')} className={linkBtn}>ยกเลิก</button>
          </>
        )}

        {mode === 'done' && (
          <>
            <h1 className="text-2xl font-bold">เปลี่ยนรหัสผ่านสำเร็จ</h1>
            <p className="text-xs leading-snug">ตอนนี้สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว</p>
            <button type="button" onClick={() => goto('login')} className={submitBtn}>ไปหน้าเข้าสู่ระบบ</button>
          </>
        )}
      </form>
    </div>
  );
}