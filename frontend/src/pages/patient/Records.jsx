import { useEffect, useState } from 'react'
import { svc } from '../../api'
import { fmtDate } from './utils'

const show = (v) => (v === null || v === undefined || v === '' ? null : v)

export default function Records() {
  const [list, setList] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    svc('record', '/api/records/my')
      .then((r) => setList(r.data))
      .catch((e) => setErr(e.message))
  }, [])

  return (
    <>
      <h1 className="pt-title">ประวัติการรักษาของฉัน</h1>
      {err && <div className="text-center mb-4 text-red-600">{err}</div>}

      <div className="max-w-3xl mx-auto space-y-4">
        {list === null && !err && <div className="text-center">กำลังโหลด...</div>}
        {list?.length === 0 && (
          <div className="bg-white rounded-2xl p-6 text-center">ยังไม่มีประวัติการรักษา</div>
        )}

        {list?.map((r) => {
          const hasMedicines = r.medicines?.length > 0
          const hasLegacyRx = !hasMedicines && r.prescription?.length > 0

          return (
            <div key={r.id} className="bg-white rounded-2xl overflow-hidden">
              <div className="h-2 bg-[#00C0E8]" />
              <div className="p-5">
                <div className="flex justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {r.diagnosis || r.chief_complaint || 'การเข้ารับการรักษา'}
                    </h3>
                    <div className="text-sm text-gray-600">📅 {fmtDate(r.visit_date)}</div>
                    <div className="text-sm text-gray-600">
                      🩺 แพทย์ {r.doctor_first_name} {r.doctor_last_name}
                    </div>
                  </div>
                  <button
                    onClick={() => setOpenId(openId === r.id ? null : r.id)}
                    className="border border-[#00C0E8] text-[#007a96] rounded-xl px-3 text-xs h-8"
                  >
                    {openId === r.id ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}
                  </button>
                </div>

                {openId === r.id && (
                  <div className="mt-3 border-t pt-3 text-sm space-y-2">
                    {r.chief_complaint && <div><b>อาการสำคัญ:</b> {r.chief_complaint}</div>}
                    {r.diagnosis && <div><b>การวินิจฉัย:</b> {r.diagnosis}</div>}
                    {r.treatment_note && <div><b>รายละเอียดการรักษา:</b> {r.treatment_note}</div>}

                    {hasMedicines && (
                      <div>
                        <b>ยาที่ได้รับ:</b>
                        <ul className="list-disc ml-6 space-y-1 mt-1">
                          {r.medicines.map((m, i) => {
                            const detail = [
                              show(m.dosage) && `ครั้งละ ${m.dosage}`,
                              show(m.frequency),
                              show(m.meal),
                              show(m.duration) && `ระยะเวลา ${m.duration}`,
                              show(m.quantity) && `จำนวน ${m.quantity}`,
                            ].filter(Boolean).join(' · ')
                            return (
                              <li key={i}>
                                <span className="font-medium">
                                  {m.name}{m.strength ? ` ${m.strength}` : ''}
                                </span>
                                {detail && <div className="text-gray-600">{detail}</div>}
                                {m.instructions && (
                                  <div className="text-gray-500">คำแนะนำ: {m.instructions}</div>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}

                    {hasLegacyRx && (
                      <div>
                        <b>ยาที่ได้รับ:</b>
                        <ul className="list-disc ml-6">
                          {r.prescription.map((p, i) => (
                            <li key={i}>
                              {p.name}
                              {p.dose && ` · ${p.dose}`}
                              {p.duration && ` · ${p.duration}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {r.doctor_note && <div><b>หมายเหตุจากแพทย์:</b> {r.doctor_note}</div>}

                    {r.follow_up_date && (
                      <div><b>วันนัดติดตามอาการ:</b> {fmtDate(r.follow_up_date)}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}