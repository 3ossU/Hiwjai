import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import './ForgotPassword.css'

const maskPhone = (p) => (p.length >= 4 ? `xxx-xxx-${p.slice(-4)}` : p)

export default function ForgotPassword() {
  const navigate = useNavigate()

  // 1 = กรอกเบอร์, 2 = กรอก OTP, 3 = ตั้งรหัสใหม่, 4 = สำเร็จ
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // นับถอยหลังก่อนขอ OTP ใหม่ได้
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const cleanPhone = phone.replace(/[^\d+]/g, '')

  const requestOtp = async () => {
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const r = await api('/auth/otp/request', {
        method: 'POST',
        body: { phone_number: cleanPhone },
      })
      setDevOtp(r.devOtp || '')
      setCooldown(r.resendAfter || 60)
      setInfo(r.message || '')
      setOtp('')
      setStep(2)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const submitPhone = (e) => {
    e.preventDefault()
    requestOtp()
  }

  const submitOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(otp)) return setError('กรุณากรอกรหัส OTP 6 หลัก')
    setLoading(true)
    try {
      const r = await api('/auth/otp/verify', {
        method: 'POST',
        body: { phone_number: cleanPhone, otp },
      })
      setResetToken(r.resetToken)
      setStep(3)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) return setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    if (!/[^A-Za-z0-9]/.test(newPassword))
      return setError('รหัสผ่านต้องมีสัญลักษณ์อย่างน้อย 1 ตัว เช่น ! @ # $')
    if (newPassword !== confirm) return setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')

    setLoading(true)
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: { resetToken, newPassword },
      })
      setStep(4)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const backToPhone = () => {
    setStep(1)
    setOtp('')
    setError('')
    setInfo('')
    setDevOtp('')
  }

  return (
    <div className="fp-page">
      <div className="fp-card">
        <div className="fp-brand">Hiwjai</div>

        {step < 4 && (
          <div className="fp-steps" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <span key={n} className={'fp-dot' + (step >= n ? ' on' : '')}>{n}</span>
            ))}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={submitPhone}>
            <h1>ลืมรหัสผ่าน</h1>
            <p className="fp-sub">
              กรอกเบอร์โทรที่ลงทะเบียนไว้กับโรงพยาบาล เราจะส่งรหัส OTP ไปทาง SMS
            </p>

            <label htmlFor="fp-phone">เบอร์โทรศัพท์</label>
            <input
              id="fp-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="เช่น 0812345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoFocus
            />

            {error && <div className="fp-msg err">{error}</div>}

            <button className="fp-btn" disabled={loading || cleanPhone.length < 9}>
              {loading ? 'กำลังส่ง...' : 'ส่งรหัส OTP'}
            </button>

            <p className="fp-help">
              เบอร์เปลี่ยนหรือรับ SMS ไม่ได้ กรุณาติดต่อเจ้าหน้าที่ที่เคาน์เตอร์โรงพยาบาล
            </p>
          </form>
        )}

     
        {step === 2 && (
          <form onSubmit={submitOtp}>
            <h1>กรอกรหัส OTP</h1>
            <p className="fp-sub">
              ถ้าเบอร์ <b>{maskPhone(cleanPhone)}</b> ลงทะเบียนไว้ในระบบ เราได้ส่งรหัส 6 หลักไปทาง SMS แล้ว
              (ใช้ได้ 5 นาที)
            </p>

            {devOtp && (
              <div className="fp-msg dev">
                โหมดทดสอบ: รหัส OTP คือ <b>{devOtp}</b>
              </div>
            )}

            <label htmlFor="fp-otp">รหัส OTP</label>
            <input
              id="fp-otp"
              className="fp-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              autoFocus
            />

            {error && <div className="fp-msg err">{error}</div>}

            <button className="fp-btn" disabled={loading || otp.length !== 6}>
              {loading ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัส'}
            </button>

            <div className="fp-row">
              <button type="button" className="fp-link" onClick={backToPhone}>
                เปลี่ยนเบอร์
              </button>
              <button
                type="button"
                className="fp-link"
                disabled={cooldown > 0 || loading}
                onClick={requestOtp}
              >
                {cooldown > 0 ? `ขอรหัสใหม่ได้ใน ${cooldown} วินาที` : 'ขอรหัสใหม่'}
              </button>
            </div>
          </form>
        )}

       
        {step === 3 && (
          <form onSubmit={submitPassword}>
            <h1>ตั้งรหัสผ่านใหม่</h1>
            <p className="fp-sub">อย่างน้อย 8 ตัวอักษร และมีสัญลักษณ์ 1 ตัว เช่น ! @ # $</p>

            <label htmlFor="fp-new">รหัสผ่านใหม่</label>
            <input
              id="fp-new"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoFocus
            />

            <label htmlFor="fp-confirm">ยืนยันรหัสผ่านใหม่</label>
            <input
              id="fp-confirm"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />

            <label className="fp-check">
              <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
              แสดงรหัสผ่าน
            </label>

            {error && <div className="fp-msg err">{error}</div>}

            <button className="fp-btn" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
            </button>
          </form>
        )}

        {step === 4 && (
          <div className="fp-done">
            <div className="fp-ok">✓</div>
            <h1>เปลี่ยนรหัสผ่านสำเร็จ</h1>
            <p className="fp-sub">ใช้รหัสผ่านใหม่เข้าสู่ระบบได้เลย</p>
            <button className="fp-btn" onClick={() => navigate('/login', { replace: true })}>
              ไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        )}

        {step < 4 && (
          <div className="fp-back">
            <Link to="/login">← กลับไปหน้าเข้าสู่ระบบ</Link>
          </div>
        )}
      </div>
    </div>
  )
}