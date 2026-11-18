import { useEffect, useState } from 'react'
import { svc } from '../../api'
import { fmtDateTime } from './utils'
import './Activities.css'

export default function Activities() {
  const [list, setList] = useState(null)
  const [tab, setTab] = useState('all') // all | mine
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    svc('activity', '/api/activities')
      .then((r) => {
        setList(r.data)
        setErr('')
      })
      .catch((e) => setErr(e.message))
  }, [reload])

  const toggle = async (a) => {
    setBusyId(a.id)
    setErr('')
    try {
      await svc('activity', `/api/activities/${a.id}/register`, {
        method: a.is_registered ? 'DELETE' : 'POST',
      })
    } catch (e) {
      setErr(e.message)
    }
    setBusyId(null)
    setReload((n) => n + 1)
  }

  const shown = list?.filter((a) => (tab === 'mine' ? a.is_registered : true))

  return (
    <>
      <h1 className="pt-title">กิจกรรมโรงพยาบาล</h1>

      <div className="ac-tabs">
        <button className={'pt-chip' + (tab === 'all' ? ' active' : '')} onClick={() => setTab('all')}>
          กิจกรรมทั้งหมด
        </button>
        <button className={'pt-chip' + (tab === 'mine' ? ' active' : '')} onClick={() => setTab('mine')}>
          ที่ฉันลงทะเบียน
        </button>
      </div>

      {err && <div className="pt-msg err ac-center">{err}</div>}

      <div className="ac-grid">
        {list === null && !err && <div className="pt-empty">กำลังโหลด...</div>}
        {shown?.length === 0 && (
          <div className="pt-card pt-empty ac-wide">
            {tab === 'mine' ? 'ยังไม่ได้ลงทะเบียนกิจกรรมใด' : 'ยังไม่มีกิจกรรมที่กำลังจะมาถึง'}
          </div>
        )}

        {shown?.map((a) => {
          const full = a.registered_count >= a.capacity
          return (
            <div key={a.id} className="pt-card ac-item">
              <div className="ac-bar" />
              <h3>{a.title}</h3>
              <div className="ac-meta">🕒 {fmtDateTime(a.start_at)}</div>
              {a.location && <div className="ac-meta">📍 {a.location}</div>}
              {a.description && <p className="ac-desc">{a.description}</p>}

              <div className="ac-foot">
                <span className={'pt-badge' + (full ? ' warn' : '')}>
                  {a.registered_count}/{a.capacity} คน{full ? ' · เต็ม' : ''}
                </span>
                <button
                  className={'pt-btn ' + (a.is_registered ? 'danger' : '')}
                  disabled={busyId === a.id || (!a.is_registered && full)}
                  onClick={() => toggle(a)}
                >
                  {a.is_registered ? 'ยกเลิกการเข้าร่วม' : 'เข้าร่วมกิจกรรม'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}