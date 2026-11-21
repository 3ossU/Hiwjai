import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { store } from '../../api'
import {
  LINE_OA_ID,
  LINE_OA_NAME,
  lineAddUrl,
  lineMessageUrl,
  isPlaceholderId,
} from './lineConfig'
import './Chat.css'

const LineLogo = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="ln-logo">
    <path
      fill="currentColor"
      d="M12 2C6.48 2 2 5.58 2 10c0 3.96 3.52 7.28 8.28 7.92.32.07.76.21.87.49.1.25.07.64.03.9l-.14.84c-.04.25-.2.98.86.54 1.06-.45 5.72-3.37 7.8-5.77C21.2 13.4 22 11.8 22 10c0-4.42-4.48-8-10-8zM8.3 12.6H6.1a.5.5 0 0 1-.5-.5V8.3a.5.5 0 0 1 1 0v3.3h1.7a.5.5 0 0 1 0 1zm2.3-.5a.5.5 0 0 1-1 0V8.3a.5.5 0 0 1 1 0v3.8zm4.9 0a.5.5 0 0 1-.9.3l-2-2.7v2.4a.5.5 0 0 1-1 0V8.3a.5.5 0 0 1 .9-.3l2 2.7V8.3a.5.5 0 0 1 1 0v3.8zm3.2-2.2a.5.5 0 0 1 0 1h-1.2v.7h1.2a.5.5 0 0 1 0 1h-1.7a.5.5 0 0 1-.5-.5V8.3a.5.5 0 0 1 .5-.5h1.7a.5.5 0 0 1 0 1h-1.2v.7h1.2z"
    />
  </svg>
)

const STEPS = [
  { n: 1, t: 'กดปุ่มสีเขียว', d: '"เพิ่มเพื่อนไลน์" ด้านบน' },
  { n: 2, t: 'กด "เพิ่ม"', d: 'ในหน้า LINE ที่เปิดขึ้นมา' },
  { n: 3, t: 'พิมพ์คุยได้เลย', d: 'ทีมดูแลจะตอบกลับในไลน์ของคุณ' },
]

export default function Chat({ user }) {
  const ctx = useOutletContext()
  const p = ctx?.profile
  const cached = store.user()
  const name = p ? `${p.first_name} ${p.last_name}` : user?.name || cached?.name || ''
  const hn = p?.hn || user?.hn || cached?.hn || ''
  const [copied, setCopied] = useState(false)

  // ข้อความที่เตรียมไว้ให้ ผู้ป่วยแค่กดส่ง เจ้าหน้าที่จะรู้ว่าเป็นใคร
  const greeting = `สวัสดีครับ/ค่ะ ชื่อ ${name}${hn ? ` HN ${hn}` : ''} ต้องการปรึกษาครับ/ค่ะ`

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(LINE_OA_ID)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('คัดลอก LINE ID นี้', LINE_OA_ID)
    }
  }

  return (
    <div className="ln">
      <h1 className="pt-title">แชทกับทีมดูแล</h1>

      {isPlaceholderId && (
        <div className="ln-warn">
          ⚠️ ยังไม่ได้ตั้งค่า LINE ID ของโรงพยาบาล แก้ที่ <code>lineConfig.js</code> หรือ <code>VITE_LINE_OA_ID</code>
        </div>
      )}

      {/* การ์ดหลัก */}
      <section className="ln-hero">
        <div className="ln-badge"><LineLogo /></div>
        <h2>คุยกับเราทาง LINE</h2>
        <p>สะดวก ใช้ง่าย เหมือนคุยกับครอบครัว<br />ไม่ต้องสมัครอะไรเพิ่ม</p>

        <a className="ln-big" href={lineAddUrl} target="_blank" rel="noreferrer">
          <LineLogo /> เพิ่มเพื่อนไลน์
        </a>

        <div className="ln-id">
          <span>LINE ID: <b>{LINE_OA_ID}</b></span>
          <button type="button" onClick={copyId}>{copied ? '✓ คัดลอกแล้ว' : 'คัดลอก'}</button>
        </div>
      </section>

      {/* ขั้นตอน */}
      <section className="ln-card">
        <h3>วิธีใช้ 3 ขั้นตอน</h3>
        <ol className="ln-steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="ln-num">{s.n}</span>
              <div>
                <b>{s.t}</b>
                <small>{s.d}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ส่งข้อความหาเรา */}
      <section className="ln-card">
        <h3>แอดแล้ว กดส่งข้อความได้เลย</h3>
        <p className="ln-note">
          ระบบเตรียมข้อความแนะนำตัวให้แล้ว ไม่ต้องพิมพ์เอง
        </p>
        <div className="ln-preview">“{greeting}”</div>
        <a className="ln-big ln-big-outline" href={lineMessageUrl(greeting)} target="_blank" rel="noreferrer">
          <LineLogo /> ส่งข้อความหาเรา
        </a>
      </section>

      {/* QR สำหรับคอม */}
      <section className="ln-card ln-qr">
        <div>
          <h3>เปิดจากคอมพิวเตอร์?</h3>
          <p className="ln-note">เปิดแอป LINE ในมือถือ แล้วสแกน QR นี้ (เมนู “เพิ่มเพื่อน” → “QR Code”)</p>
        </div>
        <div className="ln-qr-box">
          <QRCodeSVG value={lineAddUrl} size={170} level="M" marginSize={1} />
          <small>{LINE_OA_NAME}</small>
        </div>
      </section>

      <p className="ln-foot">
        กรณีฉุกเฉินหรือมีอาการรุนแรง กรุณาโทร <b>1669</b> (การแพทย์ฉุกเฉิน) หรือ <b>1323</b> (สายด่วนสุขภาพจิต)
        <br />แชทอาจตอบกลับในเวลาทำการเท่านั้น
      </p>
    </div>
  )
}
