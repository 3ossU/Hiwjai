import { useEffect, useState } from 'react'
import { svc } from '../../api'
import { fmtDate, doctorName } from './utils'

const VISIT_STATUS = {
  planned: { label: 'วางแผนไว้', cls: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'กำลังดำเนินการ', cls: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'เสร็จสิ้น', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิก', cls: 'bg-red-100 text-red-700' },
}

const PATIENT_STATUS = {
  scheduled: { label: 'รอเยี่ยม', cls: 'bg-[#e3f7fb] text-[#007a96]' },
  visited: { label: 'เยี่ยมแล้ว', cls: 'bg-green-100 text-green-700' },
  missed: { label: 'ไม่พบผู้ป่วย', cls: 'bg-orange-100 text-orange-700' },
  cancelled: { label: 'ยกเลิก', cls: 'bg-red-100 text-red-700' },
}

const TABS = [
  { key: 'upcoming', label: 'กำลังจะมาถึง' },
  { key: 'history', label: 'ประวัติ' },
  { key: 'all', label: 'ทั้งหมด' },
]

// รอบที่ยังรออยู่: รอบไม่ได้ยกเลิก/เสร็จ และผู้ป่วยยังเป็น "รอเยี่ยม"
const isUpcoming = (v) =>
  (v.visit_status === 'planned' || v.visit_status === 'in_progress') &&
  v.patient_status === 'scheduled'

export default function HomeVisit() {
  const [list, setList] = useState(null)
  const [tab, setTab] = useState('upcoming')
  const [err, setErr] = useState('')

  useEffect(() => {
    svc('booking', '/api/patient-home-visits/my')
      .then((r) => {
        setList(r.data)
        setErr('')
      })
      .catch((e) => setErr(e.message))
  }, [])

  const upcoming = list?.filter(isUpcoming) || []
  const history = list?.filter((v) => !isUpcoming(v)) || []

  // รอบที่จะมาถึงเรียงจากใกล้สุดก่อน ประวัติเรียงจากล่าสุดก่อน
  const shown =
    tab === 'upcoming'
      ? [...upcoming].reverse()
      : tab === 'history'
      ? history
      : list || []

  const count = (k) => (k === 'upcoming' ? upcoming.length : k === 'history' ? history.length : list?.length || 0)

  return (
    <>
      <h1 className="pt-title">เยี่ยมบ้าน</h1>

      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'pt-chip' + (tab === t.key ? ' active' : '')}
            onClick={() => setTab(t.key)}
          >
            {t.label} ({count(t.key)})
          </button>
        ))}
      </div>

      {err && <div className="pt-msg err text-center">{err}</div>}

      <div className="max-w-3xl mx-auto space-y-4">
        {list === null && !err && <div className="pt-empty">กำลังโหลด...</div>}

        {list && shown.length === 0 && (
          <div className="pt-card pt-empty">
            {tab === 'upcoming'
              ? 'ยังไม่มีรอบเยี่ยมบ้านที่กำลังจะมาถึง'
              : tab === 'history'
              ? 'ยังไม่มีประวัติการเยี่ยมบ้าน'
              : 'ยังไม่มีรายการเยี่ยมบ้านที่กำหนดไว้'}
          </div>
        )}

        {shown.map((v) => {
          const vs = VISIT_STATUS[v.visit_status] || { label: v.visit_status, cls: 'bg-gray-100 text-gray-700' }
          const ps = PATIENT_STATUS[v.patient_status] || { label: v.patient_status, cls: 'bg-gray-100 text-gray-700' }
          const cancelled = v.visit_status === 'cancelled' || v.patient_status === 'cancelled'

          return (
            <div key={v.id} className={'bg-white rounded-2xl overflow-hidden ' + (cancelled ? 'opacity-70' : '')}>
              <div className={'h-2 ' + (cancelled ? 'bg-gray-300' : 'bg-[#00C0E8]')} />
              <div className="p-5">
                <div className="flex justify-between gap-3 flex-wrap items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{v.team_name}</h3>
                    <div className="text-sm text-gray-600 mt-1">📅 {fmtDate(v.visit_date)}</div>
                    <div className="text-sm text-gray-600">🕒 {v.start_time} - {v.end_time} น.</div>
                    <div className="text-sm text-gray-600">
                      🩺 หัวหน้าทีม {doctorName(v.doctor_first_name, v.doctor_last_name, v.doctor_gender) || '-'}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={'px-3 py-1 rounded-full text-xs font-bold ' + ps.cls}>
                      สถานะของคุณ: {ps.label}
                    </span>
                    <span className={'px-3 py-1 rounded-full text-xs font-bold ' + vs.cls}>
                      รอบเยี่ยม: {vs.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}