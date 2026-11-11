import { useState } from 'react';
import { api, store } from '../api';

const init = { username: '', password: '' };

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
  const [f, setF] = useState(init);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = k => e => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');

    try {
      const body = { username: f.username, password: f.password };
      const d = await api('/auth/login', { method: 'POST', body });
      store.save(d.accessToken, d.refreshToken, d.user); // แก้จากเดิม store.save(d.token, d.user)
      onLogin(d.user);
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-svh grid place-items-center px-4 py-8 bg-linear-to-b from-[#9fe4f2] via-[#c4eff3] to-ivory">
      <form
        onSubmit={submit}
        className="w-full max-w-md flex flex-col gap-3.5 rounded-[48px] bg-brand px-8 py-11 sm:px-16 text-ivory shadow-[0_6px_6px_rgba(0,0,0,0.35)]"
      >
        <div className="relative w-16 h-20">
          <Heart className="w-7 left-0 top-0" />
          <Heart className="w-5 left-9 top-2" />
          <Heart className="w-11 left-1 top-7" />
        </div>

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

        <button type="button" className="-mt-2 self-end text-[11px] hover:underline">Forgot Password</button>

        {err && <div className="rounded-lg bg-ivory/90 px-3 py-2 text-xs text-red-600">{err}</div>}

        <button
          type="submit"
          disabled={busy}
          className="mt-3 self-center h-8 min-w-32 rounded-lg bg-ivory px-6 text-xs font-semibold text-black shadow cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}