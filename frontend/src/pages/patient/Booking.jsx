import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { store, svc } from '../../api'
import './Booking.css'

const I = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  />
)

const ClinicIcon = () => (
  <I>
    <path d="M4 20V8.5L12 4l8 4.5V20" />
    <path d="M2.5 20h19" />
    <path d="M12 10v5M9.5 12.5h5" />
  </I>
)
const OnlineIcon = () => (
  <I>
    <rect x="3" y="5" width="18" height="12" rx="2.5" />
    <path d="M8 21h8M12 17v4" />
    <path d="M10.5 9.5v4l3.5-2z" fill="currentColor" stroke="none" />
  </I>
)
const HomeIcon = () => (
  <I>
    <path d="M3.5 11 12 4l8.5 7" />
    <path d="M5.5 9.5V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.5" />
    <path d="M12 17.2s-3-1.8-3-3.6c0-1.2 1.5-2 3-.7 1.5-1.3 3-.5 3 .7 0 1.8-3 3.6-3 3.6z" />
  </I>
)
const CheckIcon = () => (
  <I strokeWidth="3">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </I>
)
const Heart = ({ className }) => (
  <svg className={'bk-heart ' + className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.8 4.8 6.2 4.8c2 0 3.8 1.1 4.8 2.7l1 1.5 1-1.5c1-1.6 2.8-2.7 4.8-2.7 3.4 0 5.3 3.6 3.8 7C19.5 16.4 12 21 12 21z" />
  </svg>
)

const TYPES = [
  { v: 'clinic', tag: 'Main', title: 'Clinic visit', desc: 'พบแพทย์ที่โรงพยาบาล/คลินิก', Icon: ClinicIcon },
  { v: 'online', tag: 'Add-on', title: 'Online', desc: 'คุยออนไลน์', Icon: OnlineIcon },
  { v: 'home', tag: 'Add-on', title: 'Home visit', desc: 'นัดติดตามผลที่บ้าน', Icon: HomeIcon },
]
const typeName = { clinic: 'Clinic visit', online: 'Online', home: 'Home visit' }
const statusName = { scheduled: 'นัดแล้ว', cancelled: 'ยกเลิก', completed: 'เสร็จสิ้น' }

const initial = (d) => (d.first_name || '?').trim().charAt(0).toUpperCase()

const fmtDay = (v) => {
  if (!v) return '-'
  const d = new Date(String(v).slice(0, 10) + 'T00:00:00')
  return isNaN(d)
    ? v
    : d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Booking() {
  const navigate = useNavigate()
  const hasToken = !!store.token()

  const [type, setType] = useState('clinic')
  const [doctors, setDoctors] = useState(null)
  const [doctor, setDoctor] = useState(null)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [slotsError, setSlotsError] = useState(false)
  const [onLeave, setOnLeave] = useState(false)
  const [slot, setSlot] = useState('')
  const [note, setNote] = useState('')
  const [my, setMy] = useState(null)
  const [msg, setMsg] = useState({ ok: true, text: '' })
  const [reload, setReload] = useState(0)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!hasToken) navigate('/login', { replace: true })
  }, [hasToken, navigate])

  // รายชื่อผู้ให้คำปรึกษา
  useEffect(() => {
    if (!hasToken) return
    svc('booking', '/api/doctors')
      .then((r) => setDoctors(r.data))
      .catch(() => setDoctors(false))
  }, [hasToken])

  // ช่วงเวลาว่าง
  useEffect(() => {
    setSlot('')
    setSlots([])
    setOnLeave(false)
    setSlotsError(false)
    if (!doctor || !date) return
    let cancelled = false
    svc('booking', `/api/availability?doctor_id=${doctor.id}&date=${date}`)
      .then((j) => {
        if (cancelled) return
        setOnLeave(!!j.onLeave)
        setSlots(j.data || [])
      })
      .catch(() => !cancelled && setSlotsError(true))
    return () => {
      cancelled = true
    }
  }, [doctor, date, reload])

  // นัดของฉัน
  useEffect(() => {
    if (!hasToken) return
    svc('booking', '/api/patient-bookings/my')
      .then((r) => setMy(r.data))
      .catch(() => setMy(false))
  }, [hasToken, reload])

  const cancelBooking = async (id) => {
    if (!confirm('ยืนยันการยกเลิกนัด?')) return
    try {
      await svc('booking', `/api/patient-bookings/${id}/cancel`, { method: 'PATCH' })
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    }
    setReload((n) => n + 1)
  }

  const submit = async () => {
    try {
      await svc('booking', '/api/patient-bookings', {
        method: 'POST',
        body: {
          doctor_id: doctor.id,
          appointment_type: type,
          appointment_date: date,
          slot,
          addon_note: note,
        },
      })
      setMsg({ ok: true, text: 'จองสำเร็จ' })
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    }
    setReload((n) => n + 1)
  }

  const doctorName = doctor ? `${doctor.first_name} ${doctor.last_name}` : ''
  const canSubmit = !!(doctor && date && slot)

  const morning = slots.filter((s) => s.slot < '12:00')
  const afternoon = slots.filter((s) => s.slot >= '12:00')

  const renderSlots = (list) =>
    list.map((s) => (
      <button
        key={s.slot}
        className={'slot' + (slot === s.slot ? ' active' : '')}
        disabled={!s.available}
        onClick={() => setSlot(s.slot)}
      >
        {s.slot}
      </button>
    ))

  return (
    <div className="bk">
      {/* hero */}
      <section className="bk-hero">
        <Heart className="h1" />
        <Heart className="h2" />
        <div className="bk-ring" />
        <div className="bk-hero-body">
          <span className="bk-chip">Appointment</span>
          <h1>จองนัดหมาย</h1>
          <p>เลือกประเภทนัด ผู้ให้คำปรึกษา และเวลาที่สะดวกได้ในไม่กี่ขั้นตอน</p>
        </div>
      </section>

      <div className="wrap">
        <div className="card main">
          {/* 1 */}
          <div className="sec">
            <h3><i>1</i> ประเภทนัด</h3>
            <div className="types">
              {TYPES.map(({ v, tag, title, desc, Icon }) => (
                <button
                  type="button"
                  key={v}
                  className={'type' + (type === v ? ' active' : '')}
                  onClick={() => setType(v)}
                >
                  <span className="type-check"><CheckIcon /></span>
                  <span className="type-ico"><Icon /></span>
                  <span className="tag">{tag}</span>
                  <b>{title}</b>
                  <small>{desc}</small>
                </button>
              ))}
            </div>
          </div>

          {/* 2 */}
          <div className="sec">
            <h3><i>2</i> ผู้ให้คำปรึกษา</h3>
            <div className="counselors">
              {doctors === null && <div className="hint">กำลังโหลด...</div>}
              {doctors === false && <div className="hint err">โหลดรายชื่อไม่สำเร็จ (กรุณา login ใหม่)</div>}
              {Array.isArray(doctors) && doctors.length === 0 && <div className="hint">ยังไม่มีผู้ให้คำปรึกษา</div>}
              {Array.isArray(doctors) &&
                doctors.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className={'cc' + (doctor?.id === c.id ? ' active' : '')}
                    onClick={() => setDoctor(c)}
                  >
                    <span className="cc-check"><CheckIcon /></span>
                    <span className="cc-av">{initial(c)}</span>
                    <span className="cc-name">{c.first_name} {c.last_name}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* 3 */}
          <div className="sec">
            <h3><i>3</i> วันและเวลา</h3>
            <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />

            {!doctor && <div className="hint">เลือกผู้ให้คำปรึกษาก่อน เพื่อดูเวลาว่าง</div>}
            {doctor && !date && <div className="hint">เลือกวันที่ เพื่อดูเวลาว่าง</div>}
            {onLeave && <div className="leaveMsg">ผู้ให้คำปรึกษาลาในวันนี้ กรุณาเลือกวันอื่น</div>}
            {slotsError && <div className="leaveMsg">โหลดช่วงเวลาไม่สำเร็จ</div>}

            {morning.length > 0 && (
              <div className="slot-group">
                <span className="slot-label">ช่วงเช้า</span>
                <div className="slots">{renderSlots(morning)}</div>
              </div>
            )}
            {afternoon.length > 0 && (
              <div className="slot-group">
                <span className="slot-label">ช่วงบ่าย</span>
                <div className="slots">{renderSlots(afternoon)}</div>
              </div>
            )}
          </div>

          {/* 4 */}
          <div className="sec">
            <h3><i>4</i> บันทึกเพิ่มเติม <em>(ไม่บังคับ)</em></h3>
            <textarea
              placeholder="อาการหรือเรื่องที่อยากปรึกษา..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <aside className="side">
          <div className="card sum">
            <h3>สรุปการจอง</h3>
            <dl>
              <div><dt>ประเภท</dt><dd>{typeName[type]}</dd></div>
              <div><dt>ผู้ให้คำปรึกษา</dt><dd>{doctorName || '-'}</dd></div>
              <div><dt>วันที่</dt><dd>{date ? fmtDay(date) : '-'}</dd></div>
              <div><dt>เวลา</dt><dd>{slot || '-'}</dd></div>
            </dl>
            <button className="btn" disabled={!canSubmit} onClick={submit}>
              ยืนยันการจอง
            </button>
            {msg.text && <div className={'msg ' + (msg.ok ? 'ok' : 'bad')}>{msg.text}</div>}
          </div>

          <div className="card my">
            <h3>นัดของฉัน</h3>
            {my === null && <div className="hint">กำลังโหลด...</div>}
            {my === false && <div className="hint err">โหลดไม่สำเร็จ</div>}
            {Array.isArray(my) && my.length === 0 && <div className="hint">ยังไม่มีนัด</div>}
            {Array.isArray(my) &&
              my.map((a) => (
                <div className="it" key={a.id}>
                  <div className="it-info">
                    <b>{fmtDay(a.appointment_date)} · {a.start_time}</b>
                    <span>{a.doctor_first_name} {a.doctor_last_name}</span>
                    <div className="it-tags">
                      <span className={'st ' + a.status}>{statusName[a.status] || a.status}</span>
                      <span className="st type">{typeName[a.appointment_type] || ''}</span>
                      {a.booked_by_nurse && <span className="st type">พยาบาลจองให้</span>}
                    </div>
                  </div>
                  {a.status === 'scheduled' && !a.booked_by_nurse && (
                    <button onClick={() => cancelBooking(a.id)}>ยกเลิก</button>
                  )}
                </div>
              ))}
          </div>
        </aside>
      </div>
    </div>
  )
}