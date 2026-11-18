import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { store, svc } from '../../api'
import './Booking.css'

const TYPES = [
  { v: 'clinic', tag: 'Main', title: 'Clinic visit', desc: 'พบแพทย์ที่โรงพยาบาล/คลินิก' },
  { v: 'online', tag: 'Add-on', title: 'Online', desc: 'คุยออนไลน์' },
  { v: 'home', tag: 'Add-on', title: 'HOME VISIT', desc: 'นัดติดตามผลที่บ้าน' },
]
const typeName = { clinic: 'Clinic visit', online: 'Online', home: 'HOME VISIT' }
const statusName = { scheduled: 'นัดแล้ว', cancelled: 'ยกเลิก', completed: 'เสร็จสิ้น' }

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
      setMsg({ ok: true, text: 'จองสำเร็จ ✔' })
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    }
    setReload((n) => n + 1)
  }

  const doctorName = doctor ? `${doctor.first_name} ${doctor.last_name}` : ''
  const canSubmit = !!(doctor && date && slot)

  return (
    <div className="bk">
      <h1>BOOK AN APPOINTMENT</h1>

      <div className="wrap">
        <div className="card">
          <h3>Appointment type</h3>
          <div className="types">
            {TYPES.map((t) => (
              <div
                key={t.v}
                className={'type' + (type === t.v ? ' active' : '')}
                onClick={() => setType(t.v)}
              >
                <span className="tag">{t.tag}</span>
                <b>{t.title}</b>
                <small>{t.desc}</small>
              </div>
            ))}
          </div>

          <h3>Counselor</h3>
          <div className="counselors">
            {doctors === null && 'กำลังโหลด...'}
            {doctors === false && 'โหลดรายชื่อไม่สำเร็จ (กรุณา login ใหม่)'}
            {Array.isArray(doctors) && doctors.length === 0 && 'ยังไม่มีผู้ให้คำปรึกษา'}
            {Array.isArray(doctors) &&
              doctors.map((c) => (
                <div
                  key={c.id}
                  className={'cc' + (doctor?.id === c.id ? ' active' : '')}
                  onClick={() => setDoctor(c)}
                >
                  <div className="ph" />
                  <div>{c.first_name} {c.last_name}</div>
                </div>
              ))}
          </div>

          <h3>Date &amp; Time ({type})</h3>
          <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
          {onLeave && <div className="leaveMsg">ผู้ให้คำปรึกษาลาในวันนี้ กรุณาเลือกวันอื่น</div>}
          <div className="slots">
            {slotsError && 'โหลดช่วงเวลาไม่สำเร็จ'}
            {slots.map((s) => (
              <button
                key={s.slot}
                className={'slot' + (slot === s.slot ? ' active' : '')}
                disabled={!s.available}
                onClick={() => setSlot(s.slot)}
              >
                {s.slot}
              </button>
            ))}
          </div>

          <h3>Add after your clinic visit (optional)</h3>
          <textarea
            placeholder="บันทึกเพิ่มเติม..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div>
          <div className="card sum">
            <h3>Summary</h3>
            <p>ประเภท: <b>{typeName[type]}</b></p>
            <p>ผู้ให้คำปรึกษา: <b>{doctorName || '-'}</b></p>
            <p>วัน: <b>{date || '-'}</b></p>
            <p>เวลา: <b>{slot || '-'}</b></p>
            <button className="btn" disabled={!canSubmit} onClick={submit}>
              ยืนยันการจอง
            </button>
            <div className="msg" style={{ color: msg.ok ? 'green' : 'crimson' }}>{msg.text}</div>
          </div>

          <div className="card my">
            <h3>นัดของฉัน</h3>
            <div>
              {my === null && 'กำลังโหลด...'}
              {my === false && 'โหลดไม่สำเร็จ'}
              {Array.isArray(my) && my.length === 0 && 'ยังไม่มีนัด'}
              {Array.isArray(my) &&
                my.map((a) => (
                  <div className="it" key={a.id}>
                    <span>
                      {a.appointment_date} {a.start_time} · {a.doctor_first_name} {a.doctor_last_name}
                      <br />
                      <small>
                        {typeName[a.appointment_type] || ''} · {statusName[a.status] || a.status}
                        {a.booked_by_nurse ? ' · พยาบาลจองให้' : ''}
                      </small>
                    </span>
                    {a.status === 'scheduled' && !a.booked_by_nurse && (
                      <button onClick={() => cancelBooking(a.id)}>ยกเลิก</button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}