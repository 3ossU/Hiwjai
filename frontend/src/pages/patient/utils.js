export const fmtDateTime = (v) => {
  if (!v) return '-'
  const d = new Date(String(v).replace(' ', 'T'))
  return isNaN(d)
    ? String(v)
    : d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
}

export const fmtDate = (v) => {
  if (!v) return '-'
  const d = new Date(String(v).slice(0, 10) + 'T00:00:00')
  return isNaN(d) ? String(v) : d.toLocaleDateString('th-TH', { dateStyle: 'medium' })
}

// วันที่ตามเวลาเครื่อง YYYY-MM-DD (toISOString เป็น UTC จะเพี้ยนช่วงเช้ามืดของไทย)
export const localToday = () => {
  const n = new Date()
  const p = (x) => String(x).padStart(2, '0')
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`
}

// อายุจากวันเกิด
export const calcAge = (birth) => {
  const m = String(birth || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const [, y, mo, d] = m.map(Number)
  const t = new Date()
  let age = t.getFullYear() - y
  if (t.getMonth() + 1 < mo || (t.getMonth() + 1 === mo && t.getDate() < d)) age--
  return age >= 0 ? age : null
}

// คำนำหน้าแพทย์ตามเพศ (เหมือนฝั่ง nurse)
export const doctorName = (first, last, gender) => {
  const title = gender === 'male' ? 'นพ.' : gender === 'female' ? 'พญ.' : ''
  return `${title ? title + ' ' : ''}${first || ''} ${last || ''}`.trim()
}

export const avatarFallback = (seed) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed || 'hiwjai')}`
