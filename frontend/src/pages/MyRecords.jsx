import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { svc } from '../api'

const BG = { background: 'linear-gradient(180deg, #e0f7fc 0%, #ffffff 100%)' }

const fmtDateTime = (v) => {
  if (!v) return '-'
  const d = new Date(String(v).replace(' ', 'T'))
  return isNaN(d) ? String(v) : d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function MyRecords() {
  const [list, setList] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    svc('record', '/api/records/my')
      .then(r => setList(r.data))
      .catch(e => setErr(e.message))
  }, [])

  return (
    <div className="min-h-screen p-6" style={BG}>
      <div className="max-w-3xl mx-auto">
        <Link to="/home" className="text-sm text-sky-700">← กลับหน้าหลัก</Link>
      </div>
      <h1 className="text-center text-3xl my-8">ประวัติการรักษาของฉัน</h1>
      {err && <div className="text-center mb-4 text-red-600">{err}</div>}

      <div className="max-w-3xl mx-auto space-y-4">
        {list === null && !err && <div className="text-center">กำลังโหลด...</div>}
        {list?.length === 0 && (
          <div className="bg-white rounded-2xl p-6 text-center">ยังไม่มีประวัติการรักษา</div>
        )}

        {list?.map(r => (
          <div key={r.id} className="bg-white rounded-2xl overflow-hidden">
            <div className="h-2 bg-[#00C0E8]" />
            <div className="p-5">
              <div className="flex justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-semibold text-lg">
                    {r.diagnosis || r.chief_complaint || 'การเข้ารับการรักษา'}
                  </h3>
                  <div className="text-sm text-gray-600">🕒 {fmtDateTime(r.visit_date)}</div>
                  <div className="text-sm text-gray-600">
                    🩺 แพทย์ {r.doctor_first_name} {r.doctor_last_name}
                  </div>
                </div>
                <button
                  onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  className="border border-[#00C0E8] text-[#007a96] rounded-xl px-3 text-xs h-8">
                  {openId === r.id ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}
                </button>
              </div>

              {openId === r.id && (
                <div className="mt-3 border-t pt-3 text-sm space-y-2">
                  {r.chief_complaint && <div><b>อาการ:</b> {r.chief_complaint}</div>}
                  {r.diagnosis && <div><b>การวินิจฉัย:</b> {r.diagnosis}</div>}
                  {r.treatment_note && <div><b>บันทึกการรักษา:</b> {r.treatment_note}</div>}

                  {r.prescription?.length > 0 && (
                    <div>
                      <b>ยาที่สั่ง:</b>
                      <ul className="list-disc ml-6">
                        {r.prescription.map((p, i) => (
                          <li key={i}>
                            {p.name}{p.dose && ` · ${p.dose}`}{p.duration && ` · ${p.duration}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {r.follow_up_date && <div><b>นัดติดตามอาการ:</b> {r.follow_up_date}</div>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}